const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Added for static serve

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added for form data
app.use(express.static(path.join(__dirname, '.'))); // Serve frontend static

mongoose.connect('mongodb://localhost:27017/khojdb')
    .then(() => console.log('MongoDB Connected successfully!'))
    .catch(err => console.error('DB Connection Error:', err));

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`KHOJ Backend running on http://localhost:${PORT}`);
});
