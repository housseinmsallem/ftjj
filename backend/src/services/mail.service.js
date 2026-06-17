import nodemailer from 'nodemailer';

export function mailEnabled() { return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER); }

export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled()) {
    console.log('[MAIL:DEV]', { to, subject, text: text || html });
    return { skipped: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
}
