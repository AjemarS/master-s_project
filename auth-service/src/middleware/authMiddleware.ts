import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import logger from "../logger";

const adminUserIds: string[] = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

export function getAdminUserIds(): string[] {
  return adminUserIds;
}

export function addAdminUserId(userId: string): void {
  if (!adminUserIds.includes(userId)) {
    adminUserIds.push(userId);
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session || !session.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    res.locals.user = session.user;
    next();
  } catch (error) {
    logger.error("Auth check failed", { error: (error as Error).message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!adminUserIds.includes(session.user.id)) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    res.locals.user = session.user;
    next();
  } catch (error) {
    logger.error("Admin check failed", { error: (error as Error).message });
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
