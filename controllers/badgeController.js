const { BadgeDefinition, UserBadge } = require('../models/Badge');
const User    = require('../models/User');
const Booking = require('../models/Booking');
const Review  = require('../models/Review');

const ok  = (res, data, msg = 'Success', code = 200) => res.status(code).json({ success: true,  message: msg, ...data });
const err = (res, msg = 'Error',   code = 400)       => res.status(code).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────
// Internal: Check and award badges for a user
// Called automatically after booking, review, etc.
// ─────────────────────────────────────────────────────────
const awardBadgesForBooking = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const completedBookings = await Booking.countDocuments({
      customer: userId,
      status:   'completed'
    });

    const definitions = await BadgeDefinition.find({
      'trigger.type': 'booking_count',
      isActive: true
    });

    const newBadges = [];
    for (const def of definitions) {
      if (completedBookings >= def.trigger.threshold) {
        // Try to award — unique index prevents duplicates
        try {
          const awarded = await UserBadge.create({
            user:            userId,
            badgeDefinition: def._id,
            reason:          `Completed ${completedBookings} bookings`
          });
          newBadges.push({ badge: def, awarded });

          // Add loyalty points
          await User.findByIdAndUpdate(userId, {
            $inc: { loyaltyPoints: def.pointsReward }
          });
        } catch (dupErr) {
          // Already has this badge — ignore
        }
      }
    }
    return newBadges;
  } catch (e) {
    console.error('awardBadgesForBooking error:', e.message);
  }
};

const awardBadgesForReview = async (userId) => {
  try {
    const reviewCount = await Review.countDocuments({ customer: userId });
    const definitions = await BadgeDefinition.find({
      'trigger.type': 'review_count',
      isActive: true
    });

    for (const def of definitions) {
      if (reviewCount >= def.trigger.threshold) {
        try {
          await UserBadge.create({
            user:            userId,
            badgeDefinition: def._id,
            reason:          `Submitted ${reviewCount} reviews`
          });
          await User.findByIdAndUpdate(userId, {
            $inc: { loyaltyPoints: def.pointsReward }
          });
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error('awardBadgesForReview error:', e.message);
  }
};

// ─────────────────────────────────────────────────────────
// SEED badge definitions (run once on startup)
// POST /api/badges/seed
// ─────────────────────────────────────────────────────────
exports.seedBadges = async (req, res) => {
  try {
    await BadgeDefinition.deleteMany({});
    const badges = await BadgeDefinition.insertMany([
      // Customer badges
      { name: 'First Booking',    emoji: '🎉', description: 'Made your first booking',                              category: 'customer', trigger: { type: 'booking_count', threshold: 1 },  tier: 'bronze',   pointsReward: 10 },
      { name: 'Regular',          emoji: '🔄', description: 'Completed 5 bookings',                                 category: 'customer', trigger: { type: 'booking_count', threshold: 5 },  tier: 'silver',   pointsReward: 25 },
      { name: 'Loyal Customer',   emoji: '⭐', description: 'Completed 10 bookings',                                category: 'customer', trigger: { type: 'booking_count', threshold: 10 }, tier: 'gold',     pointsReward: 50 },
      { name: 'KHOJ Champion',    emoji: '🏆', description: 'Completed 25 bookings — true KHOJ loyalist',           category: 'customer', trigger: { type: 'booking_count', threshold: 25 }, tier: 'platinum', pointsReward: 100 },
      { name: 'First Review',     emoji: '✍️', description: 'Submitted your first review',                         category: 'customer', trigger: { type: 'review_count',  threshold: 1 },  tier: 'bronze',   pointsReward: 10 },
      { name: 'Review Guru',      emoji: '🌟', description: 'Submitted 10 reviews — helping the community',         category: 'customer', trigger: { type: 'review_count',  threshold: 10 }, tier: 'gold',     pointsReward: 40 },
      // Provider badges
      { name: 'Verified Pro',     emoji: '✅', description: 'Identity verified with NID',                           category: 'provider', trigger: { type: 'manual',         threshold: 0 },  tier: 'silver',   pointsReward: 30 },
      { name: 'Top Provider',     emoji: '🥇', description: 'Served 20+ customers with excellent ratings',          category: 'provider', trigger: { type: 'booking_count',  threshold: 20 }, tier: 'gold',     pointsReward: 60 },
      // Special
      { name: 'Early Adopter',    emoji: '🚀', description: 'One of the first users on KHOJ',                       category: 'both',     trigger: { type: 'special',        threshold: 0 },  tier: 'platinum', pointsReward: 50 },
    ]);
    return ok(res, { badges }, `${badges.length} badges seeded`, 201);
  } catch (e) {
    return err(res, e.message, 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET all badge definitions
// GET /api/badges/definitions
// ─────────────────────────────────────────────────────────
exports.getBadgeDefinitions = async (req, res) => {
  try {
    const badges = await BadgeDefinition.find({ isActive: true }).sort({ tier: 1 });
    return ok(res, { badges });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// GET my badges
// GET /api/badges/my-badges
// ─────────────────────────────────────────────────────────
exports.getMyBadges = async (req, res) => {
  try {
    const userId = req.user._id;

    const myBadges = await UserBadge.find({ user: userId })
      .populate('badgeDefinition')
      .sort({ awardedAt: -1 });

    const user             = await User.findById(userId).select('loyaltyPoints name');
    const allDefinitions   = await BadgeDefinition.find({ isActive: true });
    const earnedIds        = myBadges.map(b => b.badgeDefinition._id.toString());
    const unearnedBadges   = allDefinitions.filter(d => !earnedIds.includes(d._id.toString()));

    // Progress toward next badge
    const completedCount  = await Booking.countDocuments({ customer: userId, status: 'completed' });
    const reviewCount     = await Review.countDocuments({ customer: userId });

    return ok(res, {
      earned:        myBadges,
      unearned:      unearnedBadges,
      loyaltyPoints: user.loyaltyPoints,
      progress: {
        bookings: completedCount,
        reviews:  reviewCount
      }
    });
  } catch (e) {
    console.error('getMyBadges error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// ADMIN: Award a badge manually
// POST /api/badges/award
// ─────────────────────────────────────────────────────────
exports.awardBadge = async (req, res) => {
  try {
    const { userId, badgeDefinitionId, reason } = req.body;
    const def = await BadgeDefinition.findById(badgeDefinitionId);
    if (!def) return err(res, 'Badge definition not found', 404);

    const awarded = await UserBadge.create({
      user:            userId,
      badgeDefinition: badgeDefinitionId,
      awardedBy:       'admin',
      reason:          reason || `Manually awarded by admin`
    });

    await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: def.pointsReward } });
    return ok(res, { awarded }, `Badge "${def.name}" awarded!`, 201);
  } catch (e) {
    if (e.code === 11000) return err(res, 'User already has this badge');
    return err(res, 'Server error', 500);
  }
};

module.exports.awardBadgesForBooking = awardBadgesForBooking;
module.exports.awardBadgesForReview  = awardBadgesForReview;
