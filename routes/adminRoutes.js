const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Booking = require('../models/Booking');
const auth    = require('../middleware/auth');

// Get Overall Business Analytics
router.get('/dashboard', auth.protect, auth.requireRole('admin'), async function(req, res) {
  try {
    const customers = await User.countDocuments({ role: 'customer' });
    const providers = await User.countDocuments({ role: 'provider' });
    const bookings  = await Booking.countDocuments();
    const revenue   = await Booking.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$payment.amount' } } }
    ]);
    
    return res.json({ 
        success: true, 
        data: { 
            customers, 
            providers, 
            bookings, 
            revenue: revenue[0] ? revenue[0].total : 0 
        } 
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Get NID Verification Lists
router.get('/nid-list', auth.protect, auth.requireRole('admin'), async function(req, res) {
    try {
        const pending = await User.find({ 'nidVerification.status': 'pending' }).select('name email phone nidVerification');
        const verified = await User.find({ 'nidVerification.status': 'verified' }).select('name email phone nidVerification');
        return res.json({ success: true, pending, verified });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Approve NID
router.put('/approve-nid/:id', auth.protect, auth.requireRole('admin'), async function(req, res) {
    try {
        await User.findByIdAndUpdate(req.params.id, { 'nidVerification.status': 'verified' });
        // Optional: You could trigger the 'Verified Pro' badge award here!
        return res.json({ success: true, message: 'Provider NID verified successfully.' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Reject NID
router.put('/reject-nid/:id', auth.protect, auth.requireRole('admin'), async function(req, res) {
    try {
        await User.findByIdAndUpdate(req.params.id, { 'nidVerification.status': 'rejected' });
        return res.json({ success: true, message: 'Provider NID rejected.' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Get All Users
router.get('/users', auth.protect, auth.requireRole('admin'), async function(req, res) {
  try {
    var users = await User.find().select('-password').sort({ createdAt: -1 }).limit(50);
    return res.json({ success: true, users: users });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;