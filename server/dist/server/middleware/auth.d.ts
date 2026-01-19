import { Request, Response, NextFunction } from "express";
import type { AuthUser } from "../../shared/types.js";
/**
 * Middleware to require authentication.
 * Extracts token from Authorization header (Bearer token) and verifies it.
 * Sets req.user with { id, username } if valid.
 */
export declare function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void;
/**
 * Get user from token (for WebSocket auth)
 */
export declare function getUserFromToken(token: string | null): AuthUser | null;
//# sourceMappingURL=auth.d.ts.map
