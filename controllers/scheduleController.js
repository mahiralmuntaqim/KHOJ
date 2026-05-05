const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User    = require('../models/User');
const Message = require('../models/Message');
const { awardBadgesForBooking } = require('./badgeController');
const { autoDetect } = require('./fraudController');

const ok  = (res, data, msg = 'Success', code = 200) => res.status(code).json({ success: true,  message: msg, ...data });
const err = (res, msg = 'Error',   code = 400)       => res.status(code).json({ success: false, message: msg });

const ALL_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
const LABELS    = ['8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM'];

// ─────────────────────────────────────────────────────────
// GET AVAILABLE SLOTS
// GET /api/schedule/slots?listingId=&date=
// ─────────────────────────────────────────────────────────
exports.getSlots = async (req, res) => {
  try {
    const { listingId, date } = req.query;
    if (!listingId || !date) return err(res, 'listingId and date are required');

    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end   = new Date(date); end.setHours(23, 59, 59, 999);

    const booked = await Booking.find({
      listing:       listingId,
      scheduledDate: { $gte: start, $lte: end },
      status:        { $nin: ['cancelled'] }
    }).select('scheduledTime');

    const bookedTimes    = booked.map(b => b.scheduledTime);
    const availableSlots = ALL_SLOTS.map((t, i) => ({
      time:      t,
      label:     LABELS[i],
      available: !bookedTimes.includes(t)
    }));

    return ok(res, { availableSlots, date, listingId });
  } catch (e) {
    console.error('getSlots error:', e.message);
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// CREATE BOOKING — notifies provider via in-app message
// POST /api/schedule/book
// ─────────────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const {
      listingId,
      scheduledDate,
      scheduledTime,
      notes,
      address,
      location,
      paymentMethod = 'cash',
      paymentAmount
    } = req.body;
    const resolvedAddress = address || location || '';

    const customerId = req.user._id;

    // 1. Get listing + provider
    const listing = await Listing.findById(listingId).populate('provider');
    if (!listing)         return err(res, 'Listing not found', 404);
    if (!listing.isActive)return err(res, 'This service is currently unavailable', 400);

    // 2. Check slot conflict
    if (scheduledTime) {
      if (!ALL_SLOTS.includes(scheduledTime)) return err(res, 'Invalid time slot');
      const conflict = await Booking.findOne({
        listing:       listingId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status:        { $nin: ['cancelled'] }
      });
      if (conflict) return err(res, 'This time slot is already booked. Please pick another.');
    }

    // 3. Create booking
    const amount  = paymentAmount || listing.price;
    const booking = await Booking.create({
      customer:      customerId,
      provider:      listing.provider._id,
      listing:       listing._id,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: scheduledTime || null,
      notes:         notes || '',
      address:       resolvedAddress,
      status:        'pending',
      payment: {
        method:    paymentMethod,
        amount,
        status:    'unpaid',
        invoiceId: `INV-${Date.now()}`
      },
      serviceSnapshot: {
        title:    listing.title,
        category: listing.category,
        price:    listing.price,
        unit:     listing.unit
      },
      otpForCompletion: `${Math.floor(100000 + Math.random() * 900000)}`
    });

    // 4. Notify provider — send a booking_notification message to their inbox
    const customer = await User.findById(customerId).select('name phone');
    const dateStr  = new Date(scheduledDate).toLocaleDateString('en-BD', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    await Message.create({
      sender:      customerId,
      receiver:    listing.provider._id,
      booking:     booking._id,
      messageType: 'booking_notification',
      content:     `📅 New Booking! ${customer.name} booked "${listing.title}" for ${dateStr} at ${scheduledTime || 'TBD'}. Amount: ৳${amount}. Ref: ${booking.bookingRef}`,
      notificationData: {
        bookingRef:    booking.bookingRef,
        service:       listing.title,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime,
        customerName:  customer.name,
        customerPhone: customer.phone,
        amount
      }
    });

    // 5. Run fraud auto-detection on this customer
    autoDetect(customerId);

    // 6. Check if customer earns any badges from this booking
    await awardBadgesForBooking(customerId);

    const populated = await Booking.findById(booking._id)
      .populate('listing', 'title category price unit')
      .populate('customer', 'name phone')
      .populate('provider', 'name phone');

    return ok(res, {
      booking: populated,
      bookingRef: booking.bookingRef,
      providerNotified: true
    }, 'Booking created! Provider has been notified.', 201);

  } catch (e) {
    console.error('createBooking error:', e.message);
    return err(res, 'Server error: ' + e.message, 500);
  }
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Get my bookings
// GET /api/schedule/my-bookings
// ─────────────────────────────────────────────────────────
exports.getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { customer: req.user._id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('listing', 'title category price unit locationLabel')
      .populate('provider', 'name phone');

    return ok(res, { bookings });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// PROVIDER: Get bookings for me
// GET /api/schedule/provider-bookings
// ─────────────────────────────────────────────────────────
exports.getProviderBookings = async (req, res) => {
  try {
    const { status } = req.query;

    // Find all listings that belong to this provider
    const myListings = await Listing.find({ provider: req.user._id }).select('_id');
    const myListingIds = myListings.map(l => l._id);

    // Query bookings by listing OR by stored provider field (covers both cases)
    const filter = {
      $or: [
        { listing: { $in: myListingIds } },
        { provider: req.user._id }
      ]
    };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('listing', 'title category price unit emoji')
      .populate('customer', 'name phone email');

    // Mark all as seen
    await Booking.updateMany(
      { listing: { $in: myListingIds }, providerNotified: false },
      { providerNotified: true, providerSeenAt: new Date() }
    );

    return ok(res, { bookings, listingCount: myListingIds.length });
  } catch (e) {
    console.error('getProviderBookings error:', e.message);
    return err(res, e.message, 500);
  }
};

// ─────────────────────────────────────────────────────────
// PROVIDER: Update booking status
// PATCH /api/schedule/:id/status
// ─────────────────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed','in-progress','completed','cancelled'];
    if (!validStatuses.includes(status)) return err(res, 'Invalid status');

    // Check booking ownership via listing (more reliable than stored provider field)
    const booking = await Booking.findById(req.params.id).populate('listing', 'provider');
    if (!booking) return err(res, 'Booking not found', 404);
    const listingProvider = booking.listing && booking.listing.provider
      ? booking.listing.provider.toString()
      : (booking.provider ? booking.provider.toString() : null);
    if (listingProvider !== req.user._id.toString()) {
      return err(res, 'Not authorized', 403);
    }

    booking.status = status;
    await booking.save();

    // Notify customer about status change
    await Message.create({
      sender:      req.user._id,
      receiver:    booking.customer,
      booking:     booking._id,
      messageType: 'system',
      content:     `Your booking ${booking.bookingRef} has been updated to: ${status.toUpperCase()}`
    });

    // Award completion badge if completed
    if (status === 'completed') await awardBadgesForBooking(booking.customer);

    return ok(res, { booking }, `Booking ${status} successfully`);
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// PROVIDER: Seed a test pending booking on their first listing
// POST /api/schedule/seed-booking
// ─────────────────────────────────────────────────────────
exports.seedBooking = async (req, res) => {
  try {
    const providerId = req.user._id;

    // Find this provider's first active listing
    const listing = await Listing.findOne({ provider: providerId, isActive: true });
    if (!listing) return err(res, 'Create at least one listing first, then seed a booking.', 400);

    // Find or create a demo customer
    let customer = await User.findOne({ email: 'demo.customer@khoj.com' });
    if (!customer) {
      const bcrypt = require('bcryptjs');
      customer = await User.create({
        name:     'Demo Customer',
        phone:    '019' + Math.floor(10000000 + Math.random() * 89999999),
        email:    'demo.customer@khoj.com',
        password: 'demo1234',
        role:     'customer'
      });
    }

    // Pick tomorrow as the scheduled date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const booking = await Booking.create({
      customer:      customer._id,
      provider:      providerId,
      listing:       listing._id,
      scheduledDate: tomorrow,
      scheduledTime: '10:00',
      address:       'House 12, Road 5, Demo Area, Dhaka',
      notes:         'This is a test booking to verify your dashboard.',
      status:        'pending',
      payment: {
        method:    'cash',
        amount:    listing.price,
        status:    'unpaid',
        invoiceId: 'INV-DEMO-' + Date.now()
      },
      serviceSnapshot: {
        title:    listing.title,
        category: listing.category,
        price:    listing.price,
        unit:     listing.unit
      }
    });

    await Message.create({
      sender:      customer._id,
      receiver:    providerId,
      booking:     booking._id,
      messageType: 'booking_notification',
      content:     `📅 Test Booking! Demo Customer booked "${listing.title}" for tomorrow at 10:00 AM. Ref: ${booking.bookingRef}`
    });

    const populated = await Booking.findById(booking._id)
      .populate('listing', 'title category price unit emoji')
      .populate('customer', 'name phone email');

    return ok(res, { booking: populated, bookingRef: booking.bookingRef }, 'Test booking created! Check your Bookings tab.', 201);
  } catch (e) {
    console.error('seedBooking error:', e.message);
    return err(res, e.message, 500);
  }
};

// ─────────────────────────────────────────────────────────
// CUSTOMER: Cancel a booking
// PATCH /api/schedule/:id/cancel
// ─────────────────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return err(res, 'Booking not found', 404);
    if (['completed','cancelled'].includes(booking.status)) {
      return err(res, 'Cannot cancel a ' + booking.status + ' booking');
    }
    booking.status = 'cancelled';
    await booking.save();
    await Message.create({
      sender:      req.user._id,
      receiver:    booking.provider,
      booking:     booking._id,
      messageType: 'system',
      content:     `Booking ${booking.bookingRef} has been cancelled by the customer.`
    });
    return ok(res, { booking }, 'Booking cancelled');
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};

// ─────────────────────────────────────────────────────────
// PROVIDER: Count unseen bookings
// GET /api/schedule/unseen-count
// ─────────────────────────────────────────────────────────
exports.getUnseenCount = async (req, res) => {
  try {
    const count = await Booking.countDocuments({
      provider:         req.user._id,
      providerNotified: false
    });
    return ok(res, { unseenCount: count });
  } catch (e) {
    return err(res, 'Server error', 500);
  }
};
