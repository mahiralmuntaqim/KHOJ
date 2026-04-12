const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.post('/', reviewController.submitReview);
router.get('/listing/:listingId', reviewController.getListingReviews);
router.get('/booking/:bookingId', reviewController.getBookingReview);

module.exports = router;
