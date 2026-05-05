const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/fraudController');
const auth    = require('../middleware/auth');

router.post('/report',             auth.protect, ctrl.reportSuspicious);
router.get('/my-status',           auth.protect, ctrl.myFlagStatus);
router.get('/flags',               auth.protect, auth.requireRole('admin'), ctrl.getAllFlags);
router.patch('/flags/:id/resolve', auth.protect, auth.requireRole('admin'), ctrl.resolveFlag);
router.post('/auto-check',         auth.protect, auth.requireRole('admin'), ctrl.runAutoDetect);

module.exports = router;
