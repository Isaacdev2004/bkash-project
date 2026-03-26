/**
 * Minimal receipt payload for successful payments.
 */
function buildReceipt(payment) {
  const d = payment.updatedAt || payment.createdAt;
  return {
    transactionId: payment.transactionId,
    bkashTrxId: payment.bkashTrxId || null,
    amount: payment.amount,
    status: 'success',
    date: d instanceof Date ? d.toISOString() : d,
  };
}

module.exports = { buildReceipt };
