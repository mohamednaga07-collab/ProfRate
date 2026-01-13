import nodemailer from "nodemailer";

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || "mohamednaga07@gmail.com";
const EMAIL_PASSWORD = (process.env.EMAIL_PASSWORD || "ytwzsquhkukwldpc").replace(/\s/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || `ProfRate Support <onboarding@resend.dev>`;

// Resend configuration (preferred for production - simple API)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use a verified domain if provided, else fall back to Resend onboarding domain
// IMPORTANT: Resend requires a verified domain to send FROM your own domain.
// If you haven't verified profrate.com, this will fail.
const RESEND_FROM = process.env.RESEND_FROM || 'ProfRate <onboarding@resend.dev>';
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
// Port 587 with secure: false is often more reliable on cloud providers
const gmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
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
    console.log(`[EMAIL SERVICE] Initializing email dispatch`);
    console.log(`  To: ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Using Resend: ${USE_RESEND}`);
    console.log(`${'='.repeat(60)}\n`);

    // Try Gmail first as primary (allows custom profile picture via Google Account)
    console.log(`[GMAIL] Starting Gmail SMTP send...`);
    try {
      const info = await gmailTransporter.sendMail({
        from: `ProfRate Support <${EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log(`✅ [GMAIL] Email sent successfully! Message ID: ${info.messageId}`);
      console.log(`${'='.repeat(60)}\n`);
      return true;
    } catch (gmailError: any) {
      console.error(`\n❌ [GMAIL] Failed:`, gmailError.message || gmailError);
      console.log(`[RESEND FALLBACK] Gmail unavailable. Attempting Resend API fallback for ${options.to}...`);
    }

    // Fallback to Resend if Gmail fails
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

        let responseData: any;
        try {
          responseData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          throw new Error(`Failed to parse Resend response: ${text}`);
        }
        
        if (!response.ok) {
          const errorMessage = responseData?.message || responseData?.error || 'Unknown error';
          throw new Error(`Resend API error: ${response.status} - ${errorMessage}`);
        }
        
        console.log(`✅ [RESEND] Email sent successfully! ID: ${responseData.id}`);
        console.log(`${'='.repeat(60)}\n`);
        return true;
      } catch (resendError: any) {
        console.error(`\n❌ [RESEND] Failed:`, resendError.message || resendError);
      }
    }
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
  const supportAvatarUrl = logoUrl; // Use official logo as support avatar for branding consistency
  
  // CRITICAL: Prevent email clipping by skipping giant base64 images
  // Gmail clips at 102KB. A base64 image can easily exceed this.
  let safeProfileImage = profileImageUrl;
  if (profileImageUrl && profileImageUrl.startsWith('data:') && profileImageUrl.length > 30000) {
    console.log(`[Email] Skipping oversized base64 profile image (${Math.round(profileImageUrl.length/1024)}KB) to prevent Gmail clipping.`);
    safeProfileImage = null; // Don't include it in email if it's too big
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
        .wrapper { background-color: #f8fafc; padding: 40px 20px; }
        .container { max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: white; padding: 35px 20px; text-align: center; }
        .logo { width: 50px; height: 50px; margin-bottom: 12px; border-radius: 10px; background: white; padding: 4px; }
        .content { padding: 35px 30px; }
        .welcome-text { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
        .message { font-size: 16px; color: #334155; margin-bottom: 24px; margin-top: 24px; line-height: 1.7; }
        .button-container { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 38px; text-decoration: none !important; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); }
        .sender-info { display: flex; align-items: center; gap: 12px; margin-top: 30px; padding-top: 25px; border-top: 1px solid #f1f5f9; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 25px; background-color: #fcfcfc; }
        .link-text { word-break: break-all; color: #cbd5e1; font-size: 10px; margin-top: 15px; }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div class="wrapper" style="background-color: #f8fafc; padding: 30px 15px;">
        <div class="container" style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e1e8f0;">
          <div class="header" style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 45px 20px; text-align: center; border-bottom: 4px solid #f1f5f9;">
            <div style="background: white; width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <img src="${logoUrl}" alt="ProfRate Logo" style="width: 48px; height: 48px; display: block; margin: auto;">
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${title}</h1>
          </div>
          <div class="content" style="padding: 35px 25px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                ${profileImageCell}
                <td style="vertical-align: middle;">
                  <h2 class="welcome-text" style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">Hi ${username},</h2>
                </td>
              </tr>
            </table>
            
            <div class="message" style="font-size: 16px; color: #334155; margin-bottom: 24px; margin-top: 24px; line-height: 1.7;">
              ${contentHtml}
            </div>
            
            ${buttonLink ? `
            <div class="button-container" style="text-align: center; margin: 35px 0;">
              <a href="${buttonLink}" class="button" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 40px; text-decoration: none !important; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                ${buttonText}
              </a>
            </div>
            ` : ""}
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
              <tr>
                <td style="width: 45px;">
                  <img src="${supportAvatarUrl}" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e2e8f0; background: #ffffff; padding: 2px;" alt="ProfRate Support">
                </td>
                <td style="padding-left: 12px;">
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">ProfRate Support</p>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">The official voice of Campus Ratings</p>
                </td>
              </tr>
            </table>

            <p style="font-size: 13px; color: #94a3b8; margin-top: 25px; line-height: 1.5;">${footerMessage}</p>
          </div>
          <div class="footer" style="font-size: 12px; color: #94a3b8; text-align: center; padding: 25px; background-color: #fcfcfc;">
            <p style="margin: 0;">© 2026 <strong>ProfRate</strong>. All rights reserved.</p>
            ${buttonLink ? `<div class="link-text" style="word-break: break-all; color: #cbd5e1; font-size: 10px; margin-top: 15px;">Link not working? Copy & paste:<br>${buttonLink}</div>` : ""}
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
    contentHtml: `We received a request to reset your password for your <strong>Campus Ratings (ProfRate)</strong> account. Click the button below to set a new password:`,
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
    contentHtml: `Thank you for joining <strong>ProfRate (Campus Ratings)</strong>! We're excited to have you in our community. Please verify your email address to activate your account:`,
    buttonLink: verificationLink,
    buttonText: "Verify Email Address",
    footerMessage: "Once verified, you'll have full access to rate professors and join the discussion."
  });
}

export function generateForgotUsernameEmailHtml(username: string, loginLink?: string, profileImageUrl?: string | null): string {
  return generateBaseEmailHtml({
    title: "Your Username",
    username: "Account Holder",
    profileImageUrl,
    contentHtml: `We received a request for your username on Campus Ratings. Your username is: <br><br><span style="background: #f1f5f9; padding: 12px 20px; border-radius: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: 700; color: #1e293b; border: 1px solid #e2e8f0; display: inline-block;">${username}</span><br><br>You can now use this to sign in to your account.`,
    buttonLink: loginLink,
    buttonText: "Login Now",
    footerMessage: "If you didn't request this information, please ignore this email."
  });
}
