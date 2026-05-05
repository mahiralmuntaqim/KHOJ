const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  provider:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, trim: true },
  category:     { type: String, required: true, enum: ['repair','tutor','event','tech','clean','beauty','transport','legal','medical','rental'] },
  type:         { type: String, enum: ['service','rental'], default: 'service' },
  description:  { type: String },
  price:        { type: Number, required: true, min: 0 },
  unit:         { type: String, default: 'session' },
  locationLabel:{ type: String },
  averageRating:{ type: Number, default: 0 },
  reviewCount:  { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  isFlagged:    { type: Boolean, default: false },
  emoji:        { type: String, default: '' },
  tags:         [String]
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
