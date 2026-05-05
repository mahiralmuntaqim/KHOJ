const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/recommendationController');
const auth    = require('../middleware/auth');

router.get('/',            auth.protect, ctrl.getRecommendations);
router.post('/track-view', auth.protect, ctrl.trackView);
router.get('/popular',     ctrl.getPopular);

module.exports = router;
