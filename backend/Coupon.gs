/**
 * PShop — Coupon.gs
 * Coupons list aur verification (discount calculation ke saath).
 */

/** Saare active coupons. */
function apiGetCoupons(p) {
  var now = new Date().getTime();
  var items = readAll(CONFIG.SHEETS.COUPONS).filter(function (c) {
    var active = c.active === true || c.active === 'TRUE' || c.active === 'true';
    var notExpired = !c.expiry || new Date(c.expiry).getTime() >= now;
    return active && notExpired;
  });
  return ok({ items: items });
}

/** Coupon check karke discount amount deta hai. */
function apiVerifyCoupon(p) {
  var code = String(p.code || '').trim().toUpperCase();
  var subtotal = Number(p.subtotal) || 0;

  if (!code) return fail('Please enter a coupon code.');

  var coupon = findOne(CONFIG.SHEETS.COUPONS, function (c) {
    return String(c.code).toUpperCase() === code;
  });
  if (!coupon) return fail('That coupon code is not valid.');

  var active = coupon.active === true || coupon.active === 'TRUE' || coupon.active === 'true';
  if (!active) return fail('This coupon is no longer active.');

  if (coupon.expiry && new Date(coupon.expiry).getTime() < new Date().getTime()) {
    return fail('This coupon has expired.');
  }

  var limit = Number(coupon.usageLimit) || 0;
  var used = Number(coupon.usedCount) || 0;
  if (limit > 0 && used >= limit) return fail('This coupon has reached its usage limit.');

  var minOrder = Number(coupon.minOrder) || 0;
  if (subtotal < minOrder) {
    return fail('Add ₹' + (minOrder - subtotal) + ' more to use ' + coupon.code + '.');
  }

  var discount = 0, freeShip = false;
  if (coupon.type === 'percent') {
    discount = Math.min(Math.round(subtotal * Number(coupon.value) / 100),
                        Number(coupon.maxDiscount) || subtotal);
  } else if (coupon.type === 'flat') {
    discount = Math.min(Number(coupon.value), subtotal);
  } else if (coupon.type === 'shipping') {
    freeShip = true;
  }

  return ok({
    coupon: {
      code: coupon.code, type: coupon.type, value: Number(coupon.value),
      minOrder: minOrder, maxDiscount: Number(coupon.maxDiscount) || 0,
      description: coupon.description, discount: discount, freeShip: freeShip
    }
  }, 'Coupon ' + coupon.code + ' applied.');
}

/** Order place hone par usage count badhata hai. */
function incrementCouponUsage(code) {
  if (!code) return;
  var coupon = findOne(CONFIG.SHEETS.COUPONS, function (c) {
    return String(c.code).toUpperCase() === String(code).toUpperCase();
  });
  if (coupon) {
    updateRow(CONFIG.SHEETS.COUPONS, 'code', coupon.code,
      { usedCount: (Number(coupon.usedCount) || 0) + 1 });
  }
}
