const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const env = require('../config/env');
const bkashService = require('../services/bkashService');
const AppError = require('../utils/AppError');
const { buildReceipt } = require('../utils/receipt');
const {
  assertPositiveAmount,
  sanitizePayerReference,
  sanitizeString,
  sanitizeCallbackUrl,
} = require('../utils/validators');

function publicStatus(p) {
  let status = p.status;
  if (status === 'processing') status = 'pending';
  return {
    id: p._id.toString(),
    userId: p.userId.toString(),
    amount: p.amount,
    status,
    transactionId: p.transactionId,
    bkashPaymentId: p.bkashPaymentId,
    createdAt: p.createdAt,
  };
}

async function create(req, res, next) {
  try {
    let amount;
    try {
      amount = assertPositiveAmount(req.body.amount);
    } catch (err) {
      throw new AppError(err.message, 400);
    }
    let callbackURL;
    try {
      callbackURL = req.body.callbackURL
        ? sanitizeCallbackUrl(req.body.callbackURL)
        : env.BKASH_CALLBACK_BASE_URL;
    } catch {
      throw new AppError('Invalid callback URL', 400);
    }
    if (env.NODE_ENV === 'production' && !callbackURL.startsWith('https://')) {
      throw new AppError('Callback URL must use HTTPS in production', 400);
    }

    const payerReference = sanitizePayerReference(
      typeof req.body.payerReference === 'string' ? req.body.payerReference : ''
    );

    const transactionId = crypto.randomUUID();

    const doc = await Payment.create({
      userId: req.user.id,
      amount,
      status: 'pending',
      transactionId,
      payerReference,
      callbackURL,
    });

    try {
      const bk = await bkashService.createPayment({
        amount,
        merchantInvoiceNumber: transactionId,
        callbackURL,
        payerReference: payerReference || 'customer',
      });

      await Payment.findByIdAndUpdate(doc._id, {
        $set: { bkashPaymentId: bk.paymentID },
      });

      return res.status(201).json({
        success: true,
        data: {
          id: doc._id.toString(),
          transactionId,
          bkashPaymentId: bk.paymentID,
          bkashURL: bk.bkashURL,
        },
      });
    } catch (e) {
      await Payment.findByIdAndUpdate(doc._id, {
        $set: {
          status: 'failed',
          failureReason: (e.message || 'bKash create failed').slice(0, 500),
        },
      });
      throw new AppError(e.message || 'Could not create bKash payment', 502);
    }
  } catch (e) {
    return next(e);
  }
}

async function execute(req, res, next) {
  try {
    const paymentID = sanitizeString(req.body.paymentID, 128);
    if (!paymentID) {
      throw new AppError('paymentID is required', 400);
    }

    let payment = await Payment.findOne({
      bkashPaymentId: paymentID,
      userId: req.user.id,
    });
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status === 'success') {
      return res.json({ success: true, data: { receipt: buildReceipt(payment) } });
    }
    if (payment.status === 'failed') {
      throw new AppError('Payment already failed', 400);
    }
    if (payment.status === 'processing') {
      throw new AppError('Payment is processing', 409);
    }

    const locked = await Payment.findOneAndUpdate(
      { _id: payment._id, userId: req.user.id, status: 'pending' },
      { $set: { status: 'processing' } },
      { new: true }
    );

    if (!locked) {
      payment = await Payment.findById(payment._id);
      if (payment.status === 'success') {
        return res.json({ success: true, data: { receipt: buildReceipt(payment) } });
      }
      throw new AppError('Payment is processing', 409);
    }

    const lockedPayment = locked;

    let updated;
    try {
      const exec = await bkashService.executePayment(paymentID, {
        expectedAmount: lockedPayment.amount,
        merchantInvoiceNumber: lockedPayment.transactionId,
      });

      if (exec.transactionStatus !== 'Completed') {
        await Payment.findByIdAndUpdate(lockedPayment._id, {
          $set: {
            status: 'failed',
            failureReason: 'Execute did not complete',
          },
        });
        throw new AppError('Payment not completed', 400);
      }

      const verified = await bkashService.verifyPaymentCompleted(paymentID);

      const amt = parseFloat(String(verified.amount ?? exec.amount ?? '0'), 10);
      if (!Number.isFinite(amt) || Math.abs(amt - lockedPayment.amount) > 0.01) {
        await Payment.findByIdAndUpdate(lockedPayment._id, {
          $set: { status: 'failed', failureReason: 'Amount verification failed' },
        });
        throw new AppError('Payment verification failed', 502);
      }

      const inv = verified.merchantInvoice || verified.merchantInvoiceNumber;
      if (inv && inv !== lockedPayment.transactionId) {
        await Payment.findByIdAndUpdate(lockedPayment._id, {
          $set: { status: 'failed', failureReason: 'Invoice mismatch' },
        });
        throw new AppError('Payment verification failed', 502);
      }

      const trxId = verified.trxID || exec.trxID;
      updated = await Payment.findByIdAndUpdate(
        lockedPayment._id,
        {
          $set: {
            status: 'success',
            bkashTrxId: trxId,
            failureReason: '',
          },
        },
        { new: true }
      );
    } catch (e) {
      const fresh = await Payment.findById(lockedPayment._id).lean();
      // Only flip from processing → failed if a branch above did not already persist failure
      if (fresh && fresh.status === 'processing') {
        await Payment.findByIdAndUpdate(lockedPayment._id, {
          $set: {
            status: 'failed',
            failureReason: (e.message || 'execute failed').slice(0, 500),
          },
        });
      }
      if (e instanceof AppError) return next(e);
      return next(new AppError(e.message || 'Payment execution failed', 502));
    }

    if (!updated) {
      return next(new AppError('Payment update failed', 500));
    }

    return res.json({
      success: true,
      data: { receipt: buildReceipt(updated) },
    });
  } catch (e) {
    return next(e);
  }
}

async function status(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid id', 400);
    }
    const p = await Payment.findOne({ _id: id, userId: req.user.id });
    if (!p) {
      throw new AppError('Not found', 404);
    }
    return res.json({ success: true, data: publicStatus(p) });
  } catch (e) {
    return next(e);
  }
}

async function receipt(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError('Invalid id', 400);
    }
    const p = await Payment.findOne({ _id: id, userId: req.user.id });
    if (!p) {
      throw new AppError('Not found', 404);
    }
    if (p.status !== 'success') {
      throw new AppError('Receipt available only for successful payments', 400);
    }
    return res.json({ success: true, data: buildReceipt(p) });
  } catch (e) {
    return next(e);
  }
}

function publicListItem(p) {
  let status = p.status;
  if (status === 'processing') status = 'pending';
  return {
    id: p._id.toString(),
    amount: p.amount,
    status,
    transactionId: p.transactionId,
    createdAt: p.createdAt,
  };
}

async function mine(req, res, next) {
  try {
    const rows = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({
      success: true,
      data: rows.map(publicListItem),
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = { create, execute, status, receipt, mine };
