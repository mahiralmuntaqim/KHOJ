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
    
    // Feature 12: Payment
    payment: {
        method: { type: String, enum: ['card', 'bank-transfer', 'mobile-wallet', 'cash'], default: 'card' },
        gateway: String,
        transactionId: String,
        invoiceId: String,
        amount: { type: Number, required: true },
        status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' }
    },
    
    // Feature 22: Refund Management
    refund: {
        amount: Number,
        reason: String,
        status: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'processed'], default: 'none' },
        requestedAt: Date,
        processedAt: Date,
        refundTransactionId: String,
        notes: String
    },
    
    // Extra security for service delivery
    otpForCompletion: String
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);