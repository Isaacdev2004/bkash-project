const express = require('express');
const { signup, login, me } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/signup', authLimiter, asyncHandler(signup));
router.post('/login', authLimiter, asyncHandler(login));
router.get('/me', authMiddleware, asyncHandler(me));

module.exports = router;
