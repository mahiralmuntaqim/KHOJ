const mongoose = require('mongoose');

/**
 * Invoice Model
 *
 * A digital receipt / transaction record generated when a booking
 * is confirmed and payment is recorded.
 *
 * Linked to: Booking, Customer (User), Provider (User), Listing
 */
const invoiceSchema = new mongoose.Schema(
  {
    // ── Human-readable invoice number ───────────────────────
    // e.g. "KHJ-INV-2025-0042"
    invoiceNumber: {
      type: String,
      unique: true,
    },

    // ── References ───────────────────────────────────────────
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },

    // ── Snapshot of listing data at time of booking ──────────
    // (in case listing is later edited or deleted)
    serviceSnapshot: {
      title:    { type: String },
      category: { type: String },
      type:     { type: String },
      location: { type: String },
    },

    // ── Financial details ─────────────────────────────────────
    subtotal:      { type: Number, required: true, min: 0 },
    platformFee:   { type: Number, default: 0 },  // KHOJ's cut (future)
    discount:      { type: Number, default: 0 },
    totalAmount:   { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ['card', 'cash', 'mobile_banking'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded', 'partially_refunded'],
      default: 'unpaid',
    },

    // ── Booking date snapshot ─────────────────────────────────
    scheduledDate: { type: Date },
    scheduledTime: { type: String }, // e.g. '2:00 PM'

    // ── Invoice status ────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'issued', 'cancelled'],
      default: 'issued',
    },

    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Auto-generate invoiceNumber before saving ──────────────
invoiceSchema.pre('save', async function (next) {
  if (this.invoiceNumber) return next(); // already set
  const count = await mongoose.model('Invoice').countDocuments();
  const year  = new Date().getFullYear();
  this.invoiceNumber = `KHJ-INV-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

// ── Indexes ──────────────────────────────────────────────────
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ provider: 1, createdAt: -1 });
invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);