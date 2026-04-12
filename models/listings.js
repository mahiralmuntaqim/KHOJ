const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['service', 'rental'], required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
// const bookingSchema = new mongoose.Schema({
//     customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    
//     scheduledDate: { type: Date, required: true },
    
//     // Feature 20: Order Status & Tracking
//     status: { 
//         type: String, 
//         enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'], 
//         default: 'pending' 
//     },
    
//     // Feature 12 & 21: Payment & Invoicing
//     payment: {
//         method: String,
//         transactionId: String,
//         amount: Number,
//         status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' }
//     },
    
//     otpForCompletion: String // Extra security for service delivery
// }, { timestamps: true });

// module.exports = mongoose.model('Booking', bookingSchema);