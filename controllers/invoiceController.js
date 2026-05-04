const Invoice = require('../models/Invoice');
const Booking = require('../models/booking');

// ─────────────────────────────────────────────────────────────
// HELPER: called by bookingController when a booking is confirmed
// Creates/updates the Invoice for a booking
// ─────────────────────────────────────────────────────────────
exports.createInvoiceForBooking = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('listing')
      .populate('customer', 'name phone email')
      .populate('listing.provider');

    if (!booking) throw new Error('Booking not found for invoice generation.');

    // Avoid duplicates
    const existing = await Invoice.findOne({ booking: bookingId });
    if (existing) return existing;

    const listing = booking.listing;

    const invoice = await Invoice.create({
      booking:       booking._id,
      customer:      booking.customer._id || booking.customer,
      provider:      listing.provider,
      listing:       listing._id,
      serviceSnapshot: {
        title:    listing.title,
        category: listing.category,
        type:     listing.type,
        location: listing.location,
      },
      subtotal:      booking.payment?.amount || listing.price,
      platformFee:   0,
      discount:      0,
      totalAmount:   booking.payment?.amount || listing.price,
      paymentMethod: booking.payment?.method || 'cash',
      paymentStatus: booking.payment?.status || 'unpaid',
      scheduledDate: booking.scheduledDate,
      status:        'issued',
    });

    return invoice;
  } catch (err) {
    console.error('createInvoiceForBooking error:', err);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/invoices/my
// Protected – customer fetches their own order history (invoices)
// Query: ?status=paid&page=1&limit=10
// ─────────────────────────────────────────────────────────────
exports.getMyInvoices = async (req, res) => {
  try {
    const filter = { customer: req.user._id };

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('listing', 'title category type location')
        .populate('provider', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages:   Math.ceil(total / limit),
      count:   invoices.length,
      invoices,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your order history.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/invoices/provider
// Protected (provider) – provider fetches their earnings history
// ─────────────────────────────────────────────────────────────
exports.getProviderInvoices = async (req, res) => {
  try {
    const filter = { provider: req.user._id };

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('listing', 'title category type location')
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    // Compute total earnings from paid invoices
    const earningsAgg = await Invoice.aggregate([
      { $match: { provider: req.user._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalEarnings = earningsAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      totalEarnings,
      total,
      page,
      pages:   Math.ceil(total / limit),
      count:   invoices.length,
      invoices,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch earnings history.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/invoices/:id
// Protected – get a single invoice (customer or provider only)
// This is the "digital receipt" endpoint
// ─────────────────────────────────────────────────────────────
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('listing',  'title category type location price priceUnit')
      .populate('customer', 'name phone email')
      .populate('provider', 'name phone')
      .populate('booking',  'status scheduledDate payment');

    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    // Only the customer, provider, or admin can view
    const userId = req.user._id.toString();
    const isCustomer = invoice.customer?._id?.toString() === userId;
    const isProvider = invoice.provider?._id?.toString() === userId;
    const isAdmin    = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Not authorised to view this invoice.' });
    }

    res.status(200).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/invoices/booking/:bookingId
// Protected – get invoice by booking ID (customer or provider)
// ─────────────────────────────────────────────────────────────
exports.getInvoiceByBooking = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ booking: req.params.bookingId })
      .populate('listing',  'title category type location price priceUnit')
      .populate('customer', 'name phone email')
      .populate('provider', 'name phone')
      .populate('booking',  'status scheduledDate payment');

    if (!invoice) {
      return res.status(404).json({ error: 'No invoice found for this booking.' });
    }

    const userId     = req.user._id.toString();
    const isCustomer = invoice.customer?._id?.toString() === userId;
    const isProvider = invoice.provider?._id?.toString() === userId;
    const isAdmin    = req.user.role === 'admin';

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ error: 'Not authorised.' });
    }

    res.status(200).json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice.' });
  }
};