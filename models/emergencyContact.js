const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  serviceType: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, default: 'Dhaka' },
  available24x7: { type: Boolean, default: true },
  responseTimeMinutes: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
