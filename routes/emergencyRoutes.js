const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

router.get('/contacts', emergencyController.getEmergencyContacts);
router.post('/request', emergencyController.requestEmergencySupport);

module.exports = router;
