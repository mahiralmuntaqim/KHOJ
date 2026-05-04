const Availability = require('../models/Availability');

// ─────────────────────────────────────────────────────────────
// HELPER: find or create the provider's Availability doc
// ─────────────────────────────────────────────────────────────
async function getOrCreate(providerId) {
  let avail = await Availability.findOne({ provider: providerId });
  if (!avail) {
    avail = await Availability.create({ provider: providerId });
  }
  return avail;
}

// ─────────────────────────────────────────────────────────────
// GET /api/availability/me
// Protected (provider) – get own availability document
// ─────────────────────────────────────────────────────────────
exports.getMyAvailability = async (req, res) => {
  try {
    const avail = await getOrCreate(req.user._id);
    res.status(200).json({ success: true, availability: avail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/availability/provider/:providerId
// Public – fetch a specific provider's availability
// (used by frontend calendar when booking)
// ─────────────────────────────────────────────────────────────
exports.getProviderAvailability = async (req, res) => {
  try {
    const avail = await Availability.findOne({ provider: req.params.providerId });

    if (!avail) {
      // Provider hasn't set anything up yet → treat as fully available
      return res.status(200).json({
        success: true,
        availability: {
          status:      'available',
          busyDates:   [],
          timeSlots:   ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
          bookedSlots: [],
        },
      });
    }

    res.status(200).json({ success: true, availability: avail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch provider availability.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/availability/toggle-status
// Protected (provider) – toggle available / busy
// Body: { status: 'available' | 'busy' }
// ─────────────────────────────────────────────────────────────
exports.toggleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'busy'].includes(status)) {
      return res.status(400).json({ error: "status must be 'available' or 'busy'." });
    }

    const avail = await getOrCreate(req.user._id);
    avail.status = status;
    await avail.save();

    res.status(200).json({
      success: true,
      message: `You are now marked as ${status}.`,
      status:  avail.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/availability/busy-dates
// Protected (provider) – set / replace busy dates array
// Body: { busyDates: ['2025-06-15', '2025-06-22'] }
// ─────────────────────────────────────────────────────────────
exports.setBusyDates = async (req, res) => {
  try {
    const { busyDates } = req.body;

    if (!Array.isArray(busyDates)) {
      return res.status(400).json({ error: 'busyDates must be an array of YYYY-MM-DD strings.' });
    }

    // Basic date string validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const invalid = busyDates.find(d => !dateRegex.test(d));
    if (invalid) {
      return res.status(400).json({ error: `Invalid date format: "${invalid}". Use YYYY-MM-DD.` });
    }

    const avail = await getOrCreate(req.user._id);
    avail.busyDates = busyDates;
    await avail.save();

    res.status(200).json({
      success:   true,
      message:   'Busy dates updated.',
      busyDates: avail.busyDates,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update busy dates.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/availability/time-slots
// Protected (provider) – update offered time slots
// Body: { timeSlots: ['9:00 AM', '2:00 PM'] }
// ─────────────────────────────────────────────────────────────
exports.setTimeSlots = async (req, res) => {
  try {
    const { timeSlots } = req.body;

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ error: 'timeSlots must be a non-empty array of strings.' });
    }

    const avail = await getOrCreate(req.user._id);
    avail.timeSlots = timeSlots;
    await avail.save();

    res.status(200).json({
      success:   true,
      message:   'Time slots updated.',
      timeSlots: avail.timeSlots,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update time slots.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/availability/book-slot
// Internal helper (called by bookingController after confirmation)
// Body: { providerId, date: 'YYYY-MM-DD', time: '9:00 AM' }
// ─────────────────────────────────────────────────────────────
exports.markSlotBooked = async (providerId, date, time) => {
  try {
    const avail = await getOrCreate(providerId);
    avail.bookedSlots.push({ date, time });
    await avail.save();
  } catch (err) {
    console.error('markSlotBooked error:', err);
  }
};
