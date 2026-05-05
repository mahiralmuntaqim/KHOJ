const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/scheduleController');
const auth    = require('../middleware/auth');

router.get('/slots',             ctrl.getSlots);
router.post('/seed-booking',     auth.protect, auth.requireRole('provider'), ctrl.seedBooking);
router.post('/book',             auth.protect, auth.requireRole('customer'), ctrl.createBooking);
router.get('/my-bookings',       auth.protect, auth.requireRole('customer'), ctrl.getMyBookings);
router.get('/provider-bookings', auth.protect, auth.requireRole('provider'), ctrl.getProviderBookings);
router.get('/unseen-count',      auth.protect, auth.requireRole('provider'), ctrl.getUnseenCount);
router.patch('/:id/cancel',      auth.protect, auth.requireRole('customer'), ctrl.cancelBooking);
router.patch('/:id/status',      auth.protect, auth.requireRole('provider'), ctrl.updateStatus);

module.exports = router;
