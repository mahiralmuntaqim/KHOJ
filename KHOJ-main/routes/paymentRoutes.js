const express = require('express');
const router = express.Router();
const paymentController = require('../Database/SRC/SRC/controllers/payment');

router.post('/pay', paymentController.createPaymentRecord);
router.post('/refund', paymentController.requestRefund);
router.post('/refund/process', paymentController.processRefund);

module.exports = router;
