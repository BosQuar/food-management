import { WebSocketServer } from "ws";
import { getUserFromToken } from "../middleware/auth.js";

let wss = null;
// Map of userId -> Set of WebSocket clients
const userClients = new Map();

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Extract token from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    const user = getUserFromToken(token);
    if (!user) {
      console.log("WebSocket connection rejected: invalid token");
      ws.close(4001, "Unauthorized");
      return;
    }

    // Store userId on the WebSocket instance
    ws.userId = user.id;

    // Add to user's client set
    if (!userClients.has(user.id)) {
      userClients.set(user.id, new Set());
    }
    userClients.get(user.id).add(ws);

    console.log(
      `WebSocket client connected for user ${user.username}. User clients: ${userClients.get(user.id).size}`,
    );

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
      // Remove from user's client set
      const clients = userClients.get(user.id);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          userClients.delete(user.id);
        }
      }
      console.log(
        `WebSocket client disconnected for user ${user.username}. User clients: ${clients?.size || 0}`,
      );
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
      const clients = userClients.get(user.id);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          userClients.delete(user.id);
        }
      }
    });
  });

  return wss;
}

// Broadcast to all connected clients for a specific user
export function broadcastToUser(userId, type, data) {
  if (!wss) return;

  const clients = userClients.get(userId);
  if (!clients) return;

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

// Broadcast changes for shopping items (to specific user)
export function broadcastShoppingChange(action, item, userId) {
  broadcastToUser(userId, "shopping_change", { action, item });
}

// Broadcast changes for products (to specific user)
export function broadcastProductChange(action, product, userId) {
  broadcastToUser(userId, "products_change", { action, product });
}

// Broadcast changes for recipes (to specific user)
export function broadcastRecipeChange(action, recipe, userId) {
  broadcastToUser(userId, "recipes_change", { action, recipe });
}

export function getClientCount() {
  let total = 0;
  for (const clients of userClients.values()) {
    total += clients.size;
  }
  return total;
}
