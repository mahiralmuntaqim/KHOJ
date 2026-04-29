const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    listingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ServiceListing', 
        required: true 
    },
    scheduledDate: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'], 
        default: 'pending' 
    },
    totalPrice: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
