import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("sendVerificationEmail", () => {
  it("should log warning when resend not configured (no API key)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendVerificationEmail } = await import("../email/sender");
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
    const { sendResetPasswordEmail } = await import("../email/sender");
    await sendResetPasswordEmail("test@example.com", "http://localhost/reset");
    expect(warn).toHaveBeenCalledWith(
      "[email] Resend not configured, skipping reset email to",
      "test@example.com",
    );
    warn.mockRestore();
  });
});
