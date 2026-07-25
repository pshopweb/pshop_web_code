/**
 * PShop — Admin.gs
 * Admin panel ke saare endpoints: dashboard stats, users, products,
 * categories, orders, payments, coupons, reviews, messages, delivery,
 * reports aur website settings.
 *
 * Note: Code.gs already check kar leta hai ki caller admin hai ya nahi.
 */

/* ======================= DASHBOARD ======================= */

/** Dashboard ke KPI numbers. */
function apiAdminStats(p) {
  var products = readAll(CONFIG.SHEETS.PRODUCTS);
  var orders = readAll(CONFIG.SHEETS.ORDERS);
  var users = readAll(CONFIG.SHEETS.USERS);
  var payments = readAll(CONFIG.SHEETS.PAYMENTS);

  var revenue = 0, pending = 0, delivered = 0, cancelled = 0;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    var totals = toObject(o.totals);
    if (o.status !== 'Cancelled') revenue += Number(totals.total) || 0;
    if (['Placed', 'Confirmed', 'Packed'].indexOf(o.status) > -1) pending++;
    if (o.status === 'Delivered') delivered++;
    if (o.status === 'Cancelled') cancelled++;
  }

  // Aaj ke orders.
  var today = new Date().toDateString();
  var todayOrders = orders.filter(function (o) {
    return new Date(o.placedAt).toDateString() === today;
  });

  return ok({
    products: products.length,
    orders: orders.length,
    users: users.filter(function (u) { return u.role !== 'admin'; }).length,
    revenue: revenue,
    pending: pending,
    delivered: delivered,
    cancelled: cancelled,
    todayOrders: todayOrders.length,
    todayRevenue: todayOrders.reduce(function (a, o) {
      return a + (Number(toObject(o.totals).total) || 0);
    }, 0),
    lowStock: products.filter(function (x) {
      return Number(x.stock) > 0 && Number(x.stock) < 10;
    }).length,
    outOfStock: products.filter(function (x) { return Number(x.stock) <= 0; }).length,
    pendingPayments: payments.filter(function (x) { return x.status === 'Pending'; }).length,
    refunds: payments.filter(function (x) { return x.refundStatus === 'Initiated'; }).length,
    openTickets: readAll(CONFIG.SHEETS.MESSAGES).filter(function (m) {
      return m.status === 'open';
    }).length
  });
}

/* ======================= USERS ======================= */

function apiAdminUsers(p) {
  var users = readAll(CONFIG.SHEETS.USERS);
  var orders = readAll(CONFIG.SHEETS.ORDERS);

  var out = users.map(function (u) {
    var mine = orders.filter(function (o) { return String(o.userId) === String(u.id); });
    var spent = mine.reduce(function (a, o) {
      return a + (o.status !== 'Cancelled' ? (Number(toObject(o.totals).total) || 0) : 0);
    }, 0);
    var pub = publicUser(u);
    pub.status = u.status || 'active';
    pub.orderCount = mine.length;
    pub.totalSpent = spent;
    pub.lastLogin = u.lastLogin || '';
    return pub;
  });

  if (p.q) {
    var term = String(p.q).toLowerCase();
    out = out.filter(function (u) {
      return String(u.name).toLowerCase().indexOf(term) > -1 ||
             String(u.email).toLowerCase().indexOf(term) > -1 ||
             String(u.phone).indexOf(term) > -1;
    });
  }
  if (p.role && p.role !== 'all') {
    out = out.filter(function (u) { return u.role === p.role; });
  }

  out.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return ok({ items: out, total: out.length });
}

/** User block / unblock / role change. */
function apiAdminUpdateUser(p) {
  if (!p.userId) return fail('No user specified.');
  var patch = { updatedAt: nowISO() };
  if (p.status) patch.status = p.status;
  if (p.role)   patch.role = p.role;
  if (p.name)   patch.name = p.name;

  var found = updateRow(CONFIG.SHEETS.USERS, 'id', p.userId, patch);
  if (!found) return fail('User not found.', 404);

  return ok({ updated: true }, 'User updated.');
}

function apiAdminDeleteUser(p) {
  if (!p.userId) return fail('No user specified.');
  var user = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(p.userId); });
  if (!user) return fail('User not found.', 404);
  if (user.role === 'admin') return fail('Admin accounts cannot be deleted here.');

  deleteRow(CONFIG.SHEETS.USERS, 'id', p.userId);
  return ok({ deleted: true }, 'User deleted.');
}

/* ======================= PRODUCTS ======================= */

/** Product add (isNew=true) ya update (isNew=false). */
function apiAdminSaveProduct(p, isNew) {
  var d = p.product || p;

  if (!V.required(d.name))  return fail('Product name is required.');
  if (!V.required(d.brand)) return fail('Brand is required.');
  if (!Number(d.price))     return fail('A valid price is required.');

  var price = Number(d.price);
  var mrp = Number(d.mrp) || price;

  var record = {
    name: String(d.name).trim(),
    slug: d.slug || slugifyText(d.name),
    sku: d.sku || ('PS-' + String(d.categorySlug || 'GEN').substring(0, 3).toUpperCase() + '-' + uid('')),
    brand: d.brand,
    categoryId: d.categoryId || '',
    category: d.category || '',
    categorySlug: d.categorySlug || slugifyText(d.category || ''),
    subCategory: d.subCategory || '',
    price: price,
    mrp: mrp,
    discount: mrp > price ? Math.round((1 - price / mrp) * 100) : 0,
    stock: Number(d.stock) || 0,
    inStock: (Number(d.stock) || 0) > 0,
    rating: Number(d.rating) || 0,
    ratingCount: Number(d.ratingCount) || 0,
    reviewCount: Number(d.reviewCount) || 0,
    images: JSON.stringify(toArray(d.images)),
    thumb: d.thumb || toArray(d.images)[0] || '',
    colors: JSON.stringify(toArray(d.colors)),
    highlights: JSON.stringify(toArray(d.highlights)),
    description: d.description || '',
    specs: JSON.stringify(toObject(d.specs)),
    tags: JSON.stringify(toArray(d.tags)),
    deliveryDays: Number(d.deliveryDays) || 3,
    returnDays: Number(d.returnDays) || 7,
    codAvailable: d.codAvailable !== false,
    sold: Number(d.sold) || 0,
    status: d.status || 'active',
    updatedAt: nowISO()
  };

  if (isNew) {
    record.id = nextId(CONFIG.SHEETS.PRODUCTS, 'P', 4);
    record.createdAt = nowISO();
    appendRow(CONFIG.SHEETS.PRODUCTS, record);
    return ok({ product: normalizeProduct(record) }, 'Product added.');
  }

  if (!d.id) return fail('No product ID supplied.');
  var found = updateRow(CONFIG.SHEETS.PRODUCTS, 'id', d.id, record);
  if (!found) return fail('Product not found.', 404);

  return ok({ product: normalizeProduct(record) }, 'Product updated.');
}

function apiAdminDeleteProduct(p) {
  if (!p.id) return fail('No product specified.');
  // Soft delete — order history safe rahe.
  var found = updateRow(CONFIG.SHEETS.PRODUCTS, 'id', p.id,
    { status: 'deleted', updatedAt: nowISO() });
  if (!found) return fail('Product not found.', 404);
  return ok({ deleted: true }, 'Product removed from the catalogue.');
}

/* ======================= CATEGORIES ======================= */

function apiAdminSaveCategory(p, isNew) {
  var d = p.category || p;
  if (!V.required(d.name)) return fail('Category name is required.');

  var record = {
    name: String(d.name).trim(),
    slug: d.slug || slugifyText(d.name),
    description: d.description || '',
    icon: d.icon || '',
    banner: d.banner || '',
    color: d.color || '#2563eb',
    subCategories: JSON.stringify(toArray(d.subCategories)),
    brands: JSON.stringify(toArray(d.brands)),
    productCount: Number(d.productCount) || 0,
    status: d.status || 'active',
    sortOrder: Number(d.sortOrder) || 999
  };

  if (isNew) {
    record.id = nextId(CONFIG.SHEETS.CATEGORIES, 'c', 1);
    record.createdAt = nowISO();
    appendRow(CONFIG.SHEETS.CATEGORIES, record);
    return ok({ category: record }, 'Category added.');
  }

  if (!d.id) return fail('No category ID supplied.');
  var found = updateRow(CONFIG.SHEETS.CATEGORIES, 'id', d.id, record);
  if (!found) return fail('Category not found.', 404);
  return ok({ category: record }, 'Category updated.');
}

function apiAdminDeleteCategory(p) {
  if (!p.id) return fail('No category specified.');
  var count = findAll(CONFIG.SHEETS.PRODUCTS, function (x) {
    return String(x.categoryId) === String(p.id) && String(x.status) === 'active';
  }).length;
  if (count > 0) {
    return fail('This category has ' + count + ' active product(s). Move or delete them first.');
  }
  deleteRow(CONFIG.SHEETS.CATEGORIES, 'id', p.id);
  return ok({ deleted: true }, 'Category deleted.');
}

/* ======================= ORDERS ======================= */

function apiAdminOrders(p) {
  var list = readAll(CONFIG.SHEETS.ORDERS);

  if (p.status && p.status !== 'all') {
    list = list.filter(function (o) { return o.status === p.status; });
  }
  if (p.q) {
    var term = String(p.q).toLowerCase();
    list = list.filter(function (o) {
      var addr = toObject(o.address);
      return String(o.id).toLowerCase().indexOf(term) > -1 ||
             String(addr.name || '').toLowerCase().indexOf(term) > -1 ||
             String(o.awb || '').toLowerCase().indexOf(term) > -1;
    });
  }

  list.sort(function (a, b) {
    return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime();
  });

  return ok({ items: list.map(hydrateOrder), total: list.length });
}

/** Order ka status badalta hai aur timeline rebuild karta hai. */
function apiAdminUpdateOrder(p) {
  if (!p.id) return fail('No order specified.');
  var order = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(p.id); });
  if (!order) return fail('Order not found.', 404);

  var status = p.status;
  var patch = { status: status, updatedAt: nowISO() };

  if (ORDER_STAGES.indexOf(status) > -1) {
    patch.timeline = JSON.stringify(buildTimeline(status, order.placedAt));
  }
  if (status === 'Delivered') {
    patch.deliveredAt = nowISO();
    patch.returnable = true;
    patch.cancellable = false;
    patch.paymentStatus = 'Paid';
  }
  if (status === 'Shipped' || status === 'Out for Delivery') {
    patch.cancellable = false;
  }

  updateRow(CONFIG.SHEETS.ORDERS, 'id', p.id, patch);
  updateDeliveryStatus(p.id, status, 'Status updated to ' + status);

  pushNotification(order.userId, 'Order ' + status.toLowerCase(),
    'Your order ' + order.id + ' is now ' + status + '.',
    'order', 'pages/order-details.html?id=' + order.id);

  var fresh = findOne(CONFIG.SHEETS.ORDERS, function (o) { return String(o.id) === String(p.id); });
  return ok({ order: hydrateOrder(fresh) }, 'Order marked ' + status + '.');
}

/* ======================= PAYMENTS ======================= */

function apiAdminPayments(p) {
  var list = readAll(CONFIG.SHEETS.PAYMENTS);
  if (p.status && p.status !== 'all') {
    list = list.filter(function (x) { return x.status === p.status; });
  }
  list.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  var total = list.reduce(function (a, x) {
    return a + (x.status === 'Paid' ? (Number(x.amount) || 0) : 0);
  }, 0);
  var refunded = list.reduce(function (a, x) { return a + (Number(x.refundAmount) || 0); }, 0);

  return ok({ items: list, total: list.length, collected: total, refunded: refunded });
}

/** Admin manually refund process karta hai. */
function apiAdminRefund(p) {
  if (!p.orderId) return fail('No order specified.');
  var payment = findOne(CONFIG.SHEETS.PAYMENTS, function (x) {
    return String(x.orderId) === String(p.orderId);
  });
  if (!payment) return fail('No payment found for that order.', 404);

  updateRow(CONFIG.SHEETS.PAYMENTS, 'id', payment.id, {
    refundStatus: p.status || 'Completed',
    refundAmount: Number(p.amount) || Number(payment.amount),
    refundedAt: nowISO()
  });
  updateRow(CONFIG.SHEETS.ORDERS, 'id', p.orderId, {
    paymentStatus: 'Refunded', updatedAt: nowISO()
  });

  pushNotification(payment.userId, 'Refund processed',
    'Your refund for order ' + p.orderId + ' has been processed.',
    'payment', 'pages/order-details.html?id=' + p.orderId);

  return ok({ refunded: true }, 'Refund processed.');
}

/* ======================= COUPONS ======================= */

function apiAdminCoupons(p) {
  var list = readAll(CONFIG.SHEETS.COUPONS);
  list.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return ok({ items: list, total: list.length });
}

function apiAdminSaveCoupon(p, isNew) {
  var d = p.coupon || p;
  var code = String(d.code || '').trim().toUpperCase();
  if (!code) return fail('Coupon code is required.');
  if (!d.type) return fail('Coupon type is required.');

  var record = {
    code: code,
    type: d.type,
    value: Number(d.value) || 0,
    minOrder: Number(d.minOrder) || 0,
    maxDiscount: Number(d.maxDiscount) || 0,
    description: d.description || '',
    usageLimit: Number(d.usageLimit) || 10000,
    usedCount: Number(d.usedCount) || 0,
    expiry: d.expiry || '2026-12-31',
    active: d.active !== false
  };

  var existing = findOne(CONFIG.SHEETS.COUPONS, function (c) {
    return String(c.code).toUpperCase() === code;
  });

  if (isNew) {
    if (existing) return fail('A coupon with that code already exists.');
    record.createdAt = nowISO();
    appendRow(CONFIG.SHEETS.COUPONS, record);
    return ok({ coupon: record }, 'Coupon created.');
  }

  if (!existing) return fail('Coupon not found.', 404);
  updateRow(CONFIG.SHEETS.COUPONS, 'code', code, record);
  return ok({ coupon: record }, 'Coupon updated.');
}

function apiAdminDeleteCoupon(p) {
  if (!p.code) return fail('No coupon specified.');
  deleteRow(CONFIG.SHEETS.COUPONS, 'code', String(p.code).toUpperCase());
  return ok({ deleted: true }, 'Coupon deleted.');
}

/* ======================= REVIEWS ======================= */

function apiAdminReviews(p) {
  var list = readAll(CONFIG.SHEETS.REVIEWS);
  if (p.status && p.status !== 'all') {
    list = list.filter(function (r) { return String(r.status || 'approved') === p.status; });
  }
  list.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return ok({ items: list, total: list.length });
}

/** Review approve / hide / delete. */
function apiAdminModerateReview(p) {
  if (!p.id) return fail('No review specified.');

  if (p.action === 'delete') {
    var rev = findOne(CONFIG.SHEETS.REVIEWS, function (r) { return String(r.id) === String(p.id); });
    deleteRow(CONFIG.SHEETS.REVIEWS, 'id', p.id);
    if (rev) recalculateProductRating(rev.productId);
    return ok({ deleted: true }, 'Review deleted.');
  }

  var status = p.action === 'hide' ? 'hidden' : 'approved';
  var found = updateRow(CONFIG.SHEETS.REVIEWS, 'id', p.id, { status: status });
  if (!found) return fail('Review not found.', 404);

  var r2 = findOne(CONFIG.SHEETS.REVIEWS, function (r) { return String(r.id) === String(p.id); });
  if (r2) recalculateProductRating(r2.productId);

  return ok({ status: status }, 'Review ' + status + '.');
}

/* ======================= MESSAGES ======================= */

function apiAdminMessages(p) {
  var list = readAll(CONFIG.SHEETS.MESSAGES);
  if (p.status && p.status !== 'all') {
    list = list.filter(function (m) { return m.status === p.status; });
  }
  list.sort(function (a, b) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return ok({
    items: list.map(function (m) {
      return {
        id: m.id, userId: m.userId, from: m.name, email: m.email,
        subject: m.subject, thread: toArray(m.thread),
        status: m.status, unread: m.unread === true || m.unread === 'TRUE',
        at: m.updatedAt || m.createdAt
      };
    }),
    total: list.length
  });
}

/** Admin support ticket ka reply. */
function apiAdminReplyMessage(p) {
  if (!p.threadId || !p.text) return fail('Thread and reply text are required.');

  var thread = findOne(CONFIG.SHEETS.MESSAGES, function (m) {
    return String(m.id) === String(p.threadId);
  });
  if (!thread) return fail('Conversation not found.', 404);

  var msgs = toArray(thread.thread);
  msgs.push({ by: 'support', text: String(p.text).trim(), at: nowISO() });

  updateRow(CONFIG.SHEETS.MESSAGES, 'id', thread.id, {
    thread: JSON.stringify(msgs),
    status: p.close ? 'closed' : 'open',
    unread: true, updatedAt: nowISO()
  });

  pushNotification(thread.userId, 'Support replied',
    'You have a new reply on "' + thread.subject + '".', 'system', 'pages/messages.html');

  if (thread.email) {
    sendEmail(thread.email, 'Re: ' + thread.subject,
      emailTemplate('Our team replied',
        '<p>' + String(p.text) + '</p><p style="color:#64748b;font-size:13px">' +
        'Reply to this conversation from your PShop Messages page.</p>'));
  }

  return ok({ replied: true }, 'Reply sent.');
}

/* ======================= DELIVERY ======================= */

function apiAdminDelivery(p) {
  var list = readAll(CONFIG.SHEETS.DELIVERY);
  if (p.status && p.status !== 'all') {
    list = list.filter(function (d) { return d.status === p.status; });
  }
  list.sort(function (a, b) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return ok({
    items: list.map(function (d) { d.updates = toArray(d.updates); return d; }),
    total: list.length
  });
}

function apiAdminUpdateDelivery(p) {
  if (!p.orderId) return fail('No order specified.');
  var done = updateDeliveryStatus(p.orderId, p.status, p.note, p.agent, p.agentPhone);
  if (!done) return fail('Delivery record not found.', 404);
  return ok({ updated: true }, 'Delivery updated.');
}

/* ======================= REPORTS ======================= */

/** Sales, top products aur category-wise report. */
function apiAdminReports(p) {
  var orders = readAll(CONFIG.SHEETS.ORDERS).filter(function (o) {
    return o.status !== 'Cancelled';
  });
  var products = readAll(CONFIG.SHEETS.PRODUCTS);

  // Pichhle 30 din ka daily revenue.
  var daily = {};
  var since = new Date().getTime() - 30 * 864e5;
  for (var i = 0; i < orders.length; i++) {
    var t = new Date(orders[i].placedAt).getTime();
    if (t < since) continue;
    var day = new Date(orders[i].placedAt).toISOString().slice(0, 10);
    daily[day] = (daily[day] || 0) + (Number(toObject(orders[i].totals).total) || 0);
  }
  var salesSeries = [];
  for (var d in daily) if (daily.hasOwnProperty(d)) salesSeries.push({ date: d, revenue: daily[d] });
  salesSeries.sort(function (a, b) { return a.date.localeCompare(b.date); });

  // Top selling products.
  var sold = {};
  for (var j = 0; j < orders.length; j++) {
    var items = toArray(orders[j].items);
    for (var k = 0; k < items.length; k++) {
      var id = items[k].productId || items[k].id;
      if (!sold[id]) sold[id] = { id: id, name: items[k].name, qty: 0, revenue: 0 };
      sold[id].qty += Number(items[k].qty) || 0;
      sold[id].revenue += (Number(items[k].price) || 0) * (Number(items[k].qty) || 0);
    }
  }
  var topProducts = [];
  for (var s in sold) if (sold.hasOwnProperty(s)) topProducts.push(sold[s]);
  topProducts.sort(function (a, b) { return b.qty - a.qty; });

  // Category-wise revenue.
  var byCategory = {};
  for (var m = 0; m < products.length; m++) {
    var cat = products[m].category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, products: 0, stock: 0 };
    byCategory[cat].products++;
    byCategory[cat].stock += Number(products[m].stock) || 0;
  }
  var categoryStats = [];
  for (var c in byCategory) if (byCategory.hasOwnProperty(c)) categoryStats.push(byCategory[c]);

  return ok({
    salesSeries: salesSeries,
    topProducts: topProducts.slice(0, 10),
    categoryStats: categoryStats,
    totalRevenue: orders.reduce(function (a, o) {
      return a + (Number(toObject(o.totals).total) || 0);
    }, 0),
    avgOrderValue: orders.length
      ? Math.round(orders.reduce(function (a, o) {
          return a + (Number(toObject(o.totals).total) || 0);
        }, 0) / orders.length)
      : 0,
    orderCount: orders.length
  });
}

/* ======================= SETTINGS ======================= */

function apiAdminSettings(p) {
  var rows = readAll(CONFIG.SHEETS.SETTINGS);
  var map = {};
  for (var i = 0; i < rows.length; i++) map[rows[i].key] = rows[i].value;
  return ok({ settings: map, rows: rows });
}

function apiAdminUpdateSettings(p) {
  var updates = p.settings || {};
  var count = 0;
  for (var key in updates) {
    if (!updates.hasOwnProperty(key)) continue;
    var found = updateRow(CONFIG.SHEETS.SETTINGS, 'key', key,
      { value: updates[key], updatedAt: nowISO() });
    if (!found) {
      appendRow(CONFIG.SHEETS.SETTINGS,
        { key: key, value: updates[key], description: '', updatedAt: nowISO() });
    }
    count++;
  }
  return ok({ updated: count }, count + ' setting(s) saved.');
}

/* ======================= HELPERS ======================= */

/** Text ko URL-friendly slug me badalta hai. */
function slugifyText(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
