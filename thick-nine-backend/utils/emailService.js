// utils/emailService.js

exports.sendVerificationEmail = async (toEmail, token) => {
  if (!toEmail || !token) {
    throw new Error('Missing parameters: toEmail and token are required');
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.BASE_URL;

  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY not set in environment variables');
    throw new Error('Missing Resend API credentials');
  }

  if (!baseUrl) {
    console.error('❌ BASE_URL not set in environment variables');
    throw new Error('BASE_URL not set in environment variables');
  }

  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  try {
    console.log(`📤 Sending HTTP API email via Resend to: ${toEmail}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Resend free tier requires sending from onboarding@resend.dev until you verify a custom domain
        from: 'Thick 9 Security <onboarding@resend.dev>',
        to: toEmail,
        subject: 'Verify Your Thick 9 Account',
        text: `Welcome to Thick 9!\n\nClick to verify: ${verificationUrl}\n\nExpires in 24h.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #18181b;">Welcome to Thick 9!</h2>
            <p style="color: #4b5563;">Thank you for registering. Please verify your email:</p>
            <div style="text-align:center; margin:30px 0;">
              <a href="${verificationUrl}" style="background:#2563eb; color:white; padding:14px 32px; text-decoration:none; border-radius:6px; font-weight:bold; display:inline-block;">Verify Email</a>
            </div>
            <p style="color:#666; font-size:13px;">Link expires in 24 hours.</p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Resend API error: ${response.status}`);
    }

    console.log('✅ Verification email sent successfully via Resend. ID:', data.id);
    return data;

  } catch (error) {
    console.error('❌ Resend Send Error:', error.message);
    throw error;
  }
};