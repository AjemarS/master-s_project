import { Request, Response } from "express";
import { twofactorDisable, twofactorEnable } from "../services/twoFactorService";

const enableTwoFactor = (req: Request, res: Response) => {
  const { userId } = req.body;
  const response = twofactorEnable(userId);
  res.json({ message: "Two-factor authentication enabled." });
};

const disableTwoFactor = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const response = twofactorDisable(userId);
  res.json({ message: "Two-factor authentication disabled." });
};

export const twoFactorController = { enableTwoFactor, disableTwoFactor };
