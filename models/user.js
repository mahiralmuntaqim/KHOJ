const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }, // Added Email Field
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'provider', 'customer'], 
        default: 'customer' 
    }, // For Feature 2: RBAC
    
    // // Feature 14: Identity Verification
    // isVerified: { type: Boolean, default: false },
    // nidNumber: { type: String },
    
    // Feature 14: Identity Verification (Upgraded)
    nidVerification: {
        nidNumber: { type: String, sparse: true },
        frontImageUrl: { type: String },
        backImageUrl: { type: String },
        status: { 
            type: String, 
            enum: ['unverified', 'pending', 'verified', 'rejected'], 
            default: 'unverified' 
        }
    },
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