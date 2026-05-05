const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // optional context
  content:   { type: String, required: true, maxlength: 2000 },
  isRead:    { type: Boolean, default: false },
  readAt:    { type: Date },
  messageType:{ type: String, enum: ['text','booking_notification','system'], default: 'text' },
  // For booking notifications sent to provider
  notificationData: {
    bookingRef:    String,
    service:       String,
    scheduledDate: Date,
    scheduledTime: String,
    customerName:  String,
    customerPhone: String,
    amount:        Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
