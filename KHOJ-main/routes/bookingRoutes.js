const express = require('express');
const router = express.Router();
const bookingController = require('../Database/SRC/SRC/controllers/booking');

router.post('/', bookingController.createBooking);
router.get('/customer/:customerId', bookingController.getBookingsForCustomer);

module.exports = router;
