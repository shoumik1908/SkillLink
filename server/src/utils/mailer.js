import nodemailer from 'nodemailer';

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const mailFrom = process.env.MAIL_FROM || 'SkillLink <no-reply@muj.manipal.edu>';

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an email or log it to the console if SMTP is not configured.
 */
async function sendMail({ to, subject, text, html }) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: mailFrom,
        to,
        subject,
        text,
        html,
      });
      console.log(`📧 [EMAIL SENT] To: ${to} | Subject: ${subject}`);
      return true;
    } catch (err) {
      console.error(`❌ [EMAIL ERROR] Failed sending to ${to}:`, err.message);
      // Fallback to console in development
      console.log(`Fallback email text: \n${text}`);
      return false;
    }
  } else {
    // Development / No-SMTP mode: log to console with clear visual distinction
    console.log('\n======================================================');
    console.log(`📨 [MOCK SMTP DEV EMAIL]`);
    console.log(`To: ${to}`);
    console.log(`From: ${mailFrom}`);
    console.log(`Subject: ${subject}`);
    console.log(`------------------------------------------------------`);
    console.log(text);
    console.log('======================================================\n');
    return true;
  }
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail({ to, name, token }) {
  // Verification endpoint handled by Express backend
  const verifyUrl = `${clientOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const subject = 'Verify your SkillLink MUJ Account';
  const text = `Hello ${name || 'Student'},\n\nWelcome to SkillLink! Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis verification link will expire in 24 hours.\n\nIf you did not request this account, please ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #7c3aed; margin-top: 0;">Welcome to SkillLink!</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${name || 'Student'}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Thank you for registering with your Manipal University Jaipur email. Please confirm your email to activate your account and start collaborating on campus projects and hackathons.</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #7c3aed; word-break: break-all;">${verifyUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This link will expire in 24 hours. If you did not sign up for SkillLink, please disregard this email.</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({ to, name, token }) {
  // Password reset frontend page
  const resetUrl = `${clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;

  const subject = 'Reset your SkillLink Password';
  const text = `Hello ${name || 'User'},\n\nWe received a request to reset your SkillLink password. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #7c3aed; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your SkillLink account. Click the button below to choose a new password:</p>
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #7c3aed; word-break: break-all;">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">This link will expire in 30 minutes. If you did not request this, please secure your account immediately.</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
}
