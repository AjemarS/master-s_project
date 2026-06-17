import { describe, it, expect } from "vitest";
import { createUserSchema, enableTwoFactorSchema } from "../validation/schemas";

describe("validation schemas", () => {
  it("should accept valid createUser payload", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("should reject createUser with short password", () => {
    const result = createUserSchema.safeParse({
      email: "test@example.com",
      password: "123",
      name: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("should reject createUser with invalid email", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid enableTwoFactor payload", () => {
    const result = enableTwoFactorSchema.safeParse({ password: "mypassword" });
    expect(result.success).toBe(true);
  });

  it("should reject enableTwoFactor without password", () => {
    const result = enableTwoFactorSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
