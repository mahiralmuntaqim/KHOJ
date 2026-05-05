const express  = require('express');
const router   = express.Router();
const Review   = require('../models/Review');
const Listing  = require('../models/Listing');
const Booking  = require('../models/Booking');
const auth     = require('../middleware/auth');

// GET /api/reviews — public list of published reviews
router.get('/', async function(req, res) {
  try {
    var limit   = parseInt(req.query.limit) || 10;
    var reviews = await Review.find({ status: 'published' })
      .populate('customer', 'name')
      .populate('listing', 'title locationLabel')
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.json({ success: true, reviews: reviews });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/reviews/listing/:id — reviews for a specific listing
router.get('/listing/:id', async function(req, res) {
  try {
    var reviews = await Review.find({ listing: req.params.id, status: 'published' })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    return res.json({ success: true, reviews: reviews });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/reviews — submit a review (auth optional: guests use authorName)
router.post('/', async function(req, res) {
  try {
    var rating     = parseInt(req.body.rating);
    var comment    = (req.body.comment || '').trim();
    var title      = (req.body.title   || '').trim();
    var authorName = (req.body.authorName || '').trim();
    var listingId  = req.body.listingId || null;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (!comment) {
      return res.status(400).json({ error: 'Review comment is required.' });
    }

    // Check for auth token (optional)
    var customerId = null;
    var displayName = authorName;
    var authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        var jwt  = require('jsonwebtoken');
        var User = require('../models/User');
        var decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'khoj_secret');
        var user = await User.findById(decoded.id).select('name');
        if (user) {
          customerId  = user._id;
          displayName = user.name;
        }
      } catch (e) { /* guest review */ }
    }

    // Find associated booking (if listing provided and user logged in)
    var bookingId = null;
    if (listingId && customerId) {
      var booking = await Booking.findOne({
        listing:  listingId,
        customer: customerId,
        status:   'completed'
      });
      if (booking) {
        bookingId = booking._id;
        // Update listing rating
        var allReviews = await Review.find({ listing: listingId, status: 'published' });
        var avgRating  = (allReviews.reduce(function(s, r) { return s + r.rating; }, 0) + rating) / (allReviews.length + 1);
        await Listing.findByIdAndUpdate(listingId, {
          averageRating: parseFloat(avgRating.toFixed(1)),
          reviewCount:   allReviews.length + 1
        });
      }
    }

    var review = await Review.create({
      booking:    bookingId,
      listing:    listingId,
      customer:   customerId,
      authorName: displayName || 'Anonymous',
      rating,
      title,
      comment,
      status:     'published',
      isVerified: !!bookingId
    });

    return res.status(201).json({ success: true, review: review, message: 'Review submitted. Thank you!' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/reviews/seed — seed sample testimonials
router.post('/seed', async function(req, res) {
  try {
    // Only delete unlinked seed reviews to avoid wiping real ones
    await Review.deleteMany({ booking: null, customer: null });

    var reviews = await Review.insertMany([
      { authorName: 'Rafiq Mahmud',   rating: 5, comment: 'Found an AC technician in 20 minutes. Professional, on time, and the price was exactly as listed. Will use KHOJ again.',                              status: 'published' },
      { authorName: 'Sumaiya Khanam', rating: 5, comment: 'Rented a camera and projector for my brother\'s wedding. Setup was hassle-free and saved us a lot compared to buying.',                                status: 'published' },
      { authorName: 'Tahmina Akter',  rating: 5, comment: 'My daughter\'s HSC tutor from KHOJ helped her improve from a C to an A grade in just 3 months. Great platform!',                                      status: 'published' },
      { authorName: 'Arif Hossain',   rating: 4, comment: 'Booked a plumber for an emergency leak at 11 PM. The provider was on-site within an hour. Fantastic emergency response.',                              status: 'published' },
      { authorName: 'Meem Rashida',   rating: 5, comment: 'The deep cleaning service transformed my apartment. Very thorough and professional team. Highly recommended for anyone in Uttara.',                    status: 'published' },
    ]);
    return res.json({ success: true, message: reviews.length + ' reviews seeded.', reviews });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
