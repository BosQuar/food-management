import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb } from "../db/connection.js";

const router = express.Router();

// POST /api/auth/register - Create new user
router.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Användarnamn och lösenord krävs" });
  }

  if (username.length < 4) {
    return res
      .status(400)
      .json({ error: "Användarnamn måste vara minst 4 tecken" });
  }

  if (password.length < 4) {
    return res
      .status(400)
      .json({ error: "Lösenord måste vara minst 4 tecken" });
  }

  const db = getDb();

  // Check if username already exists
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);

  if (existing) {
    return res.status(400).json({ error: "Användarnamnet är upptaget" });
  }

  // Hash password and create user
  const passwordHash = bcrypt.hashSync(password, 10);
  const authToken = crypto.randomBytes(32).toString("hex");

  const result = db
    .prepare(
      "INSERT INTO users (username, password_hash, auth_token) VALUES (?, ?, ?)",
    )
    .run(username, passwordHash, authToken);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    token: authToken,
  });
});

// POST /api/auth/login - Login existing user
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Användarnamn och lösenord krävs" });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return res
      .status(401)
      .json({ error: "Felaktigt användarnamn eller lösenord" });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);

  if (!validPassword) {
    return res
      .status(401)
      .json({ error: "Felaktigt användarnamn eller lösenord" });
  }

  // Generate new token
  const authToken = crypto.randomBytes(32).toString("hex");
  db.prepare("UPDATE users SET auth_token = ? WHERE id = ?").run(
    authToken,
    user.id,
  );

  res.json({
    id: user.id,
    username: user.username,
    token: authToken,
  });
});

// GET /api/auth/me - Verify token and get current user
router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);

  const db = getDb();
  const user = db
    .prepare("SELECT id, username FROM users WHERE auth_token = ?")
    .get(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  res.json({
    id: user.id,
    username: user.username,
    token,
  });
});

// PUT /api/auth/password - Change password
router.put("/password", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7);

  const db = getDb();
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE auth_token = ?")
    .get(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Nuvarande och nytt lösenord krävs" });
  }

  if (newPassword.length < 4) {
    return res
      .status(400)
      .json({ error: "Nytt lösenord måste vara minst 4 tecken" });
  }

  // Verify current password
  const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!validPassword) {
    return res.status(400).json({ error: "Felaktigt nuvarande lösenord" });
  }

  // Hash and save new password
  const newPasswordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    newPasswordHash,
    user.id,
  );

  res.json({ message: "Lösenord ändrat" });
});

// POST /api/auth/logout - Invalidate token
router.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ message: "Logged out" });
  }

  const token = authHeader.substring(7);

  const db = getDb();
  db.prepare("UPDATE users SET auth_token = NULL WHERE auth_token = ?").run(
    token,
  );

  res.json({ message: "Logged out" });
});

export default router;
