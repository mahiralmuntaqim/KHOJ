const mongoose = require('mongoose');

/**
 * Availability Model
 *
 * Each provider has ONE Availability document.
 * It stores:
 *   - status toggle (available / busy)
 *   - an array of date strings the provider has marked as busy
 *   - weekly default working hours (optional, for future use)
 */
const availabilitySchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One document per provider
    },

    /**
     * Global status toggle.
     * 'available' → accepting new bookings
     * 'busy'      → not accepting bookings right now
     */
    status: {
      type: String,
      enum: ['available', 'busy'],
      default: 'available',
    },

    /**
     * busyDates: array of date strings in 'YYYY-MM-DD' format
     * the provider manually marks as unavailable.
     * e.g. ["2025-06-15", "2025-06-22"]
     */
    busyDates: {
      type: [String], // stored as 'YYYY-MM-DD' strings for easy frontend comparison
      default: [],
    },

    /**
     * availableDates: dates explicitly marked as open
     * (useful when provider is globally 'busy' but free on specific days)
     */
    availableDates: {
      type: [String],
      default: [],
    },

    /**
     * timeSlots: default time slots the provider offers each day
     * e.g. ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM']
     */
    timeSlots: {
      type: [String],
      default: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'],
    },

    /**
     * bookedSlots: fine-grained record of which date+time slots
     * are already taken by confirmed bookings.
     * Populated automatically when a booking is confirmed.
     */
    bookedSlots: [
      {
        date: { type: String }, // 'YYYY-MM-DD'
        time: { type: String }, // '9:00 AM'
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Availability', availabilitySchema);