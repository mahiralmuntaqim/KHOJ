const express  = require('express');
const router   = express.Router();
const Listing  = require('../models/Listing');
const auth     = require('../middleware/auth');

// GET /api/listings — filter by category, type, search, location, limit
router.get('/', async function(req, res) {
  try {
    var filter = { isActive: true, isFlagged: false };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.type)     filter.type = req.query.type;
    if (req.query.search)   filter.title = { $regex: req.query.search, $options: 'i' };
    if (req.query.location) filter.locationLabel = { $regex: req.query.location, $options: 'i' };

    var limit = parseInt(req.query.limit) || 12;
    var listings = await Listing.find(filter)
      .sort({ averageRating: -1 })
      .limit(limit)
      .populate('provider', 'name');
    return res.json({ success: true, listings: listings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/listings/seed — seed services + rentals
router.post('/seed', async function(req, res) {
  try {
    var User = require('../models/User');
    var admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'KHOJ Admin', phone: '01000000000',
        email: 'admin@khoj.com', password: 'admin123', role: 'admin'
      });
    }

    await Listing.deleteMany({});
    var listings = await Listing.insertMany([
      // ── Services ──
      { provider: admin._id, title: 'AC Installation & Servicing', category: 'repair', type: 'service', emoji: '🔧', price: 800,  unit: 'visit',   locationLabel: 'Dhaka',       averageRating: 4.9, reviewCount: 42 },
      { provider: admin._id, title: 'HSC Physics & Math Tutor',    category: 'tutor',  type: 'service', emoji: '📚', price: 500,  unit: 'hour',    locationLabel: 'Mirpur',      averageRating: 5.0, reviewCount: 18 },
      { provider: admin._id, title: 'Birthday Party Decoration',   category: 'event',  type: 'service', emoji: '🎉', price: 2500, unit: 'event',   locationLabel: 'Gulshan',     averageRating: 4.8, reviewCount: 31 },
      { provider: admin._id, title: 'Laptop & PC Repair',          category: 'tech',   type: 'service', emoji: '💻', price: 600,  unit: 'session', locationLabel: 'Dhanmondi',   averageRating: 4.7, reviewCount: 56 },
      { provider: admin._id, title: 'Deep Home Cleaning',          category: 'clean',  type: 'service', emoji: '🧹', price: 1200, unit: 'visit',   locationLabel: 'Uttara',      averageRating: 4.6, reviewCount: 73 },
      { provider: admin._id, title: 'Plumbing & Pipe Fixing',      category: 'repair', type: 'service', emoji: '🔧', price: 700,  unit: 'visit',   locationLabel: 'Mohammadpur', averageRating: 4.8, reviewCount: 29 },
      // ── Rentals ──
      { provider: admin._id, title: 'Air Conditioner 1.5 Ton',     category: 'repair', type: 'rental',  emoji: '❄️', price: 1200, unit: 'day',     locationLabel: 'Dhaka',       averageRating: 4.7, reviewCount: 12 },
      { provider: admin._id, title: 'DSLR Camera Kit (Canon 90D)', category: 'tech',   type: 'rental',  emoji: '📷', price: 1500, unit: 'day',     locationLabel: 'Dhanmondi',   averageRating: 4.9, reviewCount: 23 },
      { provider: admin._id, title: 'PA Sound System 500W',        category: 'event',  type: 'rental',  emoji: '🎤', price: 2000, unit: 'day',     locationLabel: 'Gulshan',     averageRating: 4.6, reviewCount: 8  },
      { provider: admin._id, title: 'Folding Chairs Set (50pc)',    category: 'event',  type: 'rental',  emoji: '🪑', price: 800,  unit: 'day',     locationLabel: 'Mirpur',      averageRating: 4.5, reviewCount: 15 },
      { provider: admin._id, title: 'Projector & Screen Full HD',  category: 'tech',   type: 'rental',  emoji: '🖥️', price: 900,  unit: 'day',     locationLabel: 'Banani',      averageRating: 4.8, reviewCount: 19 },
      { provider: admin._id, title: 'Washing Machine Samsung 7kg', category: 'clean',  type: 'rental',  emoji: '🧺', price: 500,  unit: 'day',     locationLabel: 'Uttara',      averageRating: 4.4, reviewCount: 7  },
    ]);
    return res.json({ success: true, message: listings.length + ' listings seeded (6 services + 6 rentals).', listings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/listings/mine — provider's own listings (auth required)
router.get('/mine', auth.protect, auth.requireRole('provider','admin'), async function(req, res) {
  try {
    var listings = await Listing.find({ provider: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, listings: listings });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/listings/:id
router.get('/:id', async function(req, res) {
  try {
    var listing = await Listing.findById(req.params.id).populate('provider', 'name phone');
    if (!listing) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, listing: listing });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/listings — create (provider/admin only)
router.post('/', auth.protect, auth.requireRole('provider', 'admin'), async function(req, res) {
  try {
    var data = Object.assign({}, req.body, {
      provider:      req.user._id,
      averageRating: 4.0,   // starter rating so new listings appear in the grid
      reviewCount:   0
    });
    var listing = await Listing.create(data);
    return res.status(201).json({ success: true, listing: listing });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
