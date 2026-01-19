import express, { Request, Response } from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getDb, closeDb } from "./db/connection.js";
import { seed } from "./db/seed.js";
import { setupWebSocket, closeWebSocket } from "./services/sync.js";
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import shoppingRouter from "./routes/shopping.js";
import recipesRouter from "./routes/recipes.js";
import tagsRouter from "./routes/tags.js";
import backupRouter from "./routes/backup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8500;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and seed
getDb();
seed();

// API Routes
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/backup", backupRouter);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const buildPath = join(__dirname, "../build");
  app.use(express.static(buildPath));

  // SPA fallback - Express 5 uses {*path} syntax for wildcards
  app.get("{*path}", (req: Request, res: Response) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(join(buildPath, "index.html"));
    }
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Setup WebSocket
setupWebSocket(server);

// Graceful shutdown
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received, shutting down...`);

  // Force exit after 5 seconds
  const forceExitTimeout = setTimeout(() => {
    console.log("Forcing exit...");
    process.exit(1);
  }, 5000);

  try {
    // Close WebSocket connections first
    await closeWebSocket();

    // Then close HTTP server
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log("HTTP server closed");

    // Close database
    closeDb();
    console.log("Database closed");

    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

export default app;
