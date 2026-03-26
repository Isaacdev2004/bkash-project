const express = require('express');
const { create, execute, status, receipt, mine } = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authMiddleware);

router.get('/mine', asyncHandler(mine));
router.post('/create', asyncHandler(create));
router.post('/execute', asyncHandler(execute));
router.get('/status/:id', asyncHandler(status));
router.get('/receipt/:id', asyncHandler(receipt));

module.exports = router;
