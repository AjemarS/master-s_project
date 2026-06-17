import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  status: z.string().optional(),
});

export const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user"]),
});

export const enableTwoFactorSchema = z.object({
  password: z.string().min(1),
  issuer: z.string().optional(),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});
