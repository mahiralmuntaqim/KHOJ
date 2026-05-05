const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Booking  = require('../models/Booking');
const Listing  = require('../models/Listing');

router.get('/', async function(req, res) {
  try {
    const providers  = await User.countDocuments({ role: 'provider' });
    const orders     = await Booking.countDocuments({ status: { $in: ['completed','in-progress','confirmed'] } });
    const listings   = await Listing.countDocuments({ isActive: true });

    const ratingAgg  = await Listing.aggregate([
      { $match: { isActive: true, averageRating: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$averageRating' } } }
    ]);
    const rating = ratingAgg[0] ? parseFloat(ratingAgg[0].avg.toFixed(1)) : 4.8;

    return res.json({
      success: true,
      stats: {
        providers: Math.max(providers, 2400),
        orders:    Math.max(orders, 18000),
        districts: 64,
        rating,
        listings
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
