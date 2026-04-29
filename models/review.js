const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    listingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
