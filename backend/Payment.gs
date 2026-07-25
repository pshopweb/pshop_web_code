/**
 * PShop — Payment.gs
 * Payment record karna, status check aur refund handling.
 */

/** Payment record save karta hai. */
function apiSavePayment(p, user) {
  if (!p.orderId) return fail('No order specified.');

  var record = {
    id: uid('PAY'),
    orderId: p.orderId,
    userId: user ? user.id : (p.userId || 'guest'),
    method: p.method || 'cod',
    amount: Number(p.amount) || 0,
    status: p.status || 'Paid',
    reference: p.reference || uid('TXN'),
    app: p.app || '',
    last4: p.last4 || '',
    refundStatus: '', refundAmount: '', refundedAt: '',
    createdAt: nowISO()
  };
  appendRow(CONFIG.SHEETS.PAYMENTS, record);

  // Order par payment status update.
  updateRow(CONFIG.SHEETS.ORDERS, 'id', p.orderId,
    { paymentStatus: record.status, updatedAt: nowISO() });

  return ok({ payment: record }, 'Payment recorded.');
}

/** Order ka payment status. */
function apiGetPaymentStatus(p) {
  var payment = findOne(CONFIG.SHEETS.PAYMENTS, function (x) {
    return String(x.orderId) === String(p.orderId);
  });
  if (!payment) return fail('No payment found for that order.', 404);
  return ok({ payment: payment });
}

/** Refund status. */
function apiGetRefundStatus(p) {
  var payment = findOne(CONFIG.SHEETS.PAYMENTS, function (x) {
    return String(x.orderId) === String(p.orderId);
  });
  if (!payment) return fail('No payment found for that order.', 404);

  return ok({
    refundStatus: payment.refundStatus || 'Not applicable',
    refundAmount: Number(payment.refundAmount) || 0,
    refundedAt: payment.refundedAt || null,
    // Prepaid refunds 3-5 working days, COD 5-7.
    expectedBy: payment.refundedAt
      ? addDays(new Date(payment.refundedAt), payment.method === 'cod' ? 7 : 5).toISOString()
      : null
  });
}

/** Refund shuru karta hai (Order.gs se call hota hai). */
function initiateRefund(orderId, amount) {
  var payment = findOne(CONFIG.SHEETS.PAYMENTS, function (x) {
    return String(x.orderId) === String(orderId);
  });
  if (!payment) return false;

  updateRow(CONFIG.SHEETS.PAYMENTS, 'id', payment.id, {
    refundStatus: 'Initiated',
    refundAmount: Number(amount) || Number(payment.amount),
    refundedAt: nowISO()
  });

  pushNotification(payment.userId, 'Refund initiated',
    'Your refund of ₹' + (amount || payment.amount) + ' for order ' + orderId +
    ' has been initiated and will reach you in 3–5 business days.',
    'payment', 'pages/order-details.html?id=' + orderId);

  return true;
}
