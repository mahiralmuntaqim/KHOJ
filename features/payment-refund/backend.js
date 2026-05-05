const express = require('express');
const Booking = require('../../models/booking');

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

    if (booking.payment?.status !== 'paid') {
      return res.status(400).json({ message: 'No valid payment found for refund' });
    }

    booking.payment.refund = {
      amount: amount || booking.payment.amount,
      reason: reason || 'Customer request',
      status: 'requested',
      requestedAt: new Date()
    };

    await booking.save();

    return res.status(200).json({ message: 'Refund request submitted', booking });
  } catch (error) {
    console.error('requestRefund error:', error);
    return res.status(500).json({ message: 'Unable to process refund request', error: error.message });
  }
};

const processRefund = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking || !booking.payment?.refund) {
      return res.status(404).json({ message: 'Refund request not found' });
    }

    booking.payment.refund.status = 'processed';
    booking.payment.refund.processedAt = new Date();
    booking.payment.status = 'refunded';

    await booking.save();

    return res.status(200).json({ message: 'Refund processed successfully', booking });
  } catch (error) {
    console.error('processRefund error:', error);
    return res.status(500).json({ message: 'Unable to process refund', error: error.message });
  }
};

const router = express.Router();
router.post('/pay', createPaymentRecord);
router.post('/refund', requestRefund);
router.post('/refund/process', processRefund);

module.exports = router;