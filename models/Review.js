const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
  booking:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  listing:    { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  provider:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: '' },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  title:      { type: String, default: '' },
  comment:    { type: String, default: '' },
  status:     { type: String, enum: ['pending','published','flagged'], default: 'published' },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Review', reviewSchema);
