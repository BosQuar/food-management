import express, { Request, Response } from "express";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import type { TagRow } from "../../shared/types.js";

interface SqliteError extends Error {
  code?: string;
}

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/tags - list all tags
router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const tags = db
    .prepare("SELECT * FROM tags WHERE user_id = ? ORDER BY name")
    .all(userId) as TagRow[];
  res.json(tags);
});

// POST /api/tags - create new tag
router.post(
  "/",
  (req: Request<object, unknown, { name?: string }>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    try {
      const result = db
        .prepare("INSERT INTO tags (name, user_id) VALUES (?, ?)")
        .run(name.trim(), userId);
      const tag = db
        .prepare("SELECT * FROM tags WHERE id = ?")
        .get(result.lastInsertRowid) as TagRow;
      res.status(201).json(tag);
    } catch (e) {
      const error = e as SqliteError;
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        res.status(400).json({ error: "Tag already exists" });
        return;
      }
      throw e;
    }
  },
);

// PUT /api/tags/:id - update tag name
router.put(
  "/:id",
  (req: Request<{ id: string }, unknown, { name?: string }>, res: Response) => {
    const db = getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const existing = db
      .prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?")
      .get(id, userId) as TagRow | undefined;
    if (!existing) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    try {
      db.prepare("UPDATE tags SET name = ? WHERE id = ? AND user_id = ?").run(
        name.trim(),
        id,
        userId,
      );
      const tag = db
        .prepare("SELECT * FROM tags WHERE id = ?")
        .get(id) as TagRow;
      res.json(tag);
    } catch (e) {
      const error = e as SqliteError;
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        res.status(400).json({ error: "Tag already exists" });
        return;
      }
      throw e;
    }
  },
);

// DELETE /api/tags/:id - delete tag
router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
  const db = getDb();
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?")
    .get(id, userId) as TagRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }

  db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?").run(id, userId);
  res.json({ message: "Tag deleted", id: parseInt(id) });
});

export default router;
