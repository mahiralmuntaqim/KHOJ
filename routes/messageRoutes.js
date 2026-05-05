const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/messageController');
const auth    = require('../middleware/auth');

router.post('/send',                 auth.protect, ctrl.sendMessage);
router.get('/inbox',                 auth.protect, ctrl.getInbox);
router.get('/unread-count',          auth.protect, ctrl.getUnreadCount);
router.get('/booking-notifications', auth.protect, ctrl.getBookingNotifications);
router.get('/conversation/:userId',  auth.protect, ctrl.getConversation);

module.exports = router;
