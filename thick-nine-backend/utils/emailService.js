// utils/emailService.js
const nodemailer = require('nodemailer');

// 1. Initialize the Outgoing Mail Transporter using secure port 465 SSL settings
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,           
  secure: true,        // Must be true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Make sure spaces are removed!
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  socketTimeout: 12000,
  debug: true,
  logger: true,
});

// Self-verify the handshake connection on file startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Transporter failed:', error.message);
  } else {
    console.log('✅ Transporter ready (using port 465)');
  }
});

exports.sendVerificationEmail = async (toEmail, token) => {
  if (!toEmail || !token) throw new Error('Missing parameters');

  try {
    // Fixed string interpolation syntax
    const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Thick 9 Security" <${process.env.EMAIL_USER}>`,
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
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return info;

  } catch (error) {
    console.error('Send Error:', error.message);
    throw error;
  }
};