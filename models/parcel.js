const mongoose = require('mongoose');

const parcelSchema = new mongoose.Schema({
  parcelId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  status: {
    type: String,
    enum: ['created', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'created'
  },
  origin: { type: String, default: 'Warehouse' },
  destination: { type: String, default: 'Customer Address' },
  currentLocation: { type: String, default: 'Warehouse' },
  eta: { type: String, default: 'Today, 4-6 PM' },
  events: [{
    label: String,
    location: String,
    timestamp: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Parcel', parcelSchema);
