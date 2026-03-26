import nodemailer from "nodemailer";
import { google } from "googleapis";

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "").replace(/\s/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || `ProfRate <${EMAIL_USER || 'noreply@profrate.com'}>`;

// Gmail API Configuration (Overrides standard SMTP on restricted hosts like Render)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Resend configuration (primary on cloud providers)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'ProfRate <onboarding@resend.dev>';
const USE_RESEND = !!RESEND_API_KEY;

// Initialize Gmail API client if credentials are present
let gmailClient: any = null;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN && EMAIL_USER) {
  try {
    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    gmailClient = google.gmail({ version: "v1", auth: oAuth2Client });
    console.log(`[Email Setup] Gmail HTTPS API configured successfully for ${EMAIL_USER}`);
  } catch (err) {
    console.error("[Email Setup] Failed to initialize Gmail API client:", err);
  }
}

console.log("[Email Setup] Initializing with:");
console.log(`  EMAIL_USER: ${EMAIL_USER}`);
console.log(`  Using Resend: ${USE_RESEND}`);
if (USE_RESEND) {
  console.log(`  Resend API Key: ${RESEND_API_KEY?.substring(0, 5)}...`);
  console.log(`  Resend From: ${RESEND_FROM}`);
} else if (gmailClient) {
  console.log(`  Using Gmail REST API (Bypasses SMTP blocks)`);
} else {
  console.log(`  ⚠️  Neither Gmail API nor Resend configured - falling back to NodeMailer SMTP (might fail on Render Free tier)`);
}

// Create Gmail transporter as fallback
const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
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
    console.log(`[EMAIL SERVICE] Dispatching to: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);

    // 0. Try Gmail HTTPS API FIRST (Bypasses Render SMTP port blocking)
    if (gmailClient) {
      console.log(`[GMAIL API] Attempting HTTPS delivery (bypassing SMTP blocks)...`);
      try {
        const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
        const messageParts = [
          `From: ${EMAIL_FROM}`,
          `To: ${options.to}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          options.html,
        ];
        const message = messageParts.join('\n');
        
        // The Gmail API requires a base64url encoded string
        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
  
        const response = await gmailClient.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });
  
        console.log(`✅ [GMAIL API] Success! Message ID: ${response.data.id}`);
        return true;
      } catch (gmailApiError: any) {
        console.error(`❌ [GMAIL API] Error:`, gmailApiError.message || gmailApiError);
      }
    }
    
    // 1. Try Resend NEXT
    if (USE_RESEND) {
      console.log(`[RESEND] Attempting Resend API delivery...`);
      try {
        const payload = {
          from: RESEND_FROM,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: EMAIL_USER,
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

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

        if (response.ok) {
          const data: any = await response.json();
          console.log(`✅ [RESEND] Success! ID: ${data.id}`);
          return true;
        } else {
          const errorText = await response.text();
          console.error(`❌ [RESEND] API Error: ${response.status} - ${errorText}`);
        }
      } catch (resendError: any) {
        console.error(`❌ [RESEND] Network/Fetch Error:`, resendError.message || resendError);
      }
    }

    // 2. Fallback to Gmail SMTP (will fail on Render Free tier due to port 587 block)
    if (EMAIL_USER && EMAIL_PASSWORD) {
      console.log(`[GMAIL SMTP] Attempting SMTP fallback...`);
      try {
        const info = await gmailTransporter.sendMail({
          from: EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        console.log(`✅ [GMAIL SMTP] Success! Message ID: ${info.messageId}`);
        return true;
      } catch (gmailError: any) {
        console.error(`❌ [GMAIL SMTP] Error:`, gmailError.message || gmailError);
      }
    }

    console.error(`❌ [EMAIL SERVICE] All delivery methods failed or were not configured.`);
    return false;
  } catch (error) {
    console.error(`❌ [EMAIL SERVICE] Unexpected Error:`, error);
    return false;
  }
}

// Unified Email Theme Helper
function generateBaseEmailHtml({
  title,
  username,
  profileImageUrl,
  contentHtml,
  buttonLink,
  buttonText,
  footerMessage = "If you didn't request this, you can safely ignore this email."
}: {
  title: string;
  username: string;
  profileImageUrl?: string | null;
  contentHtml: string;
  buttonLink?: string;
  buttonText?: string;
  footerMessage?: string;
}) {
  const logoUrl = "https://raw.githubusercontent.com/mohamednaga07-collab/ProfRate/main/client/public/favicon.png";
  const supportAvatarUrl = logoUrl;
  
  let safeProfileImage = profileImageUrl;
  if (profileImageUrl && profileImageUrl.startsWith('data:') && profileImageUrl.length > 30000) {
    safeProfileImage = null; 
  }

  const profileImageCell = safeProfileImage 
    ? `<td style="padding-right: 15px; width: 60px;">
         <img src="${safeProfileImage}" style="width: 50px; height: 50px; border-radius: 25px; object-fit: cover; border: 2px solid #e2e8f0; display: block;" alt="${username}">
       </td>`
    : `<td style="padding-right: 15px; width: 60px;">
         <div style="width: 50px; height: 50px; border-radius: 25px; background: #3b82f6; color: #ffffff; text-align: center; line-height: 50px; font-weight: bold; font-size: 20px;">${username.charAt(0).toUpperCase()}</div>
       </td>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
        .wrapper { background-color: #f1f5f9; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 60px 20px; text-align: center; }
        .logo-img { width: 80px; height: 80px; margin-bottom: 20px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .content { padding: 40px 30px; }
        .greeting-table { margin-bottom: 30px; }
        .user-avatar { width: 48px; height: 48px; border-radius: 24px; object-fit: cover; border: 3px solid #f1f5f9; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .user-initials { width: 48px; height: 48px; border-radius: 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-align: center; line-height: 48px; font-weight: 700; font-size: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .greeting-text { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .main-text { font-size: 16px; color: #475569; margin: 0 0 30px 0; }
        .cta-container { text-align: center; margin: 40px 0; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 16px 48px; text-decoration: none !important; border-radius: 14px; font-weight: 700; font-size: 16px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
        .footer { font-size: 13px; color: #94a3b8; text-align: center; padding: 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; }
        .footer-links { margin-top: 15px; }
        .footer-link { color: #3b82f6; text-decoration: none; margin: 0 10px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" class="logo-img" alt="ProfRate Logo">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: -0.025em;">${title}</h1>
          </div>
          <div class="content">
            <table class="greeting-table" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 64px;">
                  ${safeProfileImage 
                    ? `<img src="${safeProfileImage}" class="user-avatar" alt="${username}">`
                    : `<div class="user-initials">${username.charAt(0).toUpperCase()}</div>`
                  }
                </td>
                <td style="padding-left: 16px;">
                  <h2 class="greeting-text">Hi ${username},</h2>
                </td>
              </tr>
            </table>
            
            <div class="main-text">${contentHtml}</div>
            
            ${buttonLink ? `
              <div class="cta-container">
                <a href="${buttonLink}" class="button">${buttonText}</a>
              </div>
            ` : ""}
            
            <p style="font-size: 14px; color: #64748b; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              ${footerMessage}
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0; font-weight: 600;">© 2026 ProfRate. All rights reserved.</p>
            <div class="footer-links">
              <a href="https://profrate.onrender.com" class="footer-link">Website</a>
              <a href="mailto:support@profrate.com" class="footer-link">Support</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateForgotPasswordEmailHtml(username: string, resetLink: string, profileImageUrl?: string | null): string {
  return generateBaseEmailHtml({
    title: "Reset Your Password",
    username,
    profileImageUrl,
    contentHtml: `We received a request to reset your password. Click the button below to set a new password:`,
    buttonLink: resetLink,
    buttonText: "Reset Password",
    footerMessage: "This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email."
  });
}

export function generateVerificationEmailHtml(username: string, verificationLink: string, profileImageUrl?: string | null): string {
  return generateBaseEmailHtml({
    title: "Verify Your Email",
    username,
    profileImageUrl,
    contentHtml: `Thank you for joining ProfRate! Please verify your email address to activate your account:`,
    buttonLink: verificationLink,
    buttonText: "Verify Email Address",
    footerMessage: "Once verified, you'll have full access to rate professors."
  });
}

export function generateForgotUsernameEmailHtml(username: string, loginLink?: string, profileImageUrl?: string | null): string {
  return generateBaseEmailHtml({
    title: "Your Username",
    username: "Account Holder",
    profileImageUrl,
    contentHtml: `Your username is: <br><br><strong>${username}</strong><br><br>You can now use this to sign in to your account.`,
    buttonLink: loginLink,
    buttonText: "Login Now",
    footerMessage: "If you didn't request this information, please ignore this email."
  });
}
