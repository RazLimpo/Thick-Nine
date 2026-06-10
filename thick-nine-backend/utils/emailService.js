const nodemailer = require('nodemailer');

// 1. Initialize the Outgoing Mail Transporter using your iPage Settings
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: true, // true for port 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Helps prevent connection rejections from shared hosting mail relays
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Sends a stylized verification link to a newly registered user.
 * @param {string} toEmail - The user's target inbox address
 * @param {string} token - The unique crypto validation token
 */
exports.sendVerificationEmail = async (toEmail, token) => {
    try {
        // Construct the click target pointing directly back to your live Vercel application
        const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${token}`;

        const mailOptions = {
            from: `"Thick 9 Security" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Verify Your Thick 9 Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
                    <h2 style="color: #18181b; text-align: center;">Welcome to Thick 9!</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Thank you for registering. To access your marketplace dashboard and finalize your onboarding, please confirm your email address by clicking the button below:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 40px;">
                        If you did not create an account on Thick 9, you can safely ignore this email. This verification link will expire in 24 hours.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Failed to send verification email via iPage SMTP:', error.message);
        throw new Error('Email delivery system error.');
    }
};