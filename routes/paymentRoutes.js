const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/pay', paymentController.createPaymentRecord);
router.post('/refund', paymentController.requestRefund);
router.post('/refund/process', paymentController.processRefund);

module.exports = router;
