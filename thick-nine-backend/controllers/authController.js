const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER A NEW USER (Updated with Unique Username Logic)
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        // 1. Check if email already exists
        let userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: "User already exists" });

        // 2. Generate and Verify Unique Username
        // Takes 'razlimpo' from 'razlimpo@gmail.com'
        let baseUsername = email.split('@')[0].toLowerCase();
        let finalUsername = baseUsername;
        let isUnique = false;

        // Loop until we find a name not in the database
        while (!isUnique) {
            const existingName = await User.findOne({ username: finalUsername });
            if (existingName) {
                // If username is taken, add 4 random digits
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                finalUsername = `${baseUsername}${randomSuffix}`;
            } else {
                isUnique = true;
            }
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create the user in the database
        const newUser = new User({
            fullName: fullName || finalUsername,
            username: finalUsername,
            email,
            password: hashedPassword,
            role: role || 'client',
            accountStrength: 50 // New users start at 50%
        });

        await newUser.save();

        // 5. Generate a Token (JWT)
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Return the full user object so the Header.tsx can save it
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
        res.status(500).send("Server Error during registration");
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