// utils/emailService.js
// Resend via fetch (same pattern as verification — do not change working verify flow)

exports.sendVerificationEmail = async (toEmail, token) => {
  if (!toEmail || !token) {
    throw new Error("Missing parameters: toEmail and token are required");
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.BASE_URL;

  if (!resendApiKey) {
    console.error("❌ RESEND_API_KEY is not set");
    throw new Error("Missing Resend API credentials");
  }

  if (!baseUrl) {
    console.error("❌ BASE_URL is not set");
    throw new Error("BASE_URL environment variable is required");
  }

  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    console.log(`📤 Sending email via Resend to: ${toEmail}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Thick 9 Security <onboarding@resend.dev>",
        to: toEmail,
        subject: "Verify Your Thick 9 Account",
        text: `Welcome to Thick 9!\n\nPlease verify your email address by clicking the link below:\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #18181b; text-align: center;">Welcome to Thick 9!</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Thank you for registering. To complete your onboarding and access your dashboard, please verify your email address.
            </p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #2563eb; color: white; padding: 14px 32px;
                        text-decoration: none; font-weight: bold; border-radius: 8px;
                        display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              If you did not create an account on Thick 9, you can safely ignore this email.<br>
              This verification link will expire in 24 hours.
            </p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || `Resend API error (${response.status})`);
    }

    console.log("✅ Verification email sent successfully via Resend. ID:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Resend Send Error:", error.message);
    throw error;
  }
};

/**
 * Shared Resend POST helper (verification stays separate above).
 */
async function sendViaResend({ to, subject, text, html }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("❌ RESEND_API_KEY is not set");
    throw new Error("Missing Resend API credentials");
  }
  if (!to) {
    throw new Error("Missing recipient email");
  }

  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Thick 9 Security <onboarding@resend.dev>";

  console.log(`📤 Sending email via Resend to: ${to} (${subject})`);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: text || "",
      html: html || `<p>${text || ""}</p>`,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Resend API Error:", data);
    throw new Error(data.message || `Resend API error (${response.status})`);
  }

  console.log("✅ Email sent via Resend. ID:", data.id);
  return data;
}

/**
 * Generic send — used as fallback by authController 2FA helper.
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  return sendViaResend({ to, subject, text, html });
};

/**
 * 2FA login OTP — required by authController.sendLoginOtpEmail
 */
exports.sendTwoFactorCode = async (toEmail, code) => {
  if (!toEmail || !code) {
    throw new Error("Missing parameters: toEmail and code are required");
  }

  return sendViaResend({
    to: toEmail,
    subject: "Your Thick 9 login code",
    text: `Your Thick 9 login code is ${code}. It expires in 10 minutes.\n\nIf you did not try to sign in, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #18181b; text-align: center;">Thick 9 login code</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Use this code to finish signing in. It expires in <strong>10 minutes</strong>.
        </p>
        <p style="text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 28px 0; color: #18181b;">
          ${String(code)}
        </p>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          If you did not try to sign in, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};
