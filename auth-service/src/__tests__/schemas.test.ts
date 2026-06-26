import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  setRoleSchema,
  enableTwoFactorSchema,
  disableTwoFactorSchema,
} from "../validation/schemas";

describe("createUserSchema", () => {
  it("accepts valid payload", () => {
    expect(createUserSchema.safeParse({ email: "a@b.com", password: "12345678", name: "Test" }).success).toBe(true);
  });

  it("rejects missing email", () => {
    expect(createUserSchema.safeParse({ password: "12345678", name: "Test" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(createUserSchema.safeParse({ email: "bad", password: "12345678", name: "Test" }).success).toBe(false);
  });

  it("rejects short password (< 8)", () => {
    expect(createUserSchema.safeParse({ email: "a@b.com", password: "123", name: "Test" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(createUserSchema.safeParse({ email: "a@b.com", password: "12345678", name: "" }).success).toBe(false);
  });

  it("rejects missing password", () => {
    expect(createUserSchema.safeParse({ email: "a@b.com", name: "Test" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(createUserSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts partial update with email only", () => {
    expect(updateUserSchema.safeParse({ email: "new@b.com" }).success).toBe(true);
  });

  it("accepts partial update with name only", () => {
    expect(updateUserSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("accepts partial update with status only", () => {
    expect(updateUserSchema.safeParse({ status: "inactive" }).success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(updateUserSchema.safeParse({ email: "bad" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(updateUserSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("setRoleSchema", () => {
  it("accepts admin role", () => {
    expect(setRoleSchema.safeParse({ userId: "123", role: "admin" }).success).toBe(true);
  });

  it("accepts user role", () => {
    expect(setRoleSchema.safeParse({ userId: "123", role: "user" }).success).toBe(true);
  });

  it("accepts cashier role", () => {
    expect(setRoleSchema.safeParse({ userId: "123", role: "cashier" }).success).toBe(true);
  });

  it("accepts warehouse_worker role", () => {
    expect(setRoleSchema.safeParse({ userId: "123", role: "warehouse_worker" }).success).toBe(true);
  });

  it("rejects unknown role", () => {
    expect(setRoleSchema.safeParse({ userId: "123", role: "superadmin" }).success).toBe(false);
  });

  it("rejects missing userId", () => {
    expect(setRoleSchema.safeParse({ role: "admin" }).success).toBe(false);
  });

  it("rejects empty userId", () => {
    expect(setRoleSchema.safeParse({ userId: "", role: "admin" }).success).toBe(false);
  });

  it("rejects missing role", () => {
    expect(setRoleSchema.safeParse({ userId: "123" }).success).toBe(false);
  });
});

describe("enableTwoFactorSchema", () => {
  it("accepts valid password", () => {
    expect(enableTwoFactorSchema.safeParse({ password: "mypassword" }).success).toBe(true);
  });

  it("accepts password with optional issuer", () => {
    expect(enableTwoFactorSchema.safeParse({ password: "mypassword", issuer: "TechHub" }).success).toBe(true);
  });

  it("rejects missing password", () => {
    expect(enableTwoFactorSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(enableTwoFactorSchema.safeParse({ password: "" }).success).toBe(false);
  });
});

describe("disableTwoFactorSchema", () => {
  it("accepts valid password", () => {
    expect(disableTwoFactorSchema.safeParse({ password: "mypassword" }).success).toBe(true);
  });

  it("rejects missing password", () => {
    expect(disableTwoFactorSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(disableTwoFactorSchema.safeParse({ password: "" }).success).toBe(false);
  });
});
