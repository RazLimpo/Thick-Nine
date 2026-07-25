// ==========================================
// FILE: controllers/authController.js (PART 1 OF 2)
// ==========================================

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../utils/emailService');

/**
 * COMPATIBILITY HELPER: formatUserPayload
 * Ensures every auth response consistently delivers complete user metadata required
 * by Next.js components. Includes full fallback support for both `avatar` and `profilePicture`,
 * stringifies MongoDB IDs, and delegates location defaults directly to the User schema.
 */
const formatUserPayload = (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    
    // Resolve avatar / profilePicture compatibility
    const userAvatar = userObj.avatar || userObj.profilePicture || '';
    const userProfilePicture = userObj.profilePicture || userObj.avatar || '';

    return {
        id: userObj._id?.toString(), // Safely stringifies ObjectId for Next.js
        fullName: userObj.fullName,
        displayName: userObj.displayName || userObj.fullName, // Model field or fallback
        username: userObj.username,
        email: userObj.email,
        gender: userObj.gender,
        role: userObj.role || 'client',
        planType: userObj.planType || 'free',
        accountStrength: userObj.accountStrength || 50,
        isEmailVerified: Boolean(userObj.isEmailVerified),
        isProfileComplete: Boolean(userObj.isProfileComplete),
        avatar: userAvatar,
        profilePicture: userProfilePicture,
        location: userObj.location || { country: '', city: '' } // 🔑 Guarantees object shape so frontend keys never crash
    };
};

/**
 * @route   POST /api/auth/register
 * @desc    REGISTER A NEW USER (Maintained for Backwards Compatibility)
 * @access  Public
 */
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, role, gender, country, referralCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Email Normalization
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check existing user
        let userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 2. Generate and Verify Unique Username
        let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '').toLowerCase();
        if (!baseUsername) baseUsername = 'user';
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

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create User Document (Delegates location defaults to User schema if country is unpassed)
        const newUser = new User({
            fullName: fullName ? fullName.trim() : finalUsername,
            username: finalUsername,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'client',
            gender,
            referralCode: referralCode ? referralCode.trim() : undefined,
            ...(country && { location: { country } }) // Lets schema defaults supply missing fields
        });

        // 5. Calculate account strength on model instance before initial save
        if (typeof newUser.calculateStrength === 'function') {
            newUser.calculateStrength();
        } else {
            newUser.accountStrength = 50;
        }

        await newUser.save();

        // 6. Generate JWT Token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.status(201).json({ 
            token, 
            user: formatUserPayload(newUser)
        });

    } catch (err) {
        console.error("Register Error:", err.message);
        return res.status(500).json({ message: "Server Error during registration" });
    }
};



/**
 * @route   POST /api/auth/finalize-account
 * @desc    FINALIZE ONBOARDING ACCOUNT (Enforces Email Verification Workflow)
 * @access  Public
 */
exports.finalizeAccount = async (req, res) => {
    try {
        const { fullName, email, password, role, gender, country, referralCode } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Email Normalization
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Verify user doesn't exist
        let userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: "An account with this email already exists." });
        }

        // 2. Generate Unique Username
        let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9]/g, '').toLowerCase();
        if (!baseUsername) baseUsername = 'user';
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

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Crypto Token for Verification
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiryDate = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours

        // 5. Create User Instance (Delegates location defaults to User schema if country is unpassed)
        const newUser = new User({
            fullName: fullName ? fullName.trim() : finalUsername,
            username: finalUsername,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'client',
            gender,
            referralCode: referralCode ? referralCode.trim() : undefined,
            isProfileComplete: true,
            isEmailVerified: false,
            verificationToken: emailVerificationToken,
            verificationTokenExpires: tokenExpiryDate,
            ...(country && { location: { country } })
        });

        // 6. Calculate account strength on model instance before initial save
        if (typeof newUser.calculateStrength === 'function') {
            newUser.calculateStrength();
        } else {
            newUser.accountStrength = referralCode ? 75 : 65;
        }

        await newUser.save();

        // 7. Dispatch Email
        try {
            await emailService.sendVerificationEmail(newUser.email, emailVerificationToken);
        } catch (mailError) {
            console.error("⚠️ Background Email Dispatch Error:", mailError.message);
        }

        // 8. Generate JWT Token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.status(201).json({
            token,
            user: formatUserPayload(newUser)
        });

    } catch (err) {
        console.error("Finalize Account Error:", err.message);
        return res.status(500).json({ message: "Critical server error processing account completion." });
    }
};

// ==========================================
// FILE: controllers/authController.js (PART 2 OF 2)
// ==========================================

/**
 * @route   POST /api/auth/login
 * @desc    LOGIN USER & RETURN FULL MARKETPLACE PAYLOAD
 * @access  Public
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please enter both email and password." });
        }

        // Email Normalization
        const normalizedEmail = email.toLowerCase().trim();

        // Find user & include password field
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        
        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Generate Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.json({
            token,
            user: formatUserPayload(user)
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        return res.status(500).json({ message: "Server Error during login" });
    }
};

/**
 * @route   POST /api/auth/verify-email
 * @desc    VERIFY EMAIL TOKEN & ACTIVATE ACCOUNT
 * @access  Public
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Verification token is required." });
        }

        // 1. Find user by non-expired verification token
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                message: "The verification link is invalid or has expired. Please request a new one." 
            });
        }

        // 2. Clear tokens and set verification
        user.isEmailVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        
        // 3. Recalculate Strength Safely
        if (typeof user.calculateStrength === 'function') {
            user.calculateStrength();
        } else {
            user.accountStrength = 100;
        }

        await user.save();

        // 4. Issue Fresh Token
        const newJwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.status(200).json({
            message: "Email successfully verified!",
            token: newJwtToken,
            user: formatUserPayload(user)
        });

    } catch (err) {
        console.error("Verify Email Route Error:", err.message);
        return res.status(500).json({ message: "Server error during email activation." });
    }
};

/**
 * @route   POST /api/auth/resend-verification
 * @desc    RESEND EMAIL VERIFICATION LINK
 * @access  Private (Requires authenticated user session)
 */
exports.resendVerification = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized. User ID required." });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User account not found." });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: "This email address is already verified." });
        }

        // Generate fresh token
        const newVerificationToken = crypto.randomBytes(32).toString('hex');
        const newTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

        user.verificationToken = newVerificationToken;
        user.verificationTokenExpires = newTokenExpiry;
        await user.save();

        // Dispatch email via service
        await emailService.sendVerificationEmail(user.email, newVerificationToken);

        return res.status(200).json({ message: "A fresh verification link has been sent to your inbox!" });

    } catch (err) {
        console.error("Resend Verification Error:", err.message);
        return res.status(500).json({ message: "Server error while processing your resend request." });
    }
};


