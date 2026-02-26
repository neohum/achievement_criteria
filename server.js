require("dotenv").config();

const http = require("http");
const next = require("next");
const { setupWebSocketServer } = require("./ws-server");
const { setupYWebSocketServer } = require("./y-ws-server");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = setupWebSocketServer();
  const yWss = setupYWebSocketServer();

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else if (url.pathname.startsWith("/y-ws")) {
      yWss.handleUpgrade(req, socket, head, (ws) => {
        yWss.emit("connection", ws, req);
      });
    } else {
      // Let Next.js handle HMR and other upgrade requests
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server on ws://${hostname}:${port}/ws`);
    console.log(`> Yjs WebSocket server on ws://${hostname}:${port}/y-ws`);
  });
});
