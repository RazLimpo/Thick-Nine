const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER A NEW USER
exports.register = async (req, res) => {
    try {
        const { fullName, username, email, password, role } = req.body;

        // 1. Check if user already exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the user in the database
        user = new User({
            fullName,
            username,
            email,
            password: hashedPassword,
            role 
        });

        await user.save();

        // 4. Generate a Token (JWT)
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ token, user: { id: user._id, fullName, role } });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error during registration");
    }
};

// LOGIN USER
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user and EXPLICITLY ask for the password field (the line you asked about)
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

        // 2. Compare typed password with the hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

        // 3. Create and send Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: { 
                id: user._id, 
                fullName: user.fullName, 
                role: user.role,
                planType: user.planType 
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error during login");
    }
};