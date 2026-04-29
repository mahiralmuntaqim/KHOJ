const mongoose = require('mongoose');

const serviceListingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['per hour', 'per visit', 'per event'], required: true },
    description: { type: String },
    location: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    providerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('ServiceListing', serviceListingSchema);
