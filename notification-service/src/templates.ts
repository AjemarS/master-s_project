import logger from "./logger";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

export function htmlWrap(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="uk"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table role="presentation" width="100%"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="480" style="background:#fff;border-radius:12px">
<tr><td style="padding:32px 32px 8px">
<h1 style="margin:0;font-size:24px;color:#1e293b">TechHub</h1>
</td></tr>
<tr><td style="padding:8px 32px 32px;color:#475569;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center">
TechHub &mdash; магазин побутової техніки</td></tr>
</table></td></tr></table></body></html>`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

interface TemplateData {
  subject: string;
  html: string;
}

export const TEMPLATES: Record<string, (data: Record<string, unknown>) => TemplateData> = {
  "order.created": (data: Record<string, unknown>) => ({
    subject: `Замовлення #${data.order_number} підтверджено`,
    html: htmlWrap(`
      <p>Дякуємо за замовлення в TechHub!</p>
      <p>Ваше замовлення <strong>#${data.order_number}</strong> підтверджено та оплачено.</p>
      <p>Сума: <strong>${data.total_amount} ₴</strong></p>
      <p>Ми повідомимо вас, коли замовлення буде відправлено.</p>
    `, "Замовлення підтверджено"),
  }),
  "order.status_changed": (data: Record<string, unknown>) => ({
    subject: `Замовлення #${data.order_number} — ${data.status === "shipped" ? "відправлено" : "статус змінено"}`,
    html: htmlWrap(`
      <p>Статус вашого замовлення <strong>#${data.order_number}</strong> змінено.</p>
      <p>Новий статус: <strong>${data.status}</strong></p>
      ${data.status === "shipped" ? "<p>Ваше замовлення в дорозі!</p>" : ""}
      ${data.status === "delivered" ? "<p>Замовлення доставлено. Дякуємо за покупку!</p>" : ""}
    `, "Статус замовлення"),
  }),
  "order.cancelled": (data: Record<string, unknown>) => ({
    subject: `Замовлення #${data.order_number} скасовано`,
    html: htmlWrap(`
      <p>Ваше замовлення <strong>#${data.order_number}</strong> було скасовано.</p>
      <p>Якщо оплата була проведена, кошти буде повернено.</p>
      <p>Якщо у вас є питання, зв'яжіться з нами.</p>
    `, "Замовлення скасовано"),
  }),
  "inventory.low_stock": (data: Record<string, unknown>) => ({
    subject: `Низький залишок: товар #${data.product_id}`,
    html: htmlWrap(`
      <p>Залишок товару <strong>#${data.product_id}</strong> впав нижче порогу.</p>
      <p>Поточний залишок: <strong>${data.quantity}</strong> од.</p>
      <p>Склад: <strong>${data.warehouse_name || data.warehouse_id}</strong></p>
      <p>Будь ласка, замовте поповнення.</p>
    `, "Низький залишок"),
  }),
};

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    logger.info(`[dry-run] Email to ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    logger.info(`[email] Sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`[email] Failed to send to ${to}: ${(err as Error).message}`);
  }
}
