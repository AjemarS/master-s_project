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
  it("should log URL in dev mode when resend not configured (no API key)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendVerificationEmail } = await import("../email/sender.js");
    await sendVerificationEmail("test@example.com", "http://localhost/verify");
    expect(log).toHaveBeenCalledWith("[email] DEV MODE: Verification email URL for", "test@example.com");
    expect(log).toHaveBeenCalledWith("[email]", "http://localhost/verify");
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});

describe("sendResetPasswordEmail", () => {
  it("should log URL in dev mode when resend not configured (no API key)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendResetPasswordEmail } = await import("../email/sender.js");
    await sendResetPasswordEmail("test@example.com", "http://localhost/reset");
    expect(log).toHaveBeenCalledWith("[email] DEV MODE: Reset password URL for", "test@example.com");
    expect(log).toHaveBeenCalledWith("[email]", "http://localhost/reset");
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
