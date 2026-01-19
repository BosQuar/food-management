import express from "express";
import { getDb } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/tags - list all tags
router.get("/", (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const tags = db
    .prepare("SELECT * FROM tags WHERE user_id = ? ORDER BY name")
    .all(userId);
  res.json(tags);
});

// POST /api/tags - create new tag
router.post("/", (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const result = db
      .prepare("INSERT INTO tags (name, user_id) VALUES (?, ?)")
      .run(name.trim(), userId);
    const tag = db
      .prepare("SELECT * FROM tags WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Tag already exists" });
    }
    throw e;
  }
});

// PUT /api/tags/:id - update tag name
router.put("/:id", (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { id } = req.params;
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  const existing = db
    .prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: "Tag not found" });
  }

  try {
    db.prepare("UPDATE tags SET name = ? WHERE id = ? AND user_id = ?").run(
      name.trim(),
      id,
      userId,
    );
    const tag = db.prepare("SELECT * FROM tags WHERE id = ?").get(id);
    res.json(tag);
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Tag already exists" });
    }
    throw e;
  }
});

// DELETE /api/tags/:id - delete tag
router.delete("/:id", (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { id } = req.params;

  const existing = db
    .prepare("SELECT * FROM tags WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: "Tag not found" });
  }

  db.prepare("DELETE FROM tags WHERE id = ? AND user_id = ?").run(id, userId);
  res.json({ message: "Tag deleted", id: parseInt(id) });
});

export default router;
