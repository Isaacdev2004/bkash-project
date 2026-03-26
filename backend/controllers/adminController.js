const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function listTransactions(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const items = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return res.json({
      success: true,
      data: items.map((p) => ({
        id: p._id.toString(),
        userId: p.userId.toString(),
        amount: p.amount,
        status: p.status,
        transactionId: p.transactionId,
        bkashPaymentId: p.bkashPaymentId,
        bkashTrxId: p.bkashTrxId,
        createdAt: p.createdAt,
      })),
    });
  } catch (e) {
    return next(e);
  }
}

async function getTransaction(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid id', 400);
    }
    const p = await Payment.findById(id).lean();
    if (!p) {
      throw new AppError('Not found', 404);
    }
    return res.json({
      success: true,
      data: {
        id: p._id.toString(),
        userId: p.userId.toString(),
        amount: p.amount,
        status: p.status,
        transactionId: p.transactionId,
        bkashPaymentId: p.bkashPaymentId,
        bkashTrxId: p.bkashTrxId,
        payerReference: p.payerReference,
        callbackURL: p.callbackURL,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    });
  } catch (e) {
    return next(e);
  }
}

async function exportCsv(req, res, next) {
  try {
    const cursor = Payment.find().sort({ createdAt: -1 }).cursor();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    const header =
      'id,userId,amount,status,transactionId,bkashPaymentId,bkashTrxId,createdAt\n';
    res.write(header);
    for await (const p of cursor) {
      const row = [
        csvEscape(p._id.toString()),
        csvEscape(p.userId.toString()),
        csvEscape(p.amount),
        csvEscape(p.status),
        csvEscape(p.transactionId),
        csvEscape(p.bkashPaymentId),
        csvEscape(p.bkashTrxId),
        csvEscape(p.createdAt?.toISOString?.() || ''),
      ].join(',');
      res.write(`${row}\n`);
    }
    res.end();
  } catch (e) {
    return next(e);
  }
}

module.exports = { listTransactions, getTransaction, exportCsv };
