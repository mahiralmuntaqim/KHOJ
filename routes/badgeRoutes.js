const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/badgeController');
const auth    = require('../middleware/auth');

router.post('/seed',       ctrl.seedBadges);
router.get('/definitions', ctrl.getBadgeDefinitions);
router.get('/my-badges',   auth.protect, ctrl.getMyBadges);
router.post('/award',      auth.protect, auth.requireRole('admin'), ctrl.awardBadge);

module.exports = router;
