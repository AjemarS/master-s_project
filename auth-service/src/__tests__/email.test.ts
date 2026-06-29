import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const originalResendKey = process.env.RESEND_API_KEY;

beforeAll(() => {
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  if (originalResendKey) {
    process.env.RESEND_API_KEY = originalResendKey;
  }
});

beforeEach(() => {
  vi.resetModules();
});

describe("sendVerificationEmail", () => {
  it("should log warning when resend not configured (no API key)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendVerificationEmail } = await import("../email/sender.js");
    await sendVerificationEmail("test@example.com", "http://localhost/verify");
    expect(warn).toHaveBeenCalledWith(
      "[email] Resend not configured, skipping verification email to",
      "test@example.com",
    );
    warn.mockRestore();
  });
});

describe("sendResetPasswordEmail", () => {
  it("should log warning when resend not configured (no API key)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendResetPasswordEmail } = await import("../email/sender.js");
    await sendResetPasswordEmail("test@example.com", "http://localhost/reset");
    expect(warn).toHaveBeenCalledWith(
      "[email] Resend not configured, skipping reset email to",
      "test@example.com",
    );
    warn.mockRestore();
  });
});
