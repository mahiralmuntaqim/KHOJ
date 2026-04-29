const mongoose = require('mongoose');

const spaceRentalListingSchema = new mongoose.Schema({
    spaceType: { type: String, required: true }, // e.g., 'Hall', 'Workspace'
    capacity: { type: Number, required: true },
    area: { type: Number }, // square footage
    rentalPricePerDay: { type: Number, required: true },
    amenities: [{ type: String }],
    location: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    providerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('SpaceRentalListing', spaceRentalListingSchema);
