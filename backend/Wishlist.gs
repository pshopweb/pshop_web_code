/**
 * PShop — Wishlist.gs
 * Saved products add / remove / list.
 */

function apiGetWishlist(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var items = findAll(CONFIG.SHEETS.WISHLIST, function (w) {
    return String(w.userId) === String(user.id);
  });
  items.sort(function (a, b) {
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });
  return ok({ items: items, count: items.length });
}

function apiAddWishlist(p, user) {
  if (!user) return fail('Please sign in.', 401);

  var already = findOne(CONFIG.SHEETS.WISHLIST, function (w) {
    return String(w.userId) === String(user.id) && String(w.productId) === String(p.productId);
  });
  if (already) return apiGetWishlist(p, user);

  var product = findOne(CONFIG.SHEETS.PRODUCTS, function (x) {
    return String(x.id) === String(p.productId);
  });
  if (!product) return fail('Product not found.', 404);

  appendRow(CONFIG.SHEETS.WISHLIST, {
    id: uid('WSH'), userId: user.id, productId: product.id,
    name: product.name, brand: product.brand,
    price: Number(product.price), mrp: Number(product.mrp),
    image: product.thumb || toArray(product.images)[0] || '',
    slug: product.slug, rating: Number(product.rating) || 0,
    discount: Number(product.discount) || 0, addedAt: nowISO()
  });

  return apiGetWishlist(p, user);
}

function apiRemoveWishlist(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var row = findOne(CONFIG.SHEETS.WISHLIST, function (w) {
    return String(w.userId) === String(user.id) &&
           (String(w.productId) === String(p.productId) || String(w.id) === String(p.id));
  });
  if (row) deleteRow(CONFIG.SHEETS.WISHLIST, 'id', row.id);
  return apiGetWishlist(p, user);
}
