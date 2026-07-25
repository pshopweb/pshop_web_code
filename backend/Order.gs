/**
 * PShop — Order.gs
 * Order place karna, list, track, cancel, return/replace aur timeline.
 */

var ORDER_STAGES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

/** Naya order banata hai. */
function apiPlaceOrder(p, user) {
  if (!user) return fail('Please sign in to place an order.', 401);

  var items = p.items || [];
  if (!items.length) return fail('Your cart is empty.');
  if (!p.address)    return fail('Please select a delivery address.');
  if (!p.payment)    return fail('Please choose a payment method.');

  // Stock check — order lene se pehle.
  for (var i = 0; i < items.length; i++) {
    var prod = findOne(CONFIG.SHEETS.PRODUCTS, function (x) {
      return String(x.id) === String(items[i].productId || items[i].id);
    });
    if (prod && Number(prod.stock) < Number(items[i].qty)) {
      return fail('"' + prod.name + '" has only ' + prod.stock + ' unit(s) left.');
    }
  }

  var now = new Date();
  var isCod = p.payment.method === 'cod';
  var status = isCod ? 'Placed' : 'Confirmed';

  var order = {
    id: 'PS' + now.getFullYear() + String(now.getTime()).slice(-8),
    userId: user.id,
    items: JSON.stringify(items),
    address: JSON.stringify(p.address),
    contact: JSON.stringify(p.contact || {}),
    payment: JSON.stringify(p.payment),
    totals: JSON.stringify(p.totals || {}),
    coupon: p.coupon ? JSON.stringify(p.coupon) : '',
    status: status,
    paymentStatus: isCod ? 'Pending' : 'Paid',
    placedAt: now.toISOString(),
    expectedAt: addDays(now, p.shipMode === 'express' ? 2 : 4).toISOString(),
    deliveredAt: '',
    invoiceNo: 'INV-' + now.getFullYear() + '-' + String(now.getTime()).slice(-6),
    awb: 'PSX' + Math.floor(1e9 + Math.random() * 9e9),
    courier: 'PShop Express',
    timeline: JSON.stringify(buildTimeline(status, now)),
    cancelReason: '', returnReason: '',
    cancellable: true, returnable: false,
    updatedAt: now.toISOString()
  };

  appendRow(CONFIG.SHEETS.ORDERS, order);

  // Stock ghatao aur sold badhao.
  for (var j = 0; j < items.length; j++) {
    var pid = items[j].productId || items[j].id;
    var prod2 = findOne(CONFIG.SHEETS.PRODUCTS, function (x) { return String(x.id) === String(pid); });
    if (prod2) {
      updateRow(CONFIG.SHEETS.PRODUCTS, 'id', pid, {
        stock: Math.max(0, Number(prod2.stock) - Number(items[j].qty)),
        sold: (Number(prod2.sold) || 0) + Number(items[j].qty),
        updatedAt: nowISO()
      });
    }
  }

  // Coupon usage + delivery record + cart clear.
  if (p.coupon && p.coupon.code) incrementCouponUsage(p.coupon.code);
  createDeliveryRecord(order);
  apiClearCart({}, user);

  // Notification + confirmation email.
  pushNotification(user.id, 'Order placed successfully',
    'Order ' + order.id + ' for ' + items.length + ' item(s) is confirmed.',
    'order', 'pages/order-details.html?id=' + order.id);

  sendOrderEmail(user, order, items, p.totals);

  return ok({ order: hydrateOrder(order) }, 'Order placed successfully.');
}

/** User ke saare orders. */
function apiGetOrders(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var list = findAll(CONFIG.SHEETS.ORDERS, function (o) {
    return String(o.userId) === String(user.id);
  });
  if (p.status && p.status !== 'all') {
    list = list.filter(function (o) { return o.status === p.status; });
  }
  list.sort(function (a, b) {
    return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
  });
  return ok({ items: list.map(hydrateOrder), total: list.length });
}

/** Ek order ki poori detail. */
function apiGetOrder(p, user) {
  var order = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(p.id); });
  if (!order) return fail('Order not found.', 404);
  // Sirf apna order ya admin dekh sakta hai.
  if (user && user.role !== 'admin' && String(order.userId) !== String(user.id)) {
    return fail('You do not have access to this order.', 403);
  }
  return ok({ order: hydrateOrder(order) });
}

/** Order ID se tracking (login ki zaroorat nahi). */
function apiTrackOrder(p) {
  var order = findOne(CONFIG.SHEETS.ORDERS, function (o) {
    return String(o.id).toUpperCase() === String(p.id || '').trim().toUpperCase();
  });
  if (!order) return fail('We could not find that order ID.', 404);

  var h = hydrateOrder(order);
  return ok({
    order: {
      id: h.id, status: h.status, awb: h.awb, courier: h.courier,
      placedAt: h.placedAt, expectedAt: h.expectedAt,
      address: h.address, items: h.items, timeline: h.timeline
    }
  });
}

/** Order cancel. */
function apiCancelOrder(p, user) {
  var order = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(p.id); });
  if (!order) return fail('Order not found.', 404);
  if (user && user.role !== 'admin' && String(order.userId) !== String(user.id)) {
    return fail('You do not have access to this order.', 403);
  }

  if (['Delivered', 'Cancelled', 'Returned'].indexOf(order.status) > -1) {
    return fail('This order is already ' + String(order.status).toLowerCase() + ' and cannot be cancelled.');
  }

  var timeline = toArray(order.timeline);
  timeline.push({
    stage: 'Cancelled', done: true, at: nowISO(),
    note: 'Cancelled by customer — ' + (p.reason || 'Not specified')
  });

  var payment = toObject(order.payment);
  updateRow(CONFIG.SHEETS.ORDERS, 'id', order.id, {
    status: 'Cancelled', cancellable: false,
    cancelReason: p.reason || 'Not specified',
    paymentStatus: payment.method === 'cod' ? 'Cancelled' : 'Refund initiated',
    timeline: JSON.stringify(timeline), updatedAt: nowISO()
  });

  // Stock wapas add karo.
  var items = toArray(order.items);
  for (var i = 0; i < items.length; i++) {
    var pid = items[i].productId || items[i].id;
    var prod = findOne(CONFIG.SHEETS.PRODUCTS, function (x) { return String(x.id) === String(pid); });
    if (prod) {
      updateRow(CONFIG.SHEETS.PRODUCTS, 'id', pid, {
        stock: Number(prod.stock) + Number(items[i].qty),
        sold: Math.max(0, (Number(prod.sold) || 0) - Number(items[i].qty))
      });
    }
  }

  // Prepaid order ka refund shuru karo.
  if (payment.method !== 'cod') initiateRefund(order.id, toObject(order.totals).total);

  pushNotification(order.userId, 'Order cancelled',
    'Order ' + order.id + ' has been cancelled.', 'order',
    'pages/order-details.html?id=' + order.id);

  var fresh = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(order.id); });
  return ok({ order: hydrateOrder(fresh) },
    'Order cancelled. Refund (if any) starts within 24 hours.');
}

/** Return ya replacement request. */
function apiReturnOrder(p, user) {
  var order = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(p.id); });
  if (!order) return fail('Order not found.', 404);
  if (user && user.role !== 'admin' && String(order.userId) !== String(user.id)) {
    return fail('You do not have access to this order.', 403);
  }
  if (order.status !== 'Delivered') {
    return fail('Only delivered orders can be returned or replaced.');
  }

  var mode = p.mode === 'replace' ? 'replace' : 'return';
  var status = mode === 'replace' ? 'Replacement requested' : 'Return requested';

  var timeline = toArray(order.timeline);
  timeline.push({
    stage: status, done: true, at: nowISO(),
    note: (mode === 'replace' ? 'Replacement' : 'Return') + ' requested — ' + (p.reason || 'Not specified')
  });

  updateRow(CONFIG.SHEETS.ORDERS, 'id', order.id, {
    status: status, returnReason: p.reason || 'Not specified',
    paymentStatus: mode === 'replace' ? order.paymentStatus : 'Refund initiated',
    timeline: JSON.stringify(timeline), updatedAt: nowISO()
  });

  if (mode !== 'replace') initiateRefund(order.id, toObject(order.totals).total);

  pushNotification(order.userId, status,
    'We received your request for order ' + order.id + '. Pickup will be scheduled in 24–48 hrs.',
    'order', 'pages/order-details.html?id=' + order.id);

  var fresh = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(order.id); });
  return ok({ order: hydrateOrder(fresh) },
    (mode === 'replace' ? 'Replacement' : 'Return') + ' request submitted.');
}

/* ======================= HELPERS ======================= */

/** Sheet row ke JSON fields ko objects me badalta hai. */
function hydrateOrder(o) {
  return {
    id: o.id, userId: o.userId,
    items: toArray(o.items),
    address: toObject(o.address),
    contact: toObject(o.contact),
    payment: toObject(o.payment),
    totals: toObject(o.totals),
    coupon: o.coupon ? toObject(o.coupon) : null,
    status: o.status, paymentStatus: o.paymentStatus,
    placedAt: o.placedAt, expectedAt: o.expectedAt, deliveredAt: o.deliveredAt,
    invoiceNo: o.invoiceNo, awb: o.awb, courier: o.courier,
    timeline: toArray(o.timeline),
    cancelReason: o.cancelReason, returnReason: o.returnReason,
    cancellable: o.cancellable === true || o.cancellable === 'TRUE',
    returnable: o.returnable === true || o.returnable === 'TRUE'
  };
}

/** Status ke hisab se timeline banata hai. */
function buildTimeline(status, placedAt) {
  var idx = ORDER_STAGES.indexOf(status);
  var base = new Date(placedAt);
  var notes = [
    'Your order has been placed successfully.',
    'Seller confirmed the order.',
    'Item packed at the fulfilment centre.',
    'Shipped via PShop Express.',
    'Arriving today — keep your phone handy.',
    'Delivered. Thank you for shopping with PShop!'
  ];
  var out = [];
  for (var i = 0; i < ORDER_STAGES.length; i++) {
    out.push({
      stage: ORDER_STAGES[i],
      done: idx >= 0 && i <= idx,
      at: (idx >= 0 && i <= idx) ? addDays(base, i).toISOString() : null,
      note: notes[i]
    });
  }
  return out;
}

/** Order confirmation email. */
function sendOrderEmail(user, order, items, totals) {
  var rows = '';
  for (var i = 0; i < items.length; i++) {
    rows += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">' +
      items[i].name + '<br><span style="color:#64748b;font-size:12px">Qty ' + items[i].qty + '</span></td>' +
      '<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">₹' +
      (Number(items[i].price) * Number(items[i].qty)) + '</td></tr>';
  }
  sendEmail(user.email, 'Order confirmed: ' + order.id,
    emailTemplate('Thank you for your order!',
      '<p>Hi ' + user.name + ', your order <b>' + order.id + '</b> is confirmed.</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:14px 0">' + rows +
      '<tr><td style="padding:8px;font-weight:800">Total</td>' +
      '<td style="padding:8px;text-align:right;font-weight:800">₹' +
      ((totals && totals.total) || 0) + '</td></tr></table>' +
      '<p>Expected delivery: <b>' + new Date(order.expectedAt).toDateString() + '</b><br>' +
      'Tracking ID: ' + order.awb + '</p>'));
}
