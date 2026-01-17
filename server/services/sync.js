import { WebSocketServer } from "ws";

let wss = null;
const clients = new Set();

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${clients.size}`);

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      }),
    );

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        console.log("Received:", data);

        // Handle ping/pong for keepalive
        if (data.type === "ping") {
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            }),
          );
        }
      } catch (err) {
        console.error("Invalid message:", err.message);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(
        `WebSocket client disconnected. Total clients: ${clients.size}`,
      );
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

// Broadcast to all connected clients
export function broadcast(type, data) {
  if (!wss) return;

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Broadcast changes for shopping items
export function broadcastShoppingChange(action, item) {
  broadcast("shopping_change", { action, item });
}

// Broadcast changes for products
export function broadcastProductChange(action, product) {
  broadcast("products_change", { action, product });
}

// Broadcast changes for recipes
export function broadcastRecipeChange(action, recipe) {
  broadcast("recipes_change", { action, recipe });
}

export function getClientCount() {
  return clients.size;
}
