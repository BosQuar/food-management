import { shoppingStore } from "./shopping.svelte";
import { productsStore } from "./products.svelte";
import { browser } from "$app/environment";

type SyncStatus = "disconnected" | "connecting" | "connected";

function getWebSocketUrl(): string {
  if (!browser) return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

let status = $state<SyncStatus>("disconnected");
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

export function getSyncStore() {
  return {
    get status() {
      return status;
    },
    get isConnected() {
      return status === "connected";
    },

    connect() {
      if (ws?.readyState === WebSocket.OPEN) return;
      if (status === "connecting") return;

      status = "connecting";

      try {
        ws = new WebSocket(getWebSocketUrl());

        ws.onopen = () => {
          status = "connected";
          reconnectAttempts = 0;
          console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.error("Failed to parse WebSocket message:", e);
          }
        };

        ws.onclose = () => {
          status = "disconnected";
          ws = null;
          this.scheduleReconnect();
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (e) {
        console.error("Failed to create WebSocket:", e);
        status = "disconnected";
        this.scheduleReconnect();
      }
    },

    disconnect() {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
      status = "disconnected";
      reconnectAttempts = 0;
    },

    scheduleReconnect() {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log("Max reconnect attempts reached");
        return;
      }

      const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
      reconnectAttempts++;

      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    },

    handleMessage(message: {
      type: string;
      data?: unknown;
      timestamp?: string;
    }) {
      console.log("WebSocket message:", message.type);

      switch (message.type) {
        case "connected":
          // Initial connection confirmed
          break;

        case "pong":
          // Keepalive response
          break;

        case "shopping_change":
          // Refresh shopping list on any change
          shoppingStore.fetch();
          break;

        case "products_change":
          // Refresh products on any change
          productsStore.fetch();
          break;

        case "recipes_change":
          // Could add recipes refresh if needed
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    },

    sendPing() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    },
  };
}

export const syncStore = getSyncStore();
