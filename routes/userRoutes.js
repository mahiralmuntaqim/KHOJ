const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const auth    = require('../middleware/auth');

router.get('/profile', auth.protect, async function(req, res) {
  try {
    var user = await User.findById(req.user._id).select('-password');
    return res.json({ success: true, user: user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/verify-nid', auth.protect, async function(req, res) {
  try {
    var user = await User.findByIdAndUpdate(
      req.user._id,
      { nidVerification: { nidNumber: req.body.nidNumber, frontImageUrl: req.body.frontImageUrl, backImageUrl: req.body.backImageUrl, status: 'pending' } },
      { new: true }
    );
    return res.json({ success: true, message: 'NID submitted for review.', user: user });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
// Add this near your other routes in userRoutes.js (or authRoutes.js)
router.put('/profile', auth.protect, async (req, res) => {
  try {
    if (!req.body.location) {
      return res.status(400).json({ error: 'location is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { location: req.body.location }, 
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      user 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
