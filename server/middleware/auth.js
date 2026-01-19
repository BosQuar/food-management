import { getDb } from "../db/connection.js";

/**
 * Middleware to require authentication.
 * Extracts token from Authorization header (Bearer token) and verifies it.
 * Sets req.user with { id, username } if valid.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, username FROM users WHERE auth_token = ?")
    .get(token);

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
}

/**
 * Get user from token (for WebSocket auth)
 */
export function getUserFromToken(token) {
  if (!token) return null;

  const db = getDb();
  const user = db
    .prepare("SELECT id, username FROM users WHERE auth_token = ?")
    .get(token);

  return user || null;
}
