import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

export type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult = {
  sent: boolean;
  provider?: 'smtp' | 'resend';
  messageId?: string;
};

let smtpTransporter: nodemailer.Transporter | null = null;
let smtpTransporterKey: string | null = null;
const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/** Port 465 = implicit TLS; port 587 = STARTTLS (secure: false). */
export function resolveSmtpSecure(port: number): boolean {
  if (port === 465) return true;
  if (port === 587) return false;
  return env.SMTP_SECURE;
}

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST) return null;

  const port = env.SMTP_PORT;
  const secure = resolveSmtpSecure(port);
  const cacheKey = `${env.SMTP_HOST}:${port}:${secure}:${env.SMTP_USER ?? ''}`;

  if (!smtpTransporter || smtpTransporterKey !== cacheKey) {
    smtpTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      ...(port === 587 && !secure ? { requireTLS: true } : {}),
    });
    smtpTransporterKey = cacheKey;
  }

  return smtpTransporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST || env.RESEND_API_KEY);
}

export async function verifyEmailTransport(): Promise<void> {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    if (resendClient) {
      console.log('[Email] Using Resend API (RESEND_API_KEY set)');
      return;
    }
    console.warn(
      '[Email] No email transport configured. Set SMTP_HOST (+ SMTP_USER/SMTP_PASS) or RESEND_API_KEY.',
    );
    return;
  }

  const port = env.SMTP_PORT;
  const secure = resolveSmtpSecure(port);

  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified', {
      host: env.SMTP_HOST,
      port,
      secure,
      note: port === 465 ? 'implicit TLS' : port === 587 ? 'STARTTLS' : 'custom',
    });
  } catch (error) {
    console.error('[Email] SMTP verification failed', {
      host: env.SMTP_HOST,
      port,
      secure,
      error: error instanceof Error ? error.message : error,
    });
  }
}

/**
 * Send email via SMTP (preferred) or Resend API fallback.
 * Throws on transport errors when a provider is configured.
 */
export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const to = params.to.trim().toLowerCase();
  if (!to) {
    throw new Error('Recipient email (to) is required');
  }

  const from = env.SMTP_FROM_EMAIL || env.RESEND_FROM_EMAIL;
  const mail: nodemailer.SendMailOptions = {
    from,
    to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  };

  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail(mail);
      console.log('[Email] Sent via SMTP', {
        to,
        subject: params.subject,
        messageId: info.messageId,
      });
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error('[Email] SMTP send failed', {
        to,
        subject: params.subject,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject: params.subject,
        html: params.html,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log('[Email] Sent via Resend', {
        to,
        subject: params.subject,
        id: result.data?.id,
      });
      return { sent: true, provider: 'resend', messageId: result.data?.id };
    } catch (error) {
      console.error('[Email] Resend send failed', {
        to,
        subject: params.subject,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  console.warn('[Email] Skipped — no SMTP or Resend configured', {
    to,
    subject: params.subject,
  });
  return { sent: false };
}
