const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Booking = require('../models/Booking');
const auth    = require('../middleware/auth');

router.get('/dashboard', auth.protect, auth.requireRole('admin'), async function(req, res) {
  try {
    var users    = await User.countDocuments();
    var bookings = await Booking.countDocuments();
    var revenue  = await Booking.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$payment.amount' } } }
    ]);
    return res.json({ success: true, data: { users: users, bookings: bookings, revenue: revenue[0] ? revenue[0].total : 0 } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/users', auth.protect, auth.requireRole('admin'), async function(req, res) {
  try {
    var users = await User.find().select('-password').sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, users: users });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
