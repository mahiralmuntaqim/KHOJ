const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 1. Import CORS first

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express(); // 2. Create the 'app' BEFORE using it!

app.use(cors()); // 3. Now you can use it
app.use(express.json()); 

mongoose.connect('mongodb://localhost:27017/khojdb')
    .then(() => console.log('MongoDB Connected successfully!'))
    .catch(err => console.error('DB Connection Error:', err));

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`KHOJ Backend running on http://localhost:${PORT}`);
});