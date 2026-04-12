const express = require('express');
const router = express.Router();
const authController = require('../Database/SRC/SRC/controllers/auth');

router.post('/signin', authController.signIn);

module.exports = router;
