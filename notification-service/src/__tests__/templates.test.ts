import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
const resendSend = vi.fn();
const logger = { info: vi.fn(), error: vi.fn() };

vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: resendSend }; } }));
vi.mock("../logger", () => ({ default: logger }));

const ENV = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM", "RESEND_API_KEY"];

async function loadSendEmail(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ENV) delete process.env[k];
  Object.assign(process.env, env);
  return (await import("../templates")).sendEmail;
}

describe("sendEmail", () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    createTransport.mockClear();
    resendSend.mockReset().mockResolvedValue({ error: null });
    logger.info.mockClear();
    logger.error.mockClear();
  });

  afterEach(() => {
    for (const k of ENV) delete process.env[k];
  });

  it("dry-runs when no transport is configured", async () => {
    const sendEmail = await loadSendEmail({});
    await sendEmail("user@example.com", "Order paid", "<p>hi</p>");
    expect(sendMail).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("[dry-run] Email to user@example.com: Order paid");
  });

  it("sends through SMTP and prefers it over Resend", async () => {
    const sendEmail = await loadSendEmail({
      SMTP_HOST: "smtp.gmail.com", SMTP_USER: "shop@gmail.com", SMTP_PASSWORD: "app-password", RESEND_API_KEY: "re_test",
    });
    await sendEmail("user@example.com", "Order paid", "<p>hi</p>");
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true }));
    expect(sendMail).toHaveBeenCalledWith({ from: "shop@gmail.com", to: "user@example.com", subject: "Order paid", html: "<p>hi</p>" });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("logs SMTP failures without throwing", async () => {
    sendMail.mockRejectedValue(new Error("535 bad credentials"));
    const sendEmail = await loadSendEmail({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "shop@gmail.com" });
    await expect(sendEmail("user@example.com", "Order paid", "<p>hi</p>")).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith("[email] Failed to send to user@example.com: 535 bad credentials");
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("treats a Resend API error as a failure", async () => {
    resendSend.mockResolvedValue({ error: { message: "domain not verified" } });
    const sendEmail = await loadSendEmail({ RESEND_API_KEY: "re_test" });
    await sendEmail("user@example.com", "Order paid", "<p>hi</p>");
    expect(logger.error).toHaveBeenCalledWith("[email] Failed to send to user@example.com: domain not verified");
  });
});
