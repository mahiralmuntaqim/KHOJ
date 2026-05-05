const express = require('express');
const Review = require('../../models/review');
const Booking = require('../../models/booking');
const Listing = require('../../models/listings');
const User = require('../../models/user');

const submitReview = async (req, res) => {
  try {
    const { bookingId, rating, title, comment } = req.body;
    const booking = await Booking.findById(bookingId).populate({
      path: 'listing',
      populate: { path: 'provider', model: 'User' }
    }).populate('customer');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed bookings can be reviewed' });
    }

    const existingReview = await Review.findOne({ booking: bookingId, customer: booking.customer._id });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already submitted a review for this booking' });
    }

    const review = await Review.create({
      booking: booking._id,
      listing: booking.listing._id,
      customer: booking.customer._id,
      provider: booking.listing.provider._id,
      rating,
      title,
      comment,
      status: 'published',
      isVerified: true
    });

    // Update listing average rating
    const listing = await Listing.findById(booking.listing._id);
    if (listing) {
      const totalRating = listing.averageRating * listing.reviewCount + rating;
      listing.reviewCount += 1;
      listing.averageRating = totalRating / listing.reviewCount;
      await listing.save();
    }

    return res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('submitReview error:', error);
    return res.status(500).json({ message: 'Unable to submit review', error: error.message });
  }
};

const getListingReviews = async (req, res) => {
  try {
    const { listingId } = req.params;
    const reviews = await Review.find({ listing: listingId, status: 'published' })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    return res.status(200).json(reviews);
  } catch (error) {
    console.error('getListingReviews error:', error);
    return res.status(500).json({ message: 'Unable to load reviews', error: error.message });
  }
};

const getBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const review = await Review.findOne({ booking: bookingId }).populate('customer provider');
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    return res.status(200).json(review);
  } catch (error) {
    console.error('getBookingReview error:', error);
    return res.status(500).json({ message: 'Unable to load review', error: error.message });
  }
};

const router = express.Router();
router.post('/', submitReview);
router.get('/listing/:listingId', getListingReviews);
router.get('/booking/:bookingId', getBookingReview);

module.exports = router;