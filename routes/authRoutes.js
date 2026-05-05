const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const auth    = require('../middleware/auth');

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. SIGNUP (Creates user, sends OTP, NO Token yet)
router.post('/signup', async function(req, res) {
  try {
    var name     = req.body.name;
    var phone    = req.body.phone;
    var email    = req.body.email;
    var password = req.body.password;
    var role     = req.body.role;

    if (!name || !phone || !email || !password) return res.status(400).json({ error: 'All fields required.' });
    
    var exists = await User.findOne({ $or: [{ phone: phone }, { email: email }] });
    if (exists) return res.status(400).json({ error: 'Phone or email already registered.' });
    
    var otp = generateOTP();
    console.log(`\n\n[DEV] 🚀 SIMULATED SMS: OTP for new user ${phone} is: ${otp}\n\n`);

    var user = await User.create({
      name:     name,
      phone:    phone,
      email:    email,
      password: password,
      role:     role === 'provider' ? 'provider' : 'customer',
      otpCode:  otp,
      otpExpire: Date.now() + 10 * 60 * 1000 // Valid for 10 mins
    });
    
    // Stop here! Don't send the token until they verify the OTP.
    return res.status(201).json({ success: true, requiresOtp: true, userId: user._id });
  } catch (e) {
    console.error('signup error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// 2. SIGNIN (Checks password, sends OTP, NO Token yet)
router.post('/signin', async function(req, res) {
  try {
    var identifier = req.body.identifier;
    var password   = req.body.password;

    if (!identifier || !password) return res.status(400).json({ error: 'Please provide phone/email and password.' });
    
    var user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    
    var isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });
    
    var otp = generateOTP();
    console.log(`\n\n[DEV] 🚀 SIMULATED SMS: Login OTP for ${user.phone} is: ${otp}\n\n`);

    user.otpCode = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, requiresOtp: true, userId: user._id });
  } catch (e) {
    console.error('signin error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// 3. VERIFY OTP (Validates OTP, then finally returns the JWT Token)
router.post('/verify-otp', async function(req, res) {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ error: 'Missing information.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.otpCode !== otp || user.otpExpire < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code.' });
    }

    // Success! Clear OTP fields and verify phone
    user.otpCode = undefined;
    user.otpExpire = undefined;
    user.isPhoneVerified = true;
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate Token
    var token = user.getToken();
    return res.json({
      success: true,
      token:   token,
      user: {
        _id:   user._id,
        name:  user.name,
        role:  user.role,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// 4. RESEND OTP
router.post('/resend-otp', async function(req, res) {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    var otp = generateOTP();
    console.log(`\n\n[DEV] 🚀 SIMULATED SMS: RESENT OTP for ${user.phone} is: ${otp}\n\n`);
    
    user.otpCode = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    
    return res.json({ success: true, message: 'OTP resent.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/me', auth.protect, async function(req, res) {
  try {
    var user = await User.findById(req.user._id).select('-password');
    return res.json({ success: true, user: user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;