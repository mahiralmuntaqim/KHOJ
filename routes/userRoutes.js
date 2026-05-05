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

module.exports = router;
