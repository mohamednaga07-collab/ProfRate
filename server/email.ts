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
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
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
          
          // If Resend fails due to unverified email/unauthorized (standard for onboarding mode),
          // throw an error to trigger the Gmail fallback.
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
        console.log(`[GMAIL FALLBACK] Resend unavailable or restricted. Attempting Gmail SMTP fallback for ${options.to}...`);
      }
    }

    // Fallback to Gmail
    console.log(`[GMAIL] Starting Gmail SMTP send...`);
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
  
  // Use a simple table for the welcome section to ensure compatibility with all email clients
  const profileImageCell = profileImageUrl 
    ? `<td style="padding-right: 15px; width: 60px;">
         <img src="${profileImageUrl}" style="width: 50px; height: 50px; border-radius: 25px; object-fit: cover; border: 2px solid #e2e8f0; display: block;" alt="${username}">
       </td>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { background-color: #f8fafc; padding: 40px 20px; }
        .container { max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 20px; text-align: center; }
        .logo { width: 56px; height: 56px; margin-bottom: 16px; border-radius: 12px; }
        .content { padding: 40px 32px; }
        .welcome-text { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0; }
        .message { font-size: 16px; color: #475569; margin-bottom: 24px; margin-top: 24px; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 34px; text-decoration: none !important; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3); }
        .footer { font-size: 13px; color: #64748b; text-align: center; padding: 30px; border-top: 1px solid #f1f5f9; background-color: #fcfcfc; }
        .link-text { word-break: break-all; color: #94a3b8; font-size: 11px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="ProfRate Header" class="logo">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </div>
          <div class="content">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                ${profileImageCell}
                <td style="vertical-align: middle;">
                  <h2 class="welcome-text">Hi ${username},</h2>
                </td>
              </tr>
            </table>
            
            <div class="message">
              ${contentHtml}
            </div>
            
            ${buttonLink ? `
            <div class="button-container">
              <a href="${buttonLink}" class="button">${buttonText}</a>
            </div>
            ` : ""}
            
            <p style="font-size: 14px; color: #64748b; margin-top: 24px;">${footerMessage}</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© 2026 <strong>ProfRate</strong>. Campus Ratings for Students.</p>
            ${buttonLink ? `<div class="link-text">Button not working? Copy and paste this link:<br>${buttonLink}</div>` : ""}
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
    title: "Welcome to ProfRate",
    username,
    profileImageUrl,
    contentHtml: `Thank you for joining <strong>ProfRate (Campus Ratings)</strong>! We're excited to have you in our community. To get started, please verify your email address by clicking the high-speed link below:`,
    buttonLink: verificationLink,
    buttonText: "Verify Email Address",
    footerMessage: "Once verified, you'll have full access to rate professors, view analytics, and help fellow students."
  });
}

export function generateForgotUsernameEmailHtml(username: string, profileImageUrl?: string | null): string {
  return generateBaseEmailHtml({
    title: "Your Username",
    username: "Account Holder",
    profileImageUrl,
    contentHtml: `We received a request for your username on Campus Ratings. Your username is: <br><br><span style="background: #f1f5f9; padding: 12px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; color: #1e293b; border: 1px solid #e2e8f0; display: inline-block;">${username}</span><br><br>You can use this to sign in to your account.`,
    footerMessage: "If you didn't request this information, please ignore this email."
  });
}
