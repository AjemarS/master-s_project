import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";
const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@techhub.shop";

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
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
  if (!resend) {
    console.warn("[email] Resend not configured, skipping verification email to", email);
    return;
  }
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Підтвердження email — TechHub",
      html: verificationEmailHtml(url),
    });
    console.log("[email] Verification email sent to", email);
  } catch (err) {
    console.error("[email] Failed to send verification email:", err);
  }
}

export async function sendResetPasswordEmail(email: string, url: string): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured, skipping reset email to", email);
    return;
  }
  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Скидання паролю — TechHub",
      html: resetPasswordHtml(url),
    });
    console.log("[email] Reset password email sent to", email);
  } catch (err) {
    console.error("[email] Failed to send reset password email:", err);
  }
}
