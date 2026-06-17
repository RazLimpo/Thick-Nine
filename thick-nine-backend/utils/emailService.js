// utils/emailService.js
const nodemailer = require('nodemailer');

// Lazy-load transporter to ensure .env is loaded
let transporter = null;

function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailPort = parseInt(process.env.EMAIL_PORT || '465', 10);
  
  if (!emailUser || !emailPass) {
    console.error('❌ EMAIL_USER or EMAIL_PASS not set in environment variables');
    throw new Error('Missing email credentials in environment');
  }

  const isSecurePort = emailPort === 465;

  const config = {
    host: 'smtp.gmail.com',
    port: emailPort,
    secure: isSecurePort,  // true for 465, false for 587
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 5000,
    socketTimeout: 5000,
    greetingTimeout: 5000,
    debug: true,
    logger: true,
  };

  console.log(`📧 Creating transporter: ${emailUser} on port ${emailPort} (secure: ${isSecurePort})`);
  return nodemailer.createTransport(config);
}

function getTransporter() {
  if (!transporter) {
    try {
      transporter = createTransporter();
      
      // Non-blocking verification
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Transporter verification failed:', error.message);
          transporter = null; // Reset on failure
        } else if (success) {
          console.log(`✅ Transporter ready (Gmail SMTP on port ${process.env.EMAIL_PORT || 465})`);
        }
      });
    } catch (err) {
      console.error('❌ Failed to create transporter:', err.message);
      throw err;
    }
  }
  return transporter;
}

exports.sendVerificationEmail = async (toEmail, token) => {
  if (!toEmail || !token) {
    throw new Error('Missing parameters: toEmail and token are required');
  }

  try {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error('BASE_URL not set in environment variables');
    }

    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

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

    const mailer = getTransporter();
    console.log(`📤 Sending email to: ${toEmail}`);
    
    const info = await mailer.sendMail(mailOptions);
    
    console.log('✅ Verification email sent successfully. Message ID:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Send Error:', error.message);
    throw error;
  }
};
