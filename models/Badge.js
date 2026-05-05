const mongoose = require('mongoose');

// Badge definitions — master list
const badgeDefinitionSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  emoji:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, enum: ['customer','provider','both'], default: 'both' },
  // What triggers this badge
  trigger: {
    type: { type: String, enum: ['booking_count','review_count','loyalty_points','manual','special'], required: true },
    threshold: Number // e.g. 5 bookings, 100 points
  },
  tier:        { type: String, enum: ['bronze','silver','gold','platinum'], default: 'bronze' },
  pointsReward:{ type: Number, default: 10 }, // points awarded when earned
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

// User badge awards — each row = one badge awarded to one user
const userBadgeSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badgeDefinition: { type: mongoose.Schema.Types.ObjectId, ref: 'BadgeDefinition', required: true },
  awardedAt:       { type: Date, default: Date.now },
  awardedBy:       { type: String, enum: ['system','admin'], default: 'system' },
  reason:          { type: String }
}, { timestamps: true });

// Prevent duplicate badge awards
userBadgeSchema.index({ user: 1, badgeDefinition: 1 }, { unique: true });

const BadgeDefinition = mongoose.model('BadgeDefinition', badgeDefinitionSchema);
const UserBadge       = mongoose.model('UserBadge', userBadgeSchema);

module.exports = { BadgeDefinition, UserBadge };
