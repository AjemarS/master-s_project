import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { requireAuth } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { enableTwoFactorSchema, disableTwoFactorSchema } from "../validation/schemas";

const router = express.Router();

router.post("/enable", requireAuth, validate(enableTwoFactorSchema), async (req, res, next) => {
  try {
    const { password, issuer } = req.body;
    const result = await auth.api.enableTwoFactor({
      body: { password, issuer },
      headers: fromNodeHeaders(req.headers),
    });
    return res.json(result);
  } catch (error: unknown) {
    return res.status(400).json({ message: (error as Error).message || "Failed to enable 2FA" });
  }
});

router.post("/disable", requireAuth, validate(disableTwoFactorSchema), async (req, res, next) => {
  try {
    const { password } = req.body;
    const result = await auth.api.disableTwoFactor({
      body: { password },
      headers: fromNodeHeaders(req.headers),
    });
    return res.json(result);
  } catch (error: unknown) {
    return res.status(400).json({ message: (error as Error).message || "Failed to disable 2FA" });
  }
});

export { router as twoFactorRoutes };
