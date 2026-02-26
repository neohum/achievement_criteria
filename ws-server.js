const { WebSocketServer } = require("ws");
const Redis = require("ioredis");

const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];

// boardId → Map<connId, { ws, color, sessionId }>
const boards = new Map();

// Track boards with dirty (unsaved to Postgres) data
const dirtyBoards = new Set();

// Redis client for data read/write
const redis = new Redis(process.env.REDIS_URL);
redis.on("error", (err) => console.error("Redis error:", err.message));

function getBoard(boardId) {
  if (!boards.has(boardId)) {
    boards.set(boardId, new Map());
  }
  return boards.get(boardId);
}

function assignColor(boardMap) {
  const usedColors = new Set();
  for (const client of boardMap.values()) {
    usedColors.add(client.color);
  }
  for (const color of CURSOR_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return CURSOR_COLORS[boardMap.size % CURSOR_COLORS.length];
}

function broadcastToBoard(boardId, message, excludeConnId) {
  const boardMap = boards.get(boardId);
  if (!boardMap) return;
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  for (const [connId, client] of boardMap) {
    if (connId !== excludeConnId && client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  }
}

function getPresenceList(boardId) {
  const boardMap = boards.get(boardId);
  if (!boardMap) return [];
  const seen = new Map();
  for (const [, c] of boardMap) {
    if (!seen.has(c.sessionId)) {
      seen.set(c.sessionId, { sessionId: c.sessionId, color: c.color });
    }
  }
  return Array.from(seen.values());
}

// ── Periodic flush: Redis → PostgreSQL ──
async function flushToPostgres() {
  if (dirtyBoards.size === 0) return;

  const boardIds = Array.from(dirtyBoards);
  dirtyBoards.clear();

  // Lazy-require prisma to avoid bundling issues
  let prisma;
  try {
    prisma = require("./src/lib/prisma").default || require("./src/lib/prisma");
  } catch {
    // Fallback: use direct pg call via prisma client
    try {
      const { PrismaClient } = require("@prisma/client");
      prisma = new PrismaClient();
    } catch (err) {
      console.error("Cannot load Prisma client for flush:", err.message);
      // Re-mark as dirty so we retry next cycle
      boardIds.forEach((id) => dirtyBoards.add(id));
      return;
    }
  }

  for (const boardId of boardIds) {
    try {
      const cached = await redis.get(`board:${boardId}`);
      if (!cached) continue;

      const data = JSON.parse(cached);
      await prisma.board.update({
        where: { id: boardId },
        data: { data: data },
      });
    } catch (err) {
      console.error(`Flush board ${boardId} to Postgres failed:`, err.message);
      // Re-mark so we retry next cycle
      dirtyBoards.add(boardId);
    }
  }
}

function setupWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  // Flush dirty boards to Postgres every 10 seconds
  setInterval(flushToPostgres, 10_000);

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const boardId = url.searchParams.get("boardId");
    const sessionId = url.searchParams.get("sessionId");
    const connId = url.searchParams.get("connId") || `${sessionId}-${Date.now()}`;

    if (!boardId || !sessionId) {
      ws.close(4000, "Missing boardId or sessionId");
      return;
    }

    const boardMap = getBoard(boardId);
    const color = assignColor(boardMap);
    boardMap.set(connId, { ws, color, sessionId });

    ws.send(JSON.stringify({
      type: "init",
      sessionId,
      connId,
      color,
      users: getPresenceList(boardId),
    }));

    broadcastToBoard(boardId, {
      type: "presence",
      users: getPresenceList(boardId),
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        msg.sessionId = sessionId;
        msg.color = color;

        if (msg.type === "cursor" || msg.type === "drag-start" || msg.type === "drag-end" || msg.type === "connect-start" || msg.type === "connect-end") {
          broadcastToBoard(boardId, msg, connId);
        } else if (msg.type === "board-update") {
          // 1. Broadcast to other clients immediately
          broadcastToBoard(boardId, {
            type: "update",
            sessionId,
            cards: msg.cards,
            edges: msg.edges,
          }, connId);

          // 2. Save to Redis immediately (non-blocking)
          const redisData = JSON.stringify({ cards: msg.cards, edges: msg.edges });
          redis.set(`board:${boardId}`, redisData).catch((err) => {
            console.error("Redis save error:", err.message);
          });

          // 3. Mark board as dirty for periodic Postgres flush
          dirtyBoards.add(boardId);
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    });

    ws.on("close", () => {
      boardMap.delete(connId);

      broadcastToBoard(boardId, {
        type: "cursor-leave",
        sessionId,
      });

      broadcastToBoard(boardId, {
        type: "presence",
        users: getPresenceList(boardId),
      });

      // If last user leaves, flush immediately
      if (boardMap.size === 0) {
        boards.delete(boardId);
        if (dirtyBoards.has(boardId)) {
          flushToPostgres();
        }
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocketServer };
