import nodemailer from "nodemailer";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

// SMTP (e.g. Gmail with an app password) wins over Resend, which only mails other people from a verified domain
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtp = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null;
const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "";

/** Sends through SMTP or Resend. Returns false when neither is configured (dev mode); throws if delivery fails. */
async function deliver(to: string, subject: string, html: string): Promise<boolean> {
  if (smtp) {
    await smtp.sendMail({ from: smtpFrom, to, subject, html });
    return true;
  }
  if (resend) {
    const { error } = await resend.emails.send({ from: fromEmail, to, subject, html });
    if (error) throw new Error(error.message);
    return true;
  }
  return false;
}

function wrapHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:32px 32px 8px">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b">TechHub</h1>
        </td></tr>
        <tr><td style="padding:8px 32px 32px;color:#475569;font-size:15px;line-height:1.6">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center">
          TechHub &mdash; магазин побутової техніки
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function verificationEmailHtml(url: string): string {
  return wrapHtml(`
    <p>Дякуємо за реєстрацію в TechHub!</p>
    <p>Будь ласка, підтвердьте вашу електронну адресу, натиснувши кнопку нижче:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="background:#7c3aed;border-radius:8px;padding:12px 24px">
          <a href="${url}" style="color:#fff;text-decoration:none;font-weight:600;font-size:14px">Підтвердити email</a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#94a3b8">Або скопіюйте посилання: <br>${url}</p>
    <p style="font-size:13px;color:#94a3b8">Посилання дійсне протягом 24 годин.</p>
  `, "Підтвердження email — TechHub");
}

function resetPasswordHtml(url: string): string {
  return wrapHtml(`
    <p>Ви отримали цей лист, тому що запросили скидання паролю для облікового запису TechHub.</p>
    <p>Натисніть кнопку нижче, щоб встановити новий пароль:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr>
        <td align="center" style="background:#7c3aed;border-radius:8px;padding:12px 24px">
          <a href="${url}" style="color:#fff;text-decoration:none;font-weight:600;font-size:14px">Скинути пароль</a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#94a3b8">Або скопіюйте посилання: <br>${url}</p>
    <p style="font-size:13px;color:#94a3b8">Якщо ви не запитували скидання паролю, проігноруйте цей лист. Посилання дійсне протягом 1 години.</p>
  `, "Скидання паролю — TechHub");
}

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  try {
    if (!(await deliver(email, "Підтвердження email — TechHub", verificationEmailHtml(url)))) {
      console.log("[email] DEV MODE: Verification email URL for", email);
      console.log("[email]", url);
      return;
    }
    console.log("[email] Verification email sent to", email);
  } catch (err) {
    console.error("[email] Failed to send verification email:", err);
  }
}

export async function sendResetPasswordEmail(email: string, url: string): Promise<void> {
  try {
    if (!(await deliver(email, "Скидання паролю — TechHub", resetPasswordHtml(url)))) {
      console.log("[email] DEV MODE: Reset password URL for", email);
      console.log("[email]", url);
      return;
    }
    console.log("[email] Reset password email sent to", email);
  } catch (err) {
    console.error("[email] Failed to send reset password email:", err);
  }
}

export async function sendImpersonationCode(email: string, code: string): Promise<void> {
  try {
    const html = wrapHtml(`
      <p>Співробітник TechHub запитує доступ до вашого облікового запису.</p>
      <p>Якщо ви згодні, надайте код нижче:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; color: #7c3aed; margin: 24px 0;">
        ${code}
      </p>
      <p style="font-size: 13px; color: #94a3b8;">Код дійсний 5 хвилин. Якщо ви не запитували цей код, проігноруйте повідомлення.</p>
    `, "Код імперсонації — TechHub");
    if (!(await deliver(email, "Код імперсонації — TechHub", html))) {
      console.warn("[email] No mail transport configured, skipping impersonation code to", email);
      return;
    }
    console.log("[email] Impersonation code sent to", email);
  } catch (err) {
    console.error("[email] Failed to send impersonation code:", err);
  }
}

export async function sendOtpEmail(email: string, otp: string, type: "sign-in" | "email-verification" | "forget-password" | "change-email"): Promise<void> {
  const appName = "TechHub";
  const subject = type === "sign-in"
    ? `Your ${appName} sign-in code`
    : type === "email-verification" || type === "change-email"
      ? `Verify your ${appName} email`
      : `Reset your ${appName} password`;
  const html = `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`;

  try {
    if (!(await deliver(email, subject, html))) {
      console.log(`[email] DEV MODE: OTP for ${email} (${type})`);
      console.log(`[email] Your OTP code: ${otp}`);
    }
  } catch (err) {
    console.error(`[email] Failed to send OTP to ${email}:`, err);
  }
}
