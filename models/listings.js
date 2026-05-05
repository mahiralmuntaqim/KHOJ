const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['service', 'rental'], required: true },
    description: String,
    price: { type: Number, required: true },
    unit: { type: String, default: 'session' },
    location: { 
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' } 
    },
    paymentOptions: [{ type: String }],
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
