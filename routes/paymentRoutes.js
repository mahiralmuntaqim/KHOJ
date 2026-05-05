const express  = require('express');
const router   = express.Router();
const Booking  = require('../models/Booking');
const auth     = require('../middleware/auth');

router.post('/pay', auth.protect, async function(req, res) {
  try {
    var booking = await Booking.findByIdAndUpdate(
      req.body.bookingId,
      { 'payment.status': 'paid', 'payment.method': req.body.method, 'payment.amount': req.body.amount, status: 'confirmed' },
      { new: true }
    );
    return res.json({ success: true, booking: booking });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
