import { Request, Response, NextFunction } from "express";
import { getSessionFromCacheOrProvider } from "./sessionCache";
import logger from "../logger";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getSessionFromCacheOrProvider(req.headers);
    if (!session || !session.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    res.locals.user = session.user;
    next();
  } catch (error: unknown) {
    logger.error("Auth check failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getSessionFromCacheOrProvider(req.headers);

    if (!session || !session.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (session.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    res.locals.user = session.user;
    next();
  } catch (error: unknown) {
    logger.error("Admin check failed", { error: (error as Error).message });
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
