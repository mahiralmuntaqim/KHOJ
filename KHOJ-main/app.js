const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('./Database/SRC/SRC/user');
require('./Database/SRC/SRC/listings');
require('./Database/SRC/SRC/booking');
require('./Database/SRC/SRC/review');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/khoj';
const FRONTEND_DIR = __dirname;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(FRONTEND_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
