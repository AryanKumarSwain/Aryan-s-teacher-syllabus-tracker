import { env } from '../config/env.js';
import { isEmailConfigured, sendMail } from './email.service.js';

export async function sendTeacherCredentialsEmail(params: {
  to: string;
  teacherName: string;
  schoolName: string;
  email: string;
  tempPassword: string;
}): Promise<void> {
  const to = params.to.trim().toLowerCase();

  if (!isEmailConfigured()) {
    console.warn('[Email] Teacher credentials not sent — configure SMTP_HOST or RESEND_API_KEY', {
      to,
    });
    throw new Error(
      'Email service is not configured. Set SMTP_HOST (and SMTP_USER/SMTP_PASS) or RESEND_API_KEY.',
    );
  }

  const loginUrl = `${env.APP_URL}/login?role=teacher`;

  try {
    const result = await sendMail({
      to,
      subject: `Welcome to ${params.schoolName} — Your teacher account`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111;">Welcome, ${escapeHtml(params.teacherName)}!</h1>
          <p>Your teacher account has been created for <strong>${escapeHtml(params.schoolName)}</strong>.</p>
          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(params.email)}</p>
            <p style="margin: 0;"><strong>Temporary password:</strong> <code>${escapeHtml(params.tempPassword)}</code></p>
          </div>
          <p style="color: #666;">Please change your password after your first login.</p>
        </div>
      `,
      text: [
        `Welcome, ${params.teacherName}!`,
        `Your teacher account for ${params.schoolName} has been created.`,
        `Login: ${loginUrl}`,
        `Email: ${params.email}`,
        `Temporary password: ${params.tempPassword}`,
        'Please change your password after your first login.',
      ].join('\n'),
    });

    if (!result.sent) {
      throw new Error('Email transport returned without sending');
    }
  } catch (error) {
    console.error('[Email] Failed to send teacher credentials', {
      to,
      schoolName: params.schoolName,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
