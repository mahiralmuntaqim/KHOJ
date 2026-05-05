const express = require('express');
const router = express.Router();
const parcelController = require('../controllers/parcelController');

router.get('/track/:parcelId', parcelController.getParcelTracking);
router.put('/track/:parcelId', parcelController.upsertParcelTracking);

module.exports = router;
