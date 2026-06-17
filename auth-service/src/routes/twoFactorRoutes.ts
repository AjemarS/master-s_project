import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth";
import { requireAuth } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { enableTwoFactorSchema, disableTwoFactorSchema } from "../validation/schemas";
import logger from "../logger";

const router = express.Router();

router.post("/enable", requireAuth, validate(enableTwoFactorSchema), async (req, res) => {
  try {
    const { password, issuer } = req.body;
    await auth.api.enableTwoFactor({
      body: { password, issuer },
      headers: fromNodeHeaders(req.headers),
    });
    return res.json({ message: "Two-factor authentication enabled." });
  } catch (error: any) {
    logger.error("Enable 2FA failed", { error: error.message });
    return res.status(400).json({ success: false, message: error.message || "Failed to enable 2FA" });
  }
});

router.post("/disable", requireAuth, validate(disableTwoFactorSchema), async (req, res) => {
  try {
    const { password } = req.body;
    await auth.api.disableTwoFactor({
      body: { password },
      headers: fromNodeHeaders(req.headers),
    });
    return res.json({ message: "Two-factor authentication disabled." });
  } catch (error: any) {
    logger.error("Disable 2FA failed", { error: error.message });
    return res.status(400).json({ success: false, message: error.message || "Failed to disable 2FA" });
  }
});

export { router as twoFactorRoutes };
