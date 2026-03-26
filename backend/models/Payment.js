const mongoose = require('mongoose');

/**
 * Internal status may include `processing` during execute to prevent duplicate bKash calls.
 * Exposed status endpoints map `processing` -> reads as in-flight (still pending from user POV).
 */
const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    /** Unique merchant-side id (also sent to bKash as merchantInvoiceNumber) */
    transactionId: { type: String, required: true, unique: true, maxlength: 255 },
    bkashPaymentId: { type: String, default: null, index: true },
    /** bKash trxID after successful execution */
    bkashTrxId: { type: String, default: null },
    payerReference: { type: String, default: '', maxlength: 255 },
    callbackURL: { type: String, default: '', maxlength: 2048 },
    failureReason: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
