const path = require('path');
// Automatically looks back up to find the root folder configuration
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const nodemailer = require('nodemailer');

console.log('--- STARTING RAW SMTP TEST ---');
console.log('User:', process.env.EMAIL_USER || '❌ MISSING (Check .env file)');
console.log('Port:', process.env.EMAIL_PORT || '❌ MISSING (Check .env file)');
console.log('Pass:', process.env.EMAIL_PASS ? '✅ Hidden Code Loaded' : '❌ MISSING (Check .env file)');

/// ✅ CORRECTED TRANSPORTER SETUP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: process.env.EMAIL_PORT === '465', // true if 465, false if 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

const mailOptions = {
    from: `"Thick 9 Test" <${process.env.EMAIL_USER}>`,
    to: 'transboon@gmail.com',
    subject: 'Raw Connection Test',
    text: 'If you see this, the connection worked!'
};

async function executeRawSend() {
    try {
        if (!process.env.EMAIL_PASS || !process.env.EMAIL_USER) {
            console.log('============================');
            console.log('🛑 STOP: Environment variables are empty! Fix your path.');
            process.exit(1);
        }

        console.log('🔄 Attempting direct handshake with Gmail servers...');
        await transporter.verify();
        console.log('✨ Handshake Success! Transporter is ready.');

        console.log('🔄 Sending raw mail payload...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('============================');
        console.log('🎉 CRACKED IT! Email sent safely.');
        console.log('Message ID:', info.messageId);
        process.exit(0);
    } catch (error) {
        console.log('============================');
        console.log('💥 RAW CONTEXT CRASH HIT');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

executeRawSend();