const express = require('express');
const Booking = require('../../models/booking');

const getBookingTracking = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const demoTracking = {
      'KHJ-2025-0042': {
        status: 'in-progress',
        steps: [true, true, true, false],
        times: ['Jan 14, 9:00 AM', 'Jan 14, 9:30 AM', 'Jan 14, 10:00 AM', ''],
        locations: ['Warehouse, Farmgate', 'Badda Distribution', 'Mohakhali Hub', 'Destination'],
        currentLocation: 'Mohakhali Hub'
      },
      'KHJ-2025-0038': {
        status: 'completed',
        steps: [true, true, true, true],
        times: ['Jan 10, 11:00 AM', 'Jan 10, 11:20 AM', 'Jan 10, 12:00 PM', 'Jan 10, 2:30 PM'],
        locations: ['Warehouse, Farmgate', 'Badda Distribution', 'Mohakhali Hub', 'Destination'],
        currentLocation: 'Destination'
      },
      'KHJ-2025-0055': {
        status: 'pending',
        steps: [true, false, false, false],
        times: ['Jan 15, 8:45 AM', '', '', ''],
        locations: ['Warehouse, Farmgate', 'Pending assignment', '', ''],
        currentLocation: 'Warehouse, Farmgate'
      }
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

    const routeForStatus = {
      pending: {
        steps: [true, false, false, false],
        locations: ['Warehouse, Farmgate', 'Awaiting payment', '', ''],
        currentLocation: 'Warehouse, Farmgate'
      },
      confirmed: {
        steps: [true, true, false, false],
        locations: ['Warehouse, Farmgate', 'Badda Distribution', '', ''],
        currentLocation: booking.payment?.status === 'paid' ? 'Badda Distribution' : 'Warehouse, Farmgate'
      },
      'in-progress': {
        steps: [true, true, true, false],
        locations: ['Warehouse, Farmgate', 'Badda Distribution', 'Mohakhali Hub', ''],
        currentLocation: 'Mohakhali Hub'
      },
      completed: {
        steps: [true, true, true, true],
        locations: ['Warehouse, Farmgate', 'Badda Distribution', 'Mohakhali Hub', 'Destination'],
        currentLocation: 'Destination'
      },
      cancelled: {
        steps: [true, false, false, false],
        locations: ['Warehouse, Farmgate', '', '', ''],
        currentLocation: 'Warehouse, Farmgate'
      }
    };

    const status = booking.status || 'pending';
    const timeline = routeForStatus[status] || routeForStatus.pending;
    const createdAt = booking.createdAt || new Date();
    const updatedAt = booking.updatedAt || createdAt;

    return res.status(200).json({
      id: booking._id,
      trackingId: booking.payment?.invoiceId || booking._id,
      status,
      steps: timeline.steps,
      times: [
        createdAt.toLocaleString(),
        timeline.steps[1] ? updatedAt.toLocaleString() : '',
        timeline.steps[2] ? updatedAt.toLocaleString() : '',
        timeline.steps[3] ? updatedAt.toLocaleString() : ''
      ],
      locations: timeline.locations,
      currentLocation: timeline.currentLocation,
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

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true, runValidators: true }
    ).populate('listing').populate('customer', 'name phone role');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(200).json({ message: 'Booking status updated', booking });
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return res.status(500).json({ message: 'Unable to update booking status', error: error.message });
  }
};

const router = express.Router();
router.get('/track/:trackingId', getBookingTracking);
router.patch('/:bookingId/status', updateBookingStatus);

module.exports = router;