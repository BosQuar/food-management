import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getDb, closeDb } from "./db/connection.js";
import { seed } from "./db/seed.js";
import { setupWebSocket } from "./services/sync.js";
import productsRouter from "./routes/products.js";
import shoppingRouter from "./routes/shopping.js";
import recipesRouter from "./routes/recipes.js";
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
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/products", productsRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/backup", backupRouter);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const buildPath = join(__dirname, "../build");
  app.use(express.static(buildPath));

  // SPA fallback - Express 5 uses {*path} syntax for wildcards
  app.get("{*path}", (req, res) => {
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
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

export default app;
