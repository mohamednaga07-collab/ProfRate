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
  console.log(`  Resend API Key: ${RESEND_API_KEY?.substring(0, 5)}...` + (RESEND_API_KEY?.length ? "" : " ❌ NOT SET"));
  console.log(`  Resend From: ${RESEND_FROM}`);
} else {
  console.log(`  ⚠️  RESEND_API_KEY not set - will attempt Gmail fallback`);
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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[EMAIL SERVICE] Processing email request`);
    console.log(`  Recipient: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  HTML size: ${options.html ? options.html.length : 0} bytes`);
    console.log(`  Text size: ${options.text ? options.text.length : 0} bytes`);
    console.log(`  Using Resend: ${USE_RESEND}`);
    console.log(`${'='.repeat(60)}\n`);

    // Try Resend first if configured (simple HTTP API)
    if (USE_RESEND) {
      console.log(`[RESEND] Starting Resend API call...`);
      console.log(`  From: ${RESEND_FROM}`);
      console.log(`  Reply-To: ${EMAIL_USER}`);
      
      try {
        const payload = {
          from: RESEND_FROM,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: EMAIL_USER,
        };
        
        console.log(`[RESEND] Sending payload to https://api.resend.com/emails`);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        
        console.log(`[RESEND] Response status: ${response.status}`);
        console.log(`[RESEND] Response data:`, responseData);
        
        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status} ${JSON.stringify(responseData)}`);
        }
        
        console.log(`✅ [RESEND] Email sent successfully! ID: ${responseData.id}`);
        console.log(`${'='.repeat(60)}\n`);
        return true;
      } catch (resendError: any) {
        console.error(`❌ [RESEND] Failed:`, resendError.message || resendError);
        console.log(`[GMAIL FALLBACK] Attempting to send via Gmail SMTP...`);
      }
    }

    // Fallback to Gmail
    console.log(`[GMAIL] Starting Gmail SMTP send...`);
    const info = await gmailTransporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`✅ [GMAIL] Email sent successfully! Message ID: ${info.messageId}`);
    console.log(`${'='.repeat(60)}\n`);
    return true;
  } catch (error) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ [EMAIL SERVICE] FAILED TO SEND EMAIL`);
    console.error(`  Recipient: ${options.to}`);
    console.error(`  Subject: ${options.subject}`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`  Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
    console.error(`${'='.repeat(60)}\n`);
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

export function generateVerificationEmailHtml(username: string, verificationLink: string): string {
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
          <h2>✅ Verify Your Email Address</h2>
        </div>
        <div class="content">
          <p>Hi ${username},</p>
          <p>Thank you for registering with Campus Ratings! Please click the button below to verify your email address and activate your account.</p>
          <a href="${verificationLink}" class="button">Verify Email Address</a>
          <p>Once verified, you'll be able to log in and start exploring.</p>
          <p>If you didn't create this account, please ignore this email.</p>
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
