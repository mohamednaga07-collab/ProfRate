import nodemailer from "nodemailer";

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || "mohamednaga07@gmail.com";
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "ytwzsquhkukwldpc").replace(/\s/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || `ProfRate Support <noreply@profrate.com>`;

// Resend configuration (preferred for production - simple API)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use a verified domain if provided, else fall back to Resend onboarding domain
const RESEND_FROM = process.env.RESEND_FROM || 'ProfRate Support <noreply@profrate.com>';
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
      console.log(`  API Key: ${RESEND_API_KEY ? '✓ Present' : '✗ MISSING'}`);
      console.log(`  From: ${RESEND_FROM}`);
      console.log(`  Reply-To: ${EMAIL_USER}`);
      console.log(`  To: ${options.to}`);
      
      try {
        const payload = {
          from: RESEND_FROM,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: EMAIL_USER,
        };
        
        console.log(`[RESEND] Preparing fetch request...`);
        console.log(`[RESEND] URL: https://api.resend.com/emails`);
        console.log(`[RESEND] Method: POST`);
        console.log(`[RESEND] Headers: Authorization: Bearer ${RESEND_API_KEY?.substring(0, 10)}..., Content-Type: application/json`);
        
        // Create a controller for the timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        clearTimeout(timeoutId);

        console.log(`[RESEND] Fetch completed, status: ${response.status}`);
        
        let responseData: any;
        try {
          responseData = await response.json();
          console.log(`[RESEND] Response JSON parsed successfully`);
        } catch (parseError) {
          console.error(`[RESEND] Failed to parse response JSON:`, parseError);
          const text = await response.text();
          console.error(`[RESEND] Raw response text:`, text);
          throw new Error(`Failed to parse Resend response: ${text}`);
        }
        
        console.log(`[RESEND] Response status: ${response.status}`);
        console.log(`[RESEND] Response data:`, JSON.stringify(responseData, null, 2));
        
        if (!response.ok) {
          const errorMessage = responseData?.message || responseData?.error || 'Unknown error';
          console.error(`[RESEND] ❌ API Error - Status: ${response.status}, Message: ${errorMessage}`);
          throw new Error(`Resend API error: ${response.status} - ${errorMessage}`);
        }
        
        if (!responseData.id) {
          console.error(`[RESEND] ❌ No email ID in response - response data:`, responseData);
          throw new Error(`Resend API didn't return email ID`);
        }
        
        console.log(`✅ [RESEND] Email sent successfully! ID: ${responseData.id}`);
        console.log(`${'='.repeat(60)}\n`);
        return true;
      } catch (resendError: any) {
        console.error(`\n❌ [RESEND] Failed:`, resendError.message || resendError);
        console.error(`[RESEND] Error type:`, resendError.constructor.name);
        console.error(`[RESEND] Full error:`, resendError);
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
        .header { background: #f8fafc; padding: 20px; text-align: center; border-bottom: 2px solid #667eea; }
        .logo { max-height: 50px; margin-bottom: 10px; }
        .content { padding: 30px 20px; background: #ffffff; }
        .button { display: inline-block; background: #667eea; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: bold; border: 1px solid #5a6fd6; }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .link-text { font-size: 12px; color: #999; word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://campus-ratings.onrender.com/favicon.png" alt="ProfRate Logo" class="logo">
          <h2 style="color: #333; margin: 0;">ProfRate Security</h2>
        </div>
        <div class="content">
          <p>Hi ${username},</p>
          <p>We received a request to reset your password. Click the secure button below to create a new password.</p>
          <center>
            <a href="${resetLink}" class="button">Reset My Password</a>
          </center>
          <p>This link will expire in 24 hours.</p>
          <p style="margin-top: 30px; font-size: 13px; color: #666;">If you didn't request a password reset, you can safely ignore this email.</p>
          
          <div style="margin-top: 40px; border-top: 1px solid #f0f0f0; padding-top: 20px;">
            <p class="link-text">Button not working? Copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
            </p>
          </div>
        </div>
        <div class="footer">
          <p>© 2026 ProfRate (Campus Ratings). All rights reserved.</p>
          <p>Secure System Message</p>
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { background-color: #f8fafc; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 20px; text-align: center; }
        .logo { width: 64px; height: 64px; margin-bottom: 16px; border-radius: 12px; }
        .content { padding: 40px 30px; }
        .welcome-text { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .footer { font-size: 13px; color: #64748b; text-align: center; padding: 30px; border-top: 1px solid #e2e8f0; }
        .link-text { word-break: break-all; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="https://campus-ratings.onrender.com/favicon.png" alt="ProfRate Header" class="logo">
            <h1 style="margin: 0; font-size: 24px;">Welcome to ProfRate</h1>
          </div>
          <div class="content">
            <h2 class="welcome-text">Hi ${username},</h2>
            <p>Thank you for joining <strong>ProfRate (Campus Ratings)</strong>! We're excited to have you in our community.</p>
            <p>To get started, please verify your email address by clicking the high-speed link below:</p>
            <div class="button-container">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            <p>Once verified, you'll have full access to rate professors, view analytics, and help fellow students.</p>
            <p style="font-size: 14px; color: #64748b; margin-top: 24px;">If you didn't sign up for an account, you can safely ignore this email.</p>
            
            <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              <p class="link-text">Button not working? Copy and paste this link into your browser:<br>
              <a href="${verificationLink}" style="color: #2563eb;">${verificationLink}</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 ProfRate. Built for Students.</p>
            <p>Campus Ratings System Message</p>
          </div>
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
