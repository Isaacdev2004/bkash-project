const express = require('express');
const { listTransactions, getTransaction, exportCsv } = require('../controllers/adminController');
const { adminMiddleware } = require('../middleware/admin');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(adminMiddleware);

router.get('/transactions', asyncHandler(listTransactions));
router.get('/transactions/:id', asyncHandler(getTransaction));
router.get('/export', asyncHandler(exportCsv));

module.exports = router;
