const { WebSocketServer } = require("ws");
const Redis = require("ioredis");

const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e",
];

// boardId → Map<sessionId, { ws, color }>
const boards = new Map();

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

function broadcastToBoard(boardId, message, excludeSessionId) {
  const boardMap = boards.get(boardId);
  if (!boardMap) return;
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  for (const [sid, client] of boardMap) {
    if (sid !== excludeSessionId && client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  }
}

function getPresenceList(boardId) {
  const boardMap = boards.get(boardId);
  if (!boardMap) return [];
  return Array.from(boardMap.entries()).map(([sid, c]) => ({
    sessionId: sid,
    color: c.color,
  }));
}

function setupWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });

  // Dedicated subscriber connection — lazyConnect prevents the auto INFO command
  const subscriber = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
  });

  subscriber.on("error", (err) => {
    console.error("Redis subscriber error:", err.message);
  });

  // Manually connect after setting up subscriber mode
  subscriber.connect().catch((err) => {
    console.error("Redis subscriber connect error:", err.message);
  });

  const subscribedChannels = new Set();

  subscriber.on("message", (channel, message) => {
    const match = channel.match(/^board-events:(.+)$/);
    if (!match) return;
    const boardId = match[1];

    try {
      const data = JSON.parse(message);
      if (data.type === "update") {
        broadcastToBoard(boardId, {
          type: "update",
          sessionId: data.sessionId,
          cards: data.cards,
          edges: data.edges,
        }, data.sessionId);
      }
    } catch (err) {
      console.error("Redis message parse error:", err);
    }
  });

  function ensureSubscribed(boardId) {
    const channel = `board-events:${boardId}`;
    if (!subscribedChannels.has(channel)) {
      subscriber.subscribe(channel);
      subscribedChannels.add(channel);
    }
  }

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const boardId = url.searchParams.get("boardId");
    const sessionId = url.searchParams.get("sessionId");

    if (!boardId || !sessionId) {
      ws.close(4000, "Missing boardId or sessionId");
      return;
    }

    const boardMap = getBoard(boardId);
    const color = assignColor(boardMap);
    boardMap.set(sessionId, { ws, color });

    ensureSubscribed(boardId);

    ws.send(JSON.stringify({
      type: "init",
      sessionId,
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

        if (msg.type === "cursor" || msg.type === "drag-start" || msg.type === "drag-end") {
          broadcastToBoard(boardId, msg, sessionId);
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    });

    ws.on("close", () => {
      boardMap.delete(sessionId);

      broadcastToBoard(boardId, {
        type: "cursor-leave",
        sessionId,
      });

      broadcastToBoard(boardId, {
        type: "presence",
        users: getPresenceList(boardId),
      });

      if (boardMap.size === 0) {
        boards.delete(boardId);
      }
    });
  });

  return wss;
}

module.exports = { setupWebSocketServer };
