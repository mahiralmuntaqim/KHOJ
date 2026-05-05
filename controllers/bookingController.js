const Booking = require('../models/booking');
const Listing = require('../models/listings');
const User = require('../models/user');

const createBooking = async (req, res) => {
  try {
    const {
      customerId,
      scheduledDate,
      listingTitle,
      category,
      type,
      price,
      unit,
      providerName,
      providerPhone,
      locationLabel
    } = req.body;

    if (!customerId || !scheduledDate || !listingTitle || !category || !price) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found. Please sign in again.' });
    }

    let provider = await User.findOne({ phone: providerPhone || `${listingTitle}-provider` });
    if (!provider) {
      provider = await User.create({
        name: providerName || 'KHOJ Provider',
        phone: providerPhone || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: `provider-${Date.now()}-${Math.floor(Math.random() * 1000)}@khoj.local`,
        password: 'provider-demo',
        role: 'provider'
      });
    }

    let listing = await Listing.findOne({
      title: listingTitle,
      provider: provider._id
    });

    if (!listing) {
      listing = await Listing.create({
        title: listingTitle,
        provider: provider._id,
        category,
        type: type || 'service',
        price,
        unit: unit || 'session',
        description: `${listingTitle} booking created from the KHOJ landing page.`,
        paymentOptions: ['card', 'cash']
      });
    }

    const booking = await Booking.create({
      customer: customer._id,
      listing: listing._id,
      scheduledDate: new Date(scheduledDate),
      status: 'pending',
      payment: {
        method: 'card',
        gateway: 'manual',
        transactionId: '',
        invoiceId: `INV-${Date.now()}`,
        amount: Number(price),
        status: 'unpaid'
      },
      refund: {
        amount: 0,
        reason: '',
        status: 'none',
        requestedAt: null,
        processedAt: null,
        refundTransactionId: '',
        notes: ''
      },
      otpForCompletion: `${Math.floor(100000 + Math.random() * 900000)}`
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'name phone role')
      .populate('listing');

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking,
      summary: {
        listingTitle,
        providerName: provider.name,
        locationLabel: locationLabel || 'Bangladesh',
        amount: Number(price)
      }
    });
  } catch (error) {
    console.error('createBooking error:', error);
    return res.status(500).json({ message: 'Unable to create booking', error: error.message });
  }
};

const getBookingsForCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const bookings = await Booking.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate('listing')
      .populate('customer', 'name phone role');

    return res.status(200).json(bookings);
  } catch (error) {
    console.error('getBookingsForCustomer error:', error);
    return res.status(500).json({ message: 'Unable to load bookings', error: error.message });
  }
};

const getBookingTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const demoTracking = {
      'KHJ-2025-0042': { status: 'in-progress', steps: [true, true, true, false], times: ['Jan 14, 9:00 AM', 'Jan 14, 9:30 AM', 'Jan 14, 10:00 AM', ''] },
      'KHJ-2025-0038': { status: 'completed', steps: [true, true, true, true], times: ['Jan 10, 11:00 AM', 'Jan 10, 11:20 AM', 'Jan 10, 12:00 PM', 'Jan 10, 2:30 PM'] },
      'KHJ-2025-0055': { status: 'pending', steps: [true, false, false, false], times: ['Jan 15, 8:45 AM', '', '', ''] }
    };

    const demo = demoTracking[String(trackingId).toUpperCase()];
    if (demo) {
      return res.status(200).json({
        id: trackingId,
        trackingId,
        ...demo
      });
    }

    const booking = await Booking.findOne({
      $or: [
        { _id: /^[0-9a-fA-F]{24}$/.test(trackingId) ? trackingId : null },
        { 'payment.invoiceId': trackingId }
      ]
    })
      .populate('listing')
      .populate('customer', 'name phone role');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const statusToSteps = {
      pending: [true, false, false, false],
      confirmed: [true, true, false, false],
      'in-progress': [true, true, true, false],
      completed: [true, true, true, true],
      cancelled: [true, false, false, false]
    };

    const createdAt = booking.createdAt || new Date();
    const updatedAt = booking.updatedAt || createdAt;

    return res.status(200).json({
      id: booking._id,
      trackingId: booking.payment?.invoiceId || booking._id,
      status: booking.status,
      steps: statusToSteps[booking.status] || statusToSteps.pending,
      times: [
        createdAt.toLocaleString(),
        booking.status !== 'pending' ? updatedAt.toLocaleString() : '',
        ['in-progress', 'completed'].includes(booking.status) ? updatedAt.toLocaleString() : '',
        booking.status === 'completed' ? updatedAt.toLocaleString() : ''
      ],
      booking
    });
  } catch (error) {
    console.error('getBookingTracking error:', error);
    return res.status(500).json({ message: 'Unable to load tracking', error: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid booking status' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    if (status === 'cancelled' && booking.payment?.status === 'paid') {
      booking.refund = {
        amount: booking.payment.amount,
        reason: 'Order cancelled',
        status: 'requested',
        requestedAt: new Date()
      };
      booking.payment.status = 'refunded';
    }

    await booking.save();
    await booking.populate('listing').populate('customer', 'name phone role');

    return res.status(200).json({ message: 'Booking status updated', booking });
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return res.status(500).json({ message: 'Unable to update booking status', error: error.message });
  }
};

module.exports = {
  createBooking,
  getBookingsForCustomer,
  getBookingTracking,
  updateBookingStatus
};
