const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'provider', 'customer'], 
        default: 'customer' 
    },
    nidVerification: {
        nidNumber: { type: String, default: null },
        status: { 
            type: String, 
            enum: ['unverified', 'pending', 'verified', 'rejected'], 
            default: 'unverified' 
        }
    },
    badges: [{ type: String }] 
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
