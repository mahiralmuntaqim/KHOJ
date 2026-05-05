const Recommendation = require('../models/Recommendation');
const Listing        = require('../models/Listing');
const Booking        = require('../models/Booking');
const User           = require('../models/User');

const ok  = (res, data, msg = 'Success', code = 200) => res.status(code).json({ success: true,  message: msg, ...data });
const err = (res, msg = 'Error',   code = 400)       => res.status(code).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────
// BUILD recommendations for a user — the core algorithm
// ─────────────────────────────────────────────────────────
const buildRecommendations = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return [];

  // Signal 1: Categories from past bookings
  const pastBookings = await Booking.find({ customer: userId })
    .populate('listing', 'category').limit(20);
  const bookedCategories = [...new Set(pastBookings.map(b => b.listing?.category).filter(Boolean))];

  // Signal 2: User's browsing history stored on their profile
  const viewedCategories = user.viewedCategories || [];
  const searchHistory    = user.searchHistory    || [];

  // Signal 3: Top-rated listings in user's location
  const userLocation = user.location || '';

  // Combine all category signals
  const allPreferredCats = [...new Set([...bookedCategories, ...viewedCategories])];

  // Build filter — prefer categories they've interacted with
  let listings = [];
  const basedOn = {
    pastBookings:     bookedCategories,
    viewedCategories: viewedCategories,
    searchHistory:    searchHistory,
    location:         userLocation,
    topRatedInArea:   false,
    popularThisWeek:  false
  };

  if (allPreferredCats.length > 0) {
    // Content-based: match their preferred categories
    listings = await Listing.find({
      category: { $in: allPreferredCats },
      isActive:  true,
      isFlagged: false
    }).sort({ averageRating: -1 }).limit(6).populate('provider', 'name');
    basedOn.topRatedInArea = false;
  }

  // If not enough, fill with top-rated overall
  if (listings.length < 6) {
    const existing = listings.map(l => l._id.toString());
    const filler   = await Listing.find({
      _id:       { $nin: existing },
      isActive:  true,
      isFlagged: false
    }).sort({ averageRating: -1 }).limit(6 - listings.length).populate('provider', 'name');
    listings = [...listings, ...filler];
    basedOn.popularThisWeek = true;
  }

  // Score each listing — higher = more relevant
  const scored = listings.map(l => ({
    listing: l,
    score: (allPreferredCats.includes(l.category) ? 40 : 0) +
           (l.averageRating * 10) +
           (l.reviewCount > 10 ? 10 : 0)
  })).sort((a, b) => b.score - a.score);

  return { listings: scored.map(s => s.listing), basedOn };
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Get my recommendations
// GET /api/recommendations
// ─────────────────────────────────────────────────────────
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if we have fresh recommendations (under 1 hour old)
    const fresh = await Recommendation.findOne({
      user:      userId,
      expiresAt: { $gt: new Date() }
    }).populate({ path: 'listings', populate: { path: 'provider', select: 'name' } });

    if (fresh) return ok(res, { recommendations: fresh.listings, basedOn: fresh.basedOn, fromCache: true });

    // Build fresh recommendations
    const { listings, basedOn } = await buildRecommendations(userId);

    // Save to DB with 1-hour expiry
    await Recommendation.findOneAndUpdate(
      { user: userId },
      {
        user:      userId,
        listings:  listings.map(l => l._id),
        basedOn,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      },
      { upsert: true, returnDocument: 'after' }
    );

    return ok(res, { recommendations: listings, basedOn, fromCache: false });
  } catch (e) {
    console.error('getRecommendations error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Track a category view (call when user clicks a category)
// POST /api/recommendations/track-view
// ─────────────────────────────────────────────────────────
exports.trackView = async (req, res) => {
  try {
    const { category, searchTerm } = req.body;
    const update = {};

    if (category)   update.$addToSet = { viewedCategories: category };
    if (searchTerm) update.$addToSet = { ...(update.$addToSet || {}), searchHistory: searchTerm };

    await User.findByIdAndUpdate(req.user._id, update);

    // Invalidate cached recommendations so next fetch is fresh
    await Recommendation.findOneAndUpdate(
      { user: req.user._id },
      { expiresAt: new Date() }
    );

    return ok(res, {}, 'Behaviour tracked');
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// PUBLIC: Get popular listings (no auth needed)
// GET /api/recommendations/popular
// ─────────────────────────────────────────────────────────
exports.getPopular = async (req, res) => {
  try {
    const { category, limit = 6 } = req.query;
    const filter = { isActive: true, isFlagged: false };
    if (category) filter.category = category;

    const listings = await Listing.find(filter)
      .sort({ averageRating: -1, reviewCount: -1 })
      .limit(parseInt(limit))
      .populate('provider', 'name');

    return ok(res, { listings });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};
