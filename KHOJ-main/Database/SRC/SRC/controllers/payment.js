const Booking = require('../booking');

const createPaymentRecord = async (req, res) => {
  try {
    const { bookingId, method, gateway, transactionId, invoiceId, amount } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const currentPayment = booking.payment || {};

    if (currentPayment.status === 'paid') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    const normalizedMethod = method === 'offline' ? 'cash' : method === 'online' ? 'card' : method || 'card';
    const normalizedGateway = gateway === 'offline' ? 'offline' : gateway === 'online' ? 'online' : gateway || 'manual';

    booking.payment = {
      method: normalizedMethod,
      gateway: normalizedGateway,
      transactionId: transactionId || '',
      invoiceId: invoiceId || `INV-${Date.now()}`,
      amount: amount || currentPayment.amount || 0,
      status: 'paid'
    };
    booking.status = 'confirmed';

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('listing')
      .populate('customer', 'name phone role');

    return res.status(200).json({ message: 'Payment recorded successfully', booking: populatedBooking });
  } catch (error) {
    console.error('createPaymentRecord error:', error);
    return res.status(500).json({ message: 'Unable to record payment', error: error.message });
  }
};

const requestRefund = async (req, res) => {
  try {
    const { bookingId, amount, reason } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.payment.status !== 'paid') {
      return res.status(400).json({ message: 'Only paid bookings can request refunds' });
    }

    if (booking.refund && booking.refund.status !== 'none') {
      return res.status(400).json({ message: 'Refund already requested or processed' });
    }

    if (amount > booking.payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed paid amount' });
    }

    booking.refund = {
      amount,
      reason,
      status: 'requested',
      requestedAt: new Date(),
      processedAt: null,
      refundTransactionId: null,
      notes: ''
    };

    await booking.save();
    return res.status(200).json({ message: 'Refund requested successfully', refund: booking.refund });
  } catch (error) {
    console.error('requestRefund error:', error);
    return res.status(500).json({ message: 'Unable to request refund', error: error.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const { bookingId, approve, refundTransactionId, notes } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.refund || booking.refund.status !== 'requested') {
      return res.status(400).json({ message: 'No refund request pending for this booking' });
    }

    if (approve) {
      booking.refund.status = 'processed';
      booking.payment.status = 'refunded';
      booking.status = 'cancelled';
      booking.refund.processedAt = new Date();
      booking.refund.refundTransactionId = refundTransactionId || `REF-${Date.now()}`;
      booking.refund.notes = notes || 'Refund processed successfully';
    } else {
      booking.refund.status = 'rejected';
      booking.refund.processedAt = new Date();
      booking.refund.notes = notes || 'Refund request rejected';
    }

    await booking.save();
    return res.status(200).json({ message: 'Refund updated successfully', refund: booking.refund });
  } catch (error) {
    console.error('processRefund error:', error);
    return res.status(500).json({ message: 'Unable to process refund', error: error.message });
  }
};

module.exports = {
  createPaymentRecord,
  requestRefund,
  processRefund
};
