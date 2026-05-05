const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    
    scheduledDate: { type: Date, required: true },
    
    // Feature 20: Order Status & Tracking
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    
    // Feature 12 & 21: Payment & Invoicing
    payment: {
        method: String,
        gateway: String,
        transactionId: String,
        invoiceId: String,
        amount: Number,
        status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' }
    },
    refund: {
        amount: Number,
        reason: String,
        status: { type: String, enum: ['none', 'requested', 'processed', 'rejected'], default: 'none' },
        requestedAt: Date,
        processedAt: Date,
        refundTransactionId: String,
        notes: String
    },
    
    otpForCompletion: String // Extra security for service delivery
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
