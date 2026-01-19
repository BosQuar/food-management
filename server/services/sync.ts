import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { getUserFromToken } from "../middleware/auth.js";
import type {
  ProductRow,
  ShoppingItemWithDetails,
  RecipeRow,
} from "../../shared/types.js";

let wss: WebSocketServer | null = null;
// Map of userId -> Set of WebSocket clients
const userClients = new Map<number, Set<WebSocket>>();

interface WsMessage {
  type: string;
  data?: unknown;
  timestamp?: string;
}

export function setupWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    // Extract token from query string
    const url = new URL(req.url || "", `http://${req.headers.host}`);
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
    userClients.get(user.id)!.add(ws);

    console.log(
      `WebSocket client connected for user ${user.username}. User clients: ${userClients.get(user.id)!.size}`,
    );

    // Send initial connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      }),
    );

    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as WsMessage;
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
        console.error("Invalid message:", (err as Error).message);
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

    ws.on("error", (err: Error) => {
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
export function broadcastToUser(
  userId: number,
  type: string,
  data: unknown,
): void {
  if (!wss) return;

  const clients = userClients.get(userId);
  if (!clients) return;

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Broadcast changes for shopping items (to specific user)
export function broadcastShoppingChange(
  action: string,
  item: ShoppingItemWithDetails | { id: number } | { itemsDeleted: number },
  userId: number,
): void {
  broadcastToUser(userId, "shopping_change", { action, item });
}

// Broadcast changes for products (to specific user)
export function broadcastProductChange(
  action: string,
  product: ProductRow | { id: number },
  userId: number,
): void {
  broadcastToUser(userId, "products_change", { action, product });
}

// Broadcast changes for recipes (to specific user)
export function broadcastRecipeChange(
  action: string,
  recipe: RecipeRow | { id: number },
  userId: number,
): void {
  broadcastToUser(userId, "recipes_change", { action, recipe });
}

export function getClientCount(): number {
  let total = 0;
  for (const clients of userClients.values()) {
    total += clients.size;
  }
  return total;
}

// Close all WebSocket connections and the server
export function closeWebSocket(): Promise<void> {
  if (!wss) return Promise.resolve();

  return new Promise((resolve) => {
    // Close all client connections
    for (const clients of userClients.values()) {
      for (const client of clients) {
        client.close(1001, "Server shutting down");
      }
    }
    userClients.clear();

    // Close the WebSocket server
    wss!.close(() => {
      console.log("WebSocket server closed");
      resolve();
    });
  });
}
