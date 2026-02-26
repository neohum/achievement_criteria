const { WebSocketServer } = require("ws");
const Y = require("yjs");
const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const encoding = require("lib0/dist/encoding.cjs");
const decoding = require("lib0/dist/decoding.cjs");

const messageSync = 0;
const messageAwareness = 1;

// roomName → { doc: Y.Doc, awareness: Awareness, conns: Map<ws, Set<clientID>> }
const rooms = new Map();

function getRoom(roomName) {
  if (rooms.has(roomName)) return rooms.get(roomName);

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  awareness.on("update", (/** @type {{ added: number[], updated: number[], removed: number[] }} */ changes) => {
    const room = rooms.get(roomName);
    if (!room) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [
        ...changes.added,
        ...changes.updated,
        ...changes.removed,
      ])
    );
    const msg = encoding.toUint8Array(encoder);

    for (const [conn] of room.conns) {
      if (conn.readyState === 1) {
        conn.send(msg);
      }
    }
  });

  const room = { doc, awareness, conns: new Map() };
  rooms.set(roomName, room);
  return room;
}

function handleConnection(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // y-websocket client puts room name in the URL path: /y-ws/<roomName>
  const pathParts = url.pathname.replace(/^\/y-ws\/?/, "").split("/");
  const roomName = decodeURIComponent(pathParts[0] || "");
  if (!roomName) {
    ws.close(4000, "Missing room name");
    return;
  }

  const room = getRoom(roomName);
  // Track this connection and its awareness clientIDs
  const clientIds = new Set();
  room.conns.set(ws, clientIds);

  // Send initial sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  // Send current awareness states
  {
    const awarenessStates = Array.from(room.awareness.getStates().keys());
    if (awarenessStates.length > 0) {
      const states = awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        awarenessStates
      );
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, states);
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  // Listen for doc updates and broadcast to all other conns in the room
  const onDocUpdate = (update, origin) => {
    if (origin === ws) return; // don't echo back to sender
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const msg = encoding.toUint8Array(encoder);
    for (const [conn] of room.conns) {
      if (conn !== ws && conn.readyState === 1) {
        conn.send(msg);
      }
    }
  };
  room.doc.on("update", onDocUpdate);

  // Track awareness clientIDs from the awareness 'change' event
  // When applyAwarenessUpdate is called with `ws` as origin, added/updated IDs belong to this conn
  const onAwarenessChange = (changes, origin) => {
    if (origin === ws) {
      for (const id of changes.added) clientIds.add(id);
      for (const id of changes.updated) clientIds.add(id);
    }
  };
  room.awareness.on("change", onAwarenessChange);

  ws.on("message", (data) => {
    try {
      const buf = new Uint8Array(data);
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
          const reply = encoding.toUint8Array(encoder);
          // Only send if there's content beyond the message type marker
          if (encoding.length(encoder) > 1) {
            ws.send(reply);
          }
          break;
        }
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(
            room.awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
          break;
        }
      }
    } catch (err) {
      console.error("y-ws message error:", err);
    }
  });

  ws.on("close", () => {
    room.doc.off("update", onDocUpdate);
    room.awareness.off("change", onAwarenessChange);

    // Remove awareness states for all clientIDs tracked by this connection
    const idsToRemove = Array.from(clientIds);
    room.conns.delete(ws);

    if (idsToRemove.length > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        idsToRemove,
        null
      );
    }

    // Clean up empty rooms
    if (room.conns.size === 0) {
      room.awareness.destroy();
      room.doc.destroy();
      rooms.delete(roomName);
    }
  });
}

function setupYWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", handleConnection);
  return wss;
}

module.exports = { setupYWebSocketServer };
