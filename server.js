const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

try { require('dotenv').config(); } catch(e) {}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
var MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/khojdb';
mongoose.connect(MONGO_URI)
  .then(function() { console.log('✅ MongoDB Connected!'); })
  .catch(function(err) { console.log('❌ DB Error:', err.message); });

// Core routes
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/reviews',  require('./routes/reviewRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/stats',    require('./routes/statsRoutes'));

// Feature routes
app.use('/api/fraud',           require('./routes/fraudRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/schedule',        require('./routes/scheduleRoutes'));
app.use('/api/messages',        require('./routes/messageRoutes'));
app.use('/api/badges',          require('./routes/badgeRoutes'));

// Health
app.get('/api/health', function(req, res) {
  res.json({ success: true, message: 'KHOJ API running' });
});

// Pages
app.get('/',          function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/app',       function(req, res) { res.sendFile(path.join(__dirname, 'public', 'app.html')); });
app.get('/customer',  function(req, res) { res.sendFile(path.join(__dirname, 'public', 'customer.html')); });
app.get('/provider',  function(req, res) { res.sendFile(path.join(__dirname, 'public', 'provider.html')); });

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('🚀 KHOJ running on http://localhost:' + PORT);
  console.log('   Landing:   http://localhost:' + PORT + '/');
  console.log('   Main App:  http://localhost:' + PORT + '/app');
});
