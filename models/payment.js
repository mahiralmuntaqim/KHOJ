const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Booking', 
        required: true 
    },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['card', 'mobile_banking', 'cash'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    refundStatus: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
