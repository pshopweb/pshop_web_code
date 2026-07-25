/**
 * PShop — Cart.gs
 * Server-side cart: add, update qty, remove, clear aur totals calculation.
 */

/** User ka cart + totals. */
function apiGetCart(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var items = findAll(CONFIG.SHEETS.CART, function (c) {
    return String(c.userId) === String(user.id);
  });
  return ok({ items: items, totals: calculateTotals(items, p.coupon, p.shipMode) });
}

/** Cart me product add karta hai (already ho to qty badha deta hai). */
function apiAddCart(p, user) {
  if (!user) return fail('Please sign in.', 401);
  if (!p.productId) return fail('No product specified.');

  var product = findOne(CONFIG.SHEETS.PRODUCTS, function (x) {
    return String(x.id) === String(p.productId);
  });
  if (!product) return fail('Product not found.', 404);
  if (Number(product.stock) <= 0) return fail('This product is out of stock.');

  var qty = Math.max(1, parseInt(p.qty, 10) || 1);
  var maxQty = Math.min(10, Number(product.stock));
  var variant = p.variant || '';

  var existing = findOne(CONFIG.SHEETS.CART, function (c) {
    return String(c.userId) === String(user.id) &&
           String(c.productId) === String(p.productId) &&
           String(c.variant || '') === String(variant);
  });

  if (existing) {
    var newQty = Math.min(maxQty, Number(existing.qty) + qty);
    updateRow(CONFIG.SHEETS.CART, 'id', existing.id, { qty: newQty });
  } else {
    appendRow(CONFIG.SHEETS.CART, {
      id: uid('CRT'), userId: user.id, productId: product.id,
      name: product.name, brand: product.brand,
      price: Number(product.price), mrp: Number(product.mrp),
      image: product.thumb || toArray(product.images)[0] || '',
      slug: product.slug, variant: variant,
      qty: Math.min(qty, maxQty), stock: Number(product.stock),
      codAvailable: product.codAvailable !== false,
      addedAt: nowISO()
    });
  }

  return apiGetCart(p, user);
}

/** Quantity update. */
function apiUpdateCart(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var line = findOne(CONFIG.SHEETS.CART, function (c) {
    return String(c.id) === String(p.lineId) && String(c.userId) === String(user.id);
  });
  if (!line) return fail('Cart item not found.', 404);

  var qty = parseInt(p.qty, 10) || 1;
  var max = Math.min(10, Number(line.stock) || 10);
  qty = Math.max(1, Math.min(qty, max));

  updateRow(CONFIG.SHEETS.CART, 'id', line.id, { qty: qty });
  return apiGetCart(p, user);
}

/** Ek line remove. */
function apiRemoveCart(p, user) {
  if (!user) return fail('Please sign in.', 401);
  deleteRow(CONFIG.SHEETS.CART, 'id', p.lineId);
  return apiGetCart(p, user);
}

/** Pura cart khaali. */
function apiClearCart(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var sh = getSheet(CONFIG.SHEETS.CART);
  var values = sh.getDataRange().getValues();
  var col = values[0].indexOf('userId');
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][col]) === String(user.id)) sh.deleteRow(r + 1);
  }
  return ok({ items: [], totals: calculateTotals([], null) }, 'Cart cleared.');
}

/**
 * Totals nikalta hai — frontend ke Cart.totals() se bilkul same logic.
 * @param {Array} items
 * @param {Object} coupon
 * @param {string} shipMode 'standard' | 'express'
 */
function calculateTotals(items, coupon, shipMode) {
  var subtotal = 0, mrpTotal = 0, count = 0;
  for (var i = 0; i < items.length; i++) {
    var qty = Number(items[i].qty) || 1;
    var price = Number(items[i].price) || 0;
    var mrp = Number(items[i].mrp) || price;
    subtotal += price * qty;
    mrpTotal += mrp * qty;
    count += qty;
  }

  var savings = Math.max(0, mrpTotal - subtotal);
  var discount = 0, freeShip = false;

  if (coupon) {
    if (coupon.type === 'percent') {
      discount = Math.min(Math.round(subtotal * Number(coupon.value) / 100),
                          Number(coupon.maxDiscount) || subtotal);
    } else if (coupon.type === 'flat') {
      discount = Math.min(Number(coupon.value), subtotal);
    } else if (coupon.type === 'shipping') {
      freeShip = true;
    }
  }

  var taxable = Math.max(0, subtotal - discount);
  var shipping = 0;
  if (taxable > 0) {
    shipping = (shipMode === 'express')
      ? CONFIG.EXPRESS_FEE
      : (taxable >= CONFIG.FREE_SHIP_ABOVE ? 0 : CONFIG.SHIPPING_FEE);
    if (freeShip && shipMode !== 'express') shipping = 0;
  }

  // Listed prices GST-inclusive hain; tax sirf dikhane ke liye.
  var tax = Math.round(taxable - taxable / (1 + CONFIG.TAX_RATE));

  return {
    count: count, lines: items.length,
    subtotal: subtotal, mrpTotal: mrpTotal, savings: savings,
    discount: discount, shipping: shipping, tax: tax,
    total: taxable + shipping,
    freeShipEligible: taxable >= CONFIG.FREE_SHIP_ABOVE,
    amountToFreeShip: Math.max(0, CONFIG.FREE_SHIP_ABOVE - taxable),
    couponCode: coupon ? coupon.code : null
  };
}
