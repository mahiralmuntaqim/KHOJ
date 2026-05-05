const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const auth    = require('../middleware/auth');

router.post('/signup', async function(req, res) {
  try {
    var name     = req.body.name;
    var phone    = req.body.phone;
    var email    = req.body.email;
    var password = req.body.password;
    var role     = req.body.role;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields required.' });
    }
    var exists = await User.findOne({ $or: [{ phone: phone }, { email: email }] });
    if (exists) {
      return res.status(400).json({ error: 'Phone or email already registered.' });
    }
    var user = await User.create({
      name:     name,
      phone:    phone,
      email:    email,
      password: password,
      role:     role === 'provider' ? 'provider' : 'customer'
    });
    var token = user.getToken();
    return res.status(201).json({
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
    console.error('signup error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/signin', async function(req, res) {
  try {
    var identifier = req.body.identifier;
    var password   = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide phone/email and password.' });
    }
    var user = await User.findOne({ $or: [{ phone: identifier }, { email: identifier }] });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    var isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
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
    console.error('signin error:', e.message);
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
