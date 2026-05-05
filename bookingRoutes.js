const express  = require('express');
const router   = express.Router();
const Booking  = require('../models/Booking');
const auth     = require('../middleware/auth');

// GET /api/bookings/track/:ref — public order tracking by bookingRef
router.get('/track/:ref', async function(req, res) {
  try {
    var booking = await Booking.findOne({ bookingRef: req.params.ref.toUpperCase() })
      .populate('listing',  'title category emoji')
      .populate('provider', 'name')
      .select('-otpForCompletion -__v -nidVerification');
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Order not found. Check the reference and try again.' });
    }
    return res.json({ success: true, booking: booking });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/bookings/customer/:id — bookings for a customer (auth required)
router.get('/customer/:id', auth.protect, async function(req, res) {
  try {
    var bookings = await Booking.find({ customer: req.params.id })
      .populate('listing')
      .sort({ createdAt: -1 });
    return res.json({ success: true, bookings: bookings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
