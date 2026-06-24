import { isEmailConfigured, sendMail } from './email.service.js';

export async function sendOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
}): Promise<void> {
  const to = params.to.trim().toLowerCase();

  if (!isEmailConfigured()) {
    console.warn('[Email] OTP not sent — configure SMTP_HOST or RESEND_API_KEY', { to });
    throw new Error(
      'Email service is not configured. Set SMTP_HOST (and SMTP_USER/SMTP_PASS) or RESEND_API_KEY.',
    );
  }

  try {
    const result = await sendMail({
      to,
      subject: 'Your password change verification code',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111;">Password change request</h1>
          <p>Hi <strong>${escapeHtml(params.name)}</strong>,</p>
          <p>Use the verification code below to confirm your password change. It expires in <strong>10 minutes</strong>.</p>
          <div style="background: #f4f4f5; padding: 32px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">Your verification code</p>
            <p style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1a73e8;">${escapeHtml(params.otp)}</p>
          </div>
          <p style="color: #666;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      text: [
        `Hi ${params.name},`,
        'Your password change verification code is:',
        params.otp,
        'This code expires in 10 minutes.',
        'If you did not request this, ignore this email.',
      ].join('\n'),
    });

    if (!result.sent) {
      throw new Error('Email transport returned without sending');
    }
  } catch (error) {
    console.error('[Email] Failed to send OTP email', {
      to,
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
