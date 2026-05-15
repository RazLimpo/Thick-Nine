const User = require('./models/User');
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