const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/verify-nid', userController.submitNidVerification);
router.put('/admin/approve-nid/:userId', userController.approveNid);

module.exports = router;