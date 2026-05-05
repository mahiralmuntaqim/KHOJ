const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing:   { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, enum: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'] },
  status: { type: String, enum: ['pending','confirmed','in-progress','completed','cancelled'], default: 'pending' },
  payment: {
    method:        { type: String, default: 'cash' },
    amount:        { type: Number, default: 0 },
    status:        { type: String, enum: ['unpaid','paid','refunded'], default: 'unpaid' },
    transactionId: { type: String, default: '' },
    invoiceId:     { type: String }
  },
  refund: {
    amount:      { type: Number, default: 0 },
    reason:      { type: String, default: '' },
    status:      { type: String, enum: ['none','requested','processed','rejected'], default: 'none' },
    requestedAt: Date,
    processedAt: Date
  },
  notes:            { type: String },
  address:          { type: String },
  bookingRef:       { type: String, unique: true, sparse: true },
  otpForCompletion: { type: String },
  providerNotified: { type: Boolean, default: false },
  providerSeenAt:   { type: Date },
  serviceSnapshot: {
    title:    String,
    category: String,
    price:    Number,
    unit:     String
  }
}, { timestamps: true });

bookingSchema.pre('save', async function() {
  if (this.bookingRef) return;
  const count = await mongoose.model('Booking').countDocuments();
  this.bookingRef = 'KHJ-' + String(count + 1).padStart(5, '0');
});

module.exports = mongoose.model('Booking', bookingSchema);