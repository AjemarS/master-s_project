import express from "express";
import { twoFactorController } from "../controllers/twoFactorController";
const router = express.Router();

router.post("/enable", async (req, res) => {
  twoFactorController.enableTwoFactor(req, res);
});

router.post("/disable", async (req, res) => {
  twoFactorController.disableTwoFactor(req, res);
});

export { router as twoFactorRoutes };
