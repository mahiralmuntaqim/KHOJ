const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // For Feature 1: OTP
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'provider', 'customer'], 
        default: 'customer' 
    }, // For Feature 2: RBAC
    
    // Feature 14: Identity Verification
    isVerified: { type: Boolean, default: false },
    nidNumber: { type: String },
    
    // Feature 3 & 16: Trust & Loyalty
    isFlagged: { type: Boolean, default: false }, // Fraud Detection
    badges: [{ type: String }], // Loyalty Badge System
    
    // Feature 5: Location
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' } 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);