import { Request, Response, NextFunction } from "express";
import { getDb } from "../db/connection.js";
import type { AuthUser } from "../../shared/types.js";

/**
 * Middleware to require authentication.
 * Extracts token from Authorization header (Bearer token) and verifies it.
 * Sets req.user with { id, username } if valid.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, username FROM users WHERE auth_token = ?")
    .get(token) as AuthUser | undefined;

  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}

/**
 * Get user from token (for WebSocket auth)
 */
export function getUserFromToken(token: string | null): AuthUser | null {
  if (!token) return null;

  const db = getDb();
  const user = db
    .prepare("SELECT id, username FROM users WHERE auth_token = ?")
    .get(token) as AuthUser | undefined;

  return user || null;
}
