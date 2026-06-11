const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Add these two imports to the top of your controllers/authController.js file:
const crypto = require('crypto');
const emailService = require('../utils/emailService');

// REGISTER A NEW USER (Production-Ready for Thick 9)
exports.register = async (req, res) => {
    try {
        // 1. Destructure the NEW fields from your mandatory-CLIENT form
        const { fullName, email, password, role, gender, country, referralCode } = req.body;

        // 2. Check if email already exists (Updated to match frontend's 'message' expectation)
        let userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        // 3. Generate and Verify Unique Username (Your existing while-loop logic)
        let baseUsername = email.split('@')[0].toLowerCase();
        let finalUsername = baseUsername;
        let isUnique = false;

        while (!isUnique) {
            const existingName = await User.findOne({ username: finalUsername });
            if (existingName) {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                finalUsername = `${baseUsername}${randomSuffix}`;
            } else {
                isUnique = true; 
            }
        }

        // 4. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Create the user instance
        const newUser = new User({
            fullName: fullName || finalUsername,
            username: finalUsername,
            email,
            password: hashedPassword,
            role: role || 'client',
            gender,           // Mapped from form
            referralCode,     // Mapped from form
            location: {       // Mapped to your nested schema
                country: country || 'Ghana',
                city: 'Accra'
            },
            accountStrength: 50 
        });

        await newUser.save();

        // 6. Generate a Token (JWT)
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Return data for the frontend Header.tsx
        res.status(201).json({ 
            token, 
            user: { 
                id: newUser._id, 
                fullName: newUser.fullName, 
                role: newUser.role,
                accountStrength: newUser.accountStrength
            } 
        });

    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ message: "Server Error during registration" });
    }
};

// LOGIN USER (Keeping your current working version)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        
        if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Strength calculation based on your preference
        const strength = user.planType ? 100 : 50;

        res.json({
            token,
            user: { 
                id: user._id, 
                fullName: user.fullName, 
                role: user.role,
                planType: user.planType,
                accountStrength: strength 
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error during login");
    }
};

// FINALIZE ONBOARDING ACCOUNT (Processes form data & enforces real email verification verification)
exports.finalizeAccount = async (req, res) => {
    try {
        const { fullName, email, password, role, gender, country, referralCode } = req.body;

        // 1. Verify user doesn't already exist
        let userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return res.status(400).json({ msg: "An account with this email already exists." });
        }

        // 2. Generate a clean, unique username from email
        let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let finalUsername = baseUsername;
        let isUnique = false;

        while (!isUnique) {
            const existingName = await User.findOne({ username: finalUsername });
            if (existingName) {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                finalUsername = `${baseUsername}${randomSuffix}`;
            } else {
                isUnique = true;
            }
        }

        // 3. Securely hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. GENERATE SECURE CRYPTO TOKEN FOR EMAIL VERIFICATION
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiryDate = Date.now() + 24 * 60 * 60 * 1000; // Unlocks a strict 24-hour window

        // 5. Calculate a starter profile strength
        const starterStrength = referralCode ? 75 : 65;

        // 6. Create and save the unverified User Document to MongoDB
        const newUser = new User({
            fullName: fullName.trim(),
            username: finalUsername,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role || 'client',
            gender,
            referralCode: referralCode ? referralCode.trim() : undefined,
            location: {
                country: country || 'United States',
                city: 'Pending'
            },
            isProfileComplete: true,
            isEmailVerified: false, // 🔐 Strictly set to false until verification link is clicked!
            verificationToken: emailVerificationToken,
            verificationTokenExpires: tokenExpiryDate,
            accountStrength: starterStrength
        });

        await newUser.save();

        // 7. DISPATCH REAL EMAIL VIA IPAGE SMTP
        try {
            await emailService.sendVerificationEmail(newUser.email, emailVerificationToken);
        } catch (mailError) {
            console.error("⚠️ Background Email Dispatch Error:", mailError.message);
            // We intentionally don't crash the request if the mailer has an initial glitch,
            // but the user remains unverified inside MongoDB.
        }

        // 8. Generate standard access token so frontend can keep them in state
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 9. Send payload back. Frontend will read 'isEmailVerified: false' and route to the cooldown screen
        res.status(201).json({
            token,
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                role: newUser.role,
                accountStrength: newUser.accountStrength,
                isEmailVerified: false
            }
        });

    } catch (err) {
        console.error("Finalize Account Error:", err.message);
        res.status(500).json({ msg: "Critical server error processing account completion." });
    }
};



// VERIFY EMAIL TOKEN (Activates the account when the inbox link is clicked)
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ msg: "Verification token is required." });
        }

        // 1. Find the user with this exact token AND check if the token hasn't expired yet
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() } // $gt means "greater than now"
        });

        // 2. If no user is found, the link is either fake or expired
        if (!user) {
            return res.status(400).json({ 
                msg: "The verification link is invalid or has expired. Please request a new one." 
            });
        }

        // 3. Update user status and wipe out the temporary token fields
        user.isEmailVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        
        // Boost their account profile strength gauge for verifying their email!
        user.calculateStrength(); 

        await user.save();

        // 4. Return success data along with an updated JWT access token
        const newJwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            msg: "Email successfully verified!",
            token: newJwtToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                role: user.role,
                accountStrength: user.accountStrength,
                isEmailVerified: true
            }
        });

    } catch (err) {
        console.error("Verify Email Route Error:", err.message);
        res.status(500).json({ msg: "Server error during email activation." });
    }
};


// RESEND VERIFICATION EMAIL (Generates a fresh token and dispatches a new email link)
exports.resendVerification = async (req, res) => {
    try {
        // req.user.id will come from your auth middleware since the user is logged in but unverified
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: "User account not found." });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ msg: "This email address is already verified." });
        }

        // Generate a brand new fresh token and extend it for another 24 hours
        const newVerificationToken = crypto.randomBytes(32).toString('hex');
        const newTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

        user.verificationToken = newVerificationToken;
        user.verificationTokenExpires = newTokenExpiry;
        await user.save();

        // Dispatch via your custom iPage SMTP server
        await emailService.sendVerificationEmail(user.email, newVerificationToken);

        res.status(200).json({ msg: "A fresh verification link has been sent to your inbox!" });

    } catch (err) {
        console.error("Resend Verification Error:", err.message);
        res.status(500).json({ msg: "Server error while processing your resend request." });
    }
};