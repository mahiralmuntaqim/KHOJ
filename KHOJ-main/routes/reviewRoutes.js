const express = require('express');
const router = express.Router();
const reviewController = require('../Database/SRC/SRC/controllers/review');

router.post('/', reviewController.submitReview);
router.get('/listing/:listingId', reviewController.getListingReviews);
router.get('/booking/:bookingId', reviewController.getBookingReview);

module.exports = router;
