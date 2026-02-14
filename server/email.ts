import nodemailer from "nodemailer";

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "").replace(/\s/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || `ProfRate Support <${EMAIL_USER || 'noreply@campus-ratings.com'}>`;

// Resend configuration (primary on cloud providers)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'ProfRate <onboarding@resend.dev>';
const USE_RESEND = !!RESEND_API_KEY;

console.log("[Email Setup] Initializing with:");
console.log(`  EMAIL_USER: ${EMAIL_USER}`);
console.log(`  Using Resend: ${USE_RESEND}`);
if (USE_RESEND) {
  console.log(`  Resend API Key: ${RESEND_API_KEY?.substring(0, 5)}...`);
  console.log(`  Resend From: ${RESEND_FROM}`);
} else {
  console.log(`  ⚠️  RESEND_API_KEY not set - will fall back to Gmail (might fail on Render Free tier)`);
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
    
    // 1. Try Resend FIRST (API based, works on Render Free/Cloud)
    if (USE_RESEND) {
      console.log(`[RESEND] Attempting delivery...`);
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

    // 2. Fallback to Gmail SMTP (might be blocked on Render Free)
    if (EMAIL_USER && EMAIL_PASSWORD) {
      console.log(`[GMAIL] Attempting SMTP fallback...`);
      try {
        const info = await gmailTransporter.sendMail({
          from: EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        console.log(`✅ [GMAIL] Success! Message ID: ${info.messageId}`);
        return true;
      } catch (gmailError: any) {
        console.error(`❌ [GMAIL] SMTP Error:`, gmailError.message || gmailError);
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
  const logoUrl = "https://campus-ratings.onrender.com/favicon.png";
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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { background-color: #f8fafc; padding: 30px 15px; }
        .container { max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 45px 20px; text-align: center; }
        .content { padding: 35px 25px; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 40px; text-decoration: none !important; border-radius: 12px; font-weight: 600; font-size: 16px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 25px; background-color: #fcfcfc; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${title}</h1>
          </div>
          <div class="content">
            <table width="100%">
              <tr>
                ${profileImageCell}
                <td><h2 style="margin: 0;">Hi ${username},</h2></td>
              </tr>
            </table>
            <div style="margin: 25px 0;">${contentHtml}</div>
            ${buttonLink ? `<div style="text-align: center;"><a href="${buttonLink}" class="button">${buttonText}</a></div>` : ""}
            <p style="font-size: 13px; color: #94a3b8; margin-top: 25px;">${footerMessage}</p>
          </div>
          <div class="footer">
            <p>© 2026 ProfRate. All rights reserved.</p>
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
