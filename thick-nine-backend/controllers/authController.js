const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// FINALIZE ONBOARDING ACCOUNT (Processes the complete mandatory-LIVE-CLIENT form data)
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

        // 4. Calculate an starting profile strength based on filled items (e.g. 65% out of the gate)
        const starterStrength = referralCode ? 75 : 65;

        // 5. Create and save the formal User Document to MongoDB
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
            isEmailVerified: false,
            accountStrength: starterStrength
        });

        await newUser.save();

        // 6. Generate access token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 7. Send payload back exactly matching the keys your frontend fetches
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
        console.error("Finalize Account Error:", err.message);
        res.status(500).json({ msg: "Critical server error processing account completion." });
    }
};