import nodemailer from "nodemailer";

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || "mohamednaga07@gmail.com";
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "ytwzsquhkukwldpc").replace(/\s/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || `Campus Ratings <${EMAIL_USER}>`;

// Resend configuration (preferred for production - simple API)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use a verified domain if provided, else fall back to Resend onboarding domain
const RESEND_FROM = process.env.RESEND_FROM || 'Campus Ratings <onboarding@resend.dev>';
const USE_RESEND = !!RESEND_API_KEY;

console.log("[Email Setup] Initializing with:");
console.log(`  EMAIL_USER: ${EMAIL_USER}`);
console.log(`  Using Resend: ${USE_RESEND}`);
if (USE_RESEND) {
  console.log(`  Resend From: ${RESEND_FROM}`);
}

// Create Gmail transporter as fallback
// Try port 587 with STARTTLS first (better compatibility with hosting providers)
const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  connectionTimeout: 10000, 
  greetingTimeout: 10000,   
  socketTimeout: 10000,
  requireTLS: true,
});

// Test Gmail connection
gmailTransporter.verify((error, success) => {
  if (error) {
    console.error("⚠️  Gmail SMTP not available:", error.message);
    if (!USE_RESEND) {
      console.log("💡 Email setup required!");
      console.log("   Quick setup with Resend (1 minute):");
      console.log("   1. Go to: https://resend.com/signup");
      console.log("   2. Sign in with GitHub (instant)");
      console.log("   3. Create API key");
      console.log("   4. Set RESEND_API_KEY in Render environment variables");
      console.log("   5. Done! Emails will work immediately.");
    }
  } else {
    console.log("✅ Gmail SMTP available as fallback");
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log(`[Email Send] Starting email send...`);
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);

    // Try Resend first if configured (simple HTTP API)
    if (USE_RESEND) {
      console.log(`  Using Resend API`);
      try {
        console.log(`[Email Send] Resend payload:`, {
          from: RESEND_FROM,
          to: options.to,
          subject: options.subject,
          html_length: options.html ? options.html.length : 0,
          text_length: options.text ? options.text.length : 0,
          has_html: !!options.html,
          has_text: !!options.text,
        });
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
            reply_to: EMAIL_USER,
          }),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status} ${JSON.stringify(responseData)}`);
        }
        
        console.log(`[Email Send] ✅ Email sent via Resend: ${responseData.id}`);
        return true;
      } catch (resendError: any) {
        console.error(`[Email Send] ❌ Resend failed:`, resendError.message);
        console.log(`[Email Send] Falling back to Gmail...`);
        // Fall through to Gmail
      }
    }

    // Fallback to Gmail
    console.log(`  Using Gmail SMTP`);
    const info = await gmailTransporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`[Email Send] ✅ Email sent via Gmail: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Send] ❌ Failed to send email to ${options.to}:`);
    console.error(`  Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`  Error message: ${error instanceof Error ? error.message : error}`);
    // Throw the error so the route handler knows it failed
    throw error;
  }
}

export function generateForgotPasswordEmailHtml(username: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Reset Your Password</h2>
        </div>
        <div class="content">
          <p>Hi ${username},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2026 Campus Ratings. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateForgotUsernameEmailHtml(username: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; }
        .username-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; font-family: monospace; font-size: 16px; }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Your Username</h2>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your username for Campus Ratings is:</p>
          <div class="username-box">${username}</div>
          <p>You can use this username to log in to your account.</p>
          <p>If you didn't request this information, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2026 Campus Ratings. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
