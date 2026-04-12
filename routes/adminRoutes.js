const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireRole } = require('../middleware/roleMiddleware');

// Dashboard Analytics (Protected by requireRole)
router.get('/dashboard', requireRole(['admin']), adminController.getDashboardStats);

// NID List Management
router.get('/nid-list', adminController.getNidList);
router.put('/approve-nid/:userId', adminController.approveNid); // The Approve Route!
router.put('/reject-nid/:userId', adminController.rejectNid);   // The Reject Route!

module.exports = router;