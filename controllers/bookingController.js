const Booking = require('../models/booking');
const Listing = require('../models/serviceListing'); // FIXED!
const User = require('../models/user');

const createBooking = async (req, res) => {
  try {
    const {
      customerId,
      scheduledDate,
      listingTitle,
      category,
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

module.exports = {
  createBooking,
  getBookingsForCustomer
};
