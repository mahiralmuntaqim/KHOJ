const User = require('../models/user');

// --- SIGN UP LOGIC ---
exports.signup = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        // Check if phone OR email is already registered
        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        if (existingUser) return res.status(400).json({ error: "Phone number or Email already registered" });

        let validRole = 'customer'; 
        if (role === 'provider') validRole = 'provider';

        const newUser = new User({ name, phone, email, password, role: validRole });

        await newUser.save();
        res.status(201).json({ message: "Account created successfully", user: newUser });
    } catch (error) {
        res.status(500).json({ error: "Server error during signup" });
    }
};

// --- SIGN IN LOGIC ---
exports.signin = async (req, res) => {
    try {
        // We call it 'identifier' because it could be an email OR a phone number
        const { identifier, password } = req.body;

        // Search the database for a matching phone OR matching email
        const user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.status(200).json({ message: "Login successful", user });
    } catch (error) {
        res.status(500).json({ error: "Server error during signin" });
    }
};