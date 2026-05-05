const FraudFlag = require('../models/FraudFlag');
const User      = require('../models/User');
const Booking   = require('../models/Booking');

const ok  = (res, data, msg = 'Success', code = 200) => res.status(code).json({ success: true,  message: msg, ...data });
const err = (res, msg = 'Error',   code = 400)       => res.status(code).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────
// AUTO-DETECT suspicious patterns — runs server-side
// Called internally when a booking is created or a user logs in
// ─────────────────────────────────────────────────────────
const autoDetect = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const flags = [];

    // Rule 1: More than 5 bookings in the last 2 hours (spam booking)
    const twoHoursAgo   = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentBookings = await Booking.countDocuments({
      customer:  userId,
      createdAt: { $gte: twoHoursAgo }
    });
    if (recentBookings > 5) {
      flags.push({
        targetUser:      userId,
        targetType:      'user',
        reason:          `User made ${recentBookings} bookings in the last 2 hours`,
        flagType:        'spam_booking',
        severity:        'high',
        isAutoDetected:  true,
        autoDetectionData: { bookingCount: recentBookings }
      });
    }

    // Rule 2: Cancellation rate over 70%
    const totalBookings     = await Booking.countDocuments({ customer: userId });
    const cancelledBookings = await Booking.countDocuments({ customer: userId, status: 'cancelled' });
    if (totalBookings >= 5) {
      const cancelRate = (cancelledBookings / totalBookings) * 100;
      if (cancelRate > 70) {
        flags.push({
          targetUser:     userId,
          targetType:     'user',
          reason:         `High cancellation rate: ${cancelRate.toFixed(0)}% of bookings cancelled`,
          flagType:       'spam_booking',
          severity:       'medium',
          isAutoDetected: true,
          autoDetectionData: { bookingCount: totalBookings, cancellationRate: cancelRate }
        });
      }
    }

    // Save any detected flags (skip if already flagged for same reason recently)
    for (const flag of flags) {
      const existing = await FraudFlag.findOne({
        targetUser: userId,
        flagType:   flag.flagType,
        status:     { $in: ['open', 'under_review'] },
        createdAt:  { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      if (!existing) {
        await FraudFlag.create(flag);
        // Mark user as flagged
        await User.findByIdAndUpdate(userId, { isFlagged: true });
      }
    }

    return flags.length;
  } catch (e) {
    console.error('autoDetect error:', e.message);
  }
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Report a listing or user as suspicious
// POST /api/fraud/report
// ─────────────────────────────────────────────────────────
exports.reportSuspicious = async (req, res) => {
  try {
    const { targetId, targetType, reason, flagType } = req.body;
    const reporterId = req.user._id;

    if (!targetId || !targetType || !reason) {
      return err(res, 'targetId, targetType, and reason are required');
    }

    // Build the flag document based on targetType
    const flagData = {
      targetType,
      reason,
      flagType:   flagType || 'auto_detected',
      flaggedBy:  reporterId,
      isAutoDetected: false,
      severity:   'medium'
    };

    if      (targetType === 'user')    flagData.targetUser    = targetId;
    else if (targetType === 'listing') flagData.targetListing = targetId;
    else if (targetType === 'booking') flagData.targetBooking = targetId;

    // Check if this exact report already exists from this user
    const existing = await FraudFlag.findOne({
      flaggedBy:  reporterId,
      targetType,
      ...(targetType === 'user'    ? { targetUser:    targetId } : {}),
      ...(targetType === 'listing' ? { targetListing: targetId } : {}),
      ...(targetType === 'booking' ? { targetBooking: targetId } : {}),
    });

    if (existing) return err(res, 'You have already reported this. Our team is reviewing it.');

    const flag = await FraudFlag.create(flagData);

    // Count how many reports this target has — escalate severity if many
    const reportCount = await FraudFlag.countDocuments({
      targetType,
      ...(targetType === 'user' ? { targetUser: targetId } : { targetListing: targetId }),
      status: { $ne: 'resolved' }
    });

    if (reportCount >= 3) {
      await FraudFlag.findByIdAndUpdate(flag._id, { severity: 'high', autoDetectionData: { reportCount } });
      if (targetType === 'user') await User.findByIdAndUpdate(targetId, { isFlagged: true });
    }

    return ok(res, { flag }, 'Report submitted. Our team will review it within 24 hours.', 201);
  } catch (e) {
    console.error('reportSuspicious error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// ADMIN: Get all fraud flags
// GET /api/fraud/flags
// ─────────────────────────────────────────────────────────
exports.getAllFlags = async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;

    const total = await FraudFlag.countDocuments(filter);
    const flags = await FraudFlag.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('targetUser', 'name phone email role')
      .populate('targetListing', 'title category price')
      .populate('flaggedBy', 'name role');

    return ok(res, { flags, total });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// ADMIN: Resolve or dismiss a flag
// PATCH /api/fraud/flags/:id/resolve
// ─────────────────────────────────────────────────────────
exports.resolveFlag = async (req, res) => {
  try {
    const { action, resolution, adminNotes } = req.body;
    // action: 'resolve' | 'dismiss' | 'escalate'

    const flag = await FraudFlag.findById(req.params.id);
    if (!flag) return err(res, 'Flag not found', 404);

    flag.status     = action === 'dismiss' ? 'dismissed' : 'resolved';
    flag.resolvedBy = req.user._id;
    flag.resolvedAt = new Date();
    flag.resolution = resolution;
    flag.adminNotes = adminNotes;
    await flag.save();

    // If resolved — un-flag the user
    if (action === 'resolve' && flag.targetUser) {
      const otherFlags = await FraudFlag.countDocuments({
        targetUser: flag.targetUser,
        status:     { $in: ['open','under_review'] }
      });
      if (otherFlags === 0) {
        await User.findByIdAndUpdate(flag.targetUser, { isFlagged: false });
      }
    }

    return ok(res, { flag }, `Flag ${flag.status} successfully`);
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// AUTO-DETECT: trigger check on a user
// POST /api/fraud/auto-check
// ─────────────────────────────────────────────────────────
exports.runAutoDetect = async (req, res) => {
  try {
    const { userId } = req.body;
    const count = await autoDetect(userId);
    return ok(res, { flagsCreated: count || 0 }, `Auto-detection complete. ${count || 0} flags created.`);
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Check if their account is flagged
// GET /api/fraud/my-status
// ─────────────────────────────────────────────────────────
exports.myFlagStatus = async (req, res) => {
  try {
    const user  = await User.findById(req.user._id).select('isFlagged name');
    const flags = await FraudFlag.find({
      targetUser: req.user._id,
      status:     { $in: ['open','under_review'] }
    }).select('reason flagType severity createdAt');

    return ok(res, { isFlagged: user.isFlagged, activeFlags: flags });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

module.exports.autoDetect = autoDetect;
