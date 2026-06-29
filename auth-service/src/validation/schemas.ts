import { z } from "zod";

const COMMON_PASSWORDS = new Set([
  "password123", "Password123", "12345678", "qwerty123", "admin123",
  "letmein", "welcome1", "monkey123", "dragon123", "abc12345",
  "passw0rd", "changeme1", "123456789", "87654321", "11111111",
]);

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine((p) => /[A-Z]/.test(p), "Password must contain an uppercase letter")
  .refine((p) => /[a-z]/.test(p), "Password must contain a lowercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain a digit")
  .refine((p) => !COMMON_PASSWORDS.has(p), "Password is too common");

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  status: z.string().optional(),
});

export const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "user", "cashier", "warehouse_worker"]),
});

export const enableTwoFactorSchema = z.object({
  password: z.string().min(1),
  issuer: z.string().optional(),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1),
});
