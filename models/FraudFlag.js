const mongoose = require('mongoose');

const fraudFlagSchema = new mongoose.Schema({
  // Who/what is flagged
  targetUser:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetListing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  targetBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  targetType:    { type: String, enum: ['user','listing','booking','review'], required: true },

  // Why it was flagged
  reason:        { type: String, required: true },
  flagType: {
    type: String,
    enum: [
      'fake_listing',        // Provider posted a fake service
      'payment_fraud',       // Suspicious payment activity
      'multiple_accounts',   // Same user creating multiple accounts
      'spam_booking',        // Customer making fake bookings
      'abuse',               // Abusive messages or behavior
      'fake_review',         // Review seems fabricated
      'price_manipulation',  // Provider changing price after booking
      'auto_detected'        // System auto-detected suspicious pattern
    ],
    default: 'auto_detected'
  },

  severity:     { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  flaggedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = auto system
  isAutoDetected:{ type: Boolean, default: false },

  // Resolution
  status:       { type: String, enum: ['open','under_review','resolved','dismissed'], default: 'open' },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   { type: Date },
  resolution:   { type: String }, // what action was taken
  adminNotes:   { type: String },

  // Auto detection data
  autoDetectionData: {
    bookingCount:    Number,  // how many bookings in short time
    cancellationRate:Number,  // % of cancelled bookings
    loginLocations:  [String],// different IPs/locations
    reportCount:     Number   // how many users reported this
  }
}, { timestamps: true });

module.exports = mongoose.model('FraudFlag', fraudFlagSchema);
