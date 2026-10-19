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

describe("SMTP transport", () => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));
  const resendSend = vi.fn();
  const smtpEnv = { SMTP_HOST: "smtp.gmail.com", SMTP_USER: "shop@gmail.com", SMTP_PASSWORD: "app-password" };

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    createTransport.mockClear();
    resendSend.mockReset().mockResolvedValue({ error: null });
    vi.doMock("nodemailer", () => ({ default: { createTransport } }));
    vi.doMock("resend", () => ({ Resend: class { emails = { send: resendSend }; } }));
    Object.assign(process.env, smtpEnv);
  });

  afterAll(() => {
    for (const k of [...Object.keys(smtpEnv), "SMTP_PORT", "SMTP_FROM", "RESEND_API_KEY"]) delete process.env[k];
    vi.doUnmock("nodemailer");
    vi.doUnmock("resend");
  });

  it("sends through SMTP over SSL on 465, from SMTP_USER by default", async () => {
    const { sendResetPasswordEmail } = await import("../email/sender.js");
    await sendResetPasswordEmail("user@example.com", "https://shop/reset");
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "shop@gmail.com", pass: "app-password" },
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "shop@gmail.com", to: "user@example.com", subject: "Скидання паролю — TechHub",
    }));
    expect(sendMail.mock.calls[0][0].html).toContain("https://shop/reset");
  });

  it("uses STARTTLS on 587 and SMTP_FROM when set", async () => {
    process.env.SMTP_PORT = "587";
    process.env.SMTP_FROM = "TechHub <shop@gmail.com>";
    const { sendOtpEmail } = await import("../email/sender.js");
    await sendOtpEmail("user@example.com", "123456", "sign-in");
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "TechHub <shop@gmail.com>" }));
    expect(sendMail.mock.calls[0][0].html).toContain("123456");
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_FROM;
  });

  it("prefers SMTP over Resend when both are configured", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const { sendVerificationEmail } = await import("../email/sender.js");
    await sendVerificationEmail("user@example.com", "https://shop/verify");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(resendSend).not.toHaveBeenCalled();
    delete process.env.RESEND_API_KEY;
  });

  it("logs and swallows SMTP failures", async () => {
    sendMail.mockRejectedValue(new Error("535 bad credentials"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendImpersonationCode } = await import("../email/sender.js");
    await expect(sendImpersonationCode("user@example.com", "4242")).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("[email] Failed to send impersonation code:", expect.any(Error));
    error.mockRestore();
  });

  it("reports Resend API errors instead of logging success", async () => {
    for (const k of Object.keys(smtpEnv)) delete process.env[k];
    process.env.RESEND_API_KEY = "re_test";
    resendSend.mockResolvedValue({ error: { message: "domain not verified" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendVerificationEmail } = await import("../email/sender.js");
    await sendVerificationEmail("user@example.com", "https://shop/verify");
    expect(error).toHaveBeenCalledWith("[email] Failed to send verification email:", expect.any(Error));
    error.mockRestore();
    delete process.env.RESEND_API_KEY;
  });
});
