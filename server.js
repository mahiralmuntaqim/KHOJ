const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Added for static serve

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentBackend = require('./features/payment-refund/backend');
const reviewBackend = require('./features/reviews-ratings/backend');
const emergencyBackend = require('./features/emergency-services/backend');
const orderTrackingBackend = require('./features/order-status-tracking/backend');
const parcelTrackingBackend = require('./features/parcel-tracking/backend');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added for form data
app.use(express.static(path.join(__dirname, '.'))); // Serve frontend static

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/khojdb';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected successfully!'))
    .catch(err => console.error('DB Connection Error:', err));

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/bookings', orderTrackingBackend);
app.use('/api/payments', paymentBackend);
app.use('/api/reviews', reviewBackend);
app.use('/api/emergency', emergencyBackend);
app.use('/api/parcels', parcelTrackingBackend);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`KHOJ Backend running on http://localhost:${PORT}`);
});
