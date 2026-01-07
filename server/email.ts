import nodemailer from "nodemailer";

// Email configuration - customize these with your email service credentials
const EMAIL_USER = process.env.EMAIL_USER || "your-email@gmail.com";
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "your-app-password";
const EMAIL_FROM = process.env.EMAIL_FROM || "Campus Ratings <noreply@campusratings.com>";

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  // Add timeouts to prevent hanging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,   // 10 seconds
  socketTimeout: 10000,     // 10 seconds
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error("⚠️  Email service not configured:", error.message);
    console.log("💡 To enable email sending:");
    console.log("   1. Create a Gmail account or use existing one");
    console.log("   2. Enable 2-Factor Authentication");
    console.log("   3. Generate an App Password at: https://myaccount.google.com/apppasswords");
    console.log("   4. Set environment variables:");
    console.log("      EMAIL_USER=your-email@gmail.com");
    console.log("      EMAIL_PASSWORD=your-app-password");
  } else {
    console.log("✅ Email service connected successfully");
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Check if credentials are configured
    if (EMAIL_USER === "your-email@gmail.com" || EMAIL_PASSWORD === "your-app-password") {
      console.log(`📧 Email not configured. Would send to ${options.to}:`);
      console.log(`   Subject: ${options.subject}`);
      
      // In production, we should probably let the user know email isn't working
      if (process.env.NODE_ENV === "production") {
        throw new Error("Email service is not configured on the server (using default credentials)");
      }
      
      return true; // Return success in dev mode
    }

    console.log(`📨 Attempting to send email to: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`✅ Email sent successfully to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${options.to}:`, error instanceof Error ? error.message : error);
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
