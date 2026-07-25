/**
 * PShop — Review.gs
 * Product reviews list karna aur naya review add karna.
 */

/** Ek product ke reviews + rating breakdown. */
function apiGetReviews(p) {
  var list = findAll(CONFIG.SHEETS.REVIEWS, function (r) {
    return String(r.productId) === String(p.productId) &&
           String(r.status || 'approved') === 'approved';
  });

  list.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  var total = list.length, sum = 0;
  var buckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (var i = 0; i < list.length; i++) {
    var r = Number(list[i].rating) || 0;
    sum += r;
    if (buckets[r] !== undefined) buckets[r]++;
  }

  return ok({
    items: list,
    total: total,
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    breakdown: buckets
  });
}

/** Naya review add karta hai aur product ki rating recalculate karta hai. */
function apiAddReview(p, user) {
  if (!p.productId) return fail('No product specified.');
  var rating = parseInt(p.rating, 10);
  if (!rating || rating < 1 || rating > 5) return fail('Please select a star rating.');
  if (!p.comment || String(p.comment).trim().length < 10) {
    return fail('Please write at least 10 characters.');
  }

  var product = findOne(CONFIG.SHEETS.PRODUCTS, function (x) {
    return String(x.id) === String(p.productId);
  });
  if (!product) return fail('Product not found.', 404);

  // Verified purchase check — user ne ye product kabhi kharida?
  var verified = false;
  if (user) {
    var orders = findAll(CONFIG.SHEETS.ORDERS, function (o) {
      return String(o.userId) === String(user.id) && o.status === 'Delivered';
    });
    for (var i = 0; i < orders.length && !verified; i++) {
      var items = toArray(orders[i].items);
      for (var j = 0; j < items.length; j++) {
        if (String(items[j].productId || items[j].id) === String(p.productId)) { verified = true; break; }
      }
    }
  }

  var review = {
    id: uid('R'),
    productId: p.productId,
    userId: user ? user.id : 'guest',
    user: (user && user.name) || p.user || 'PShop Customer',
    rating: rating,
    title: String(p.title || 'My review').slice(0, 100),
    comment: String(p.comment).trim().slice(0, 1000),
    images: p.images ? JSON.stringify(p.images) : '[]',
    verified: verified,
    helpful: 0,
    status: 'approved',
    createdAt: nowISO()
  };
  appendRow(CONFIG.SHEETS.REVIEWS, review);

  recalculateProductRating(p.productId);

  return ok({ review: review }, 'Thanks! Your review is published.');
}

/** Product ki average rating aur counts dobara nikalta hai. */
function recalculateProductRating(productId) {
  var reviews = findAll(CONFIG.SHEETS.REVIEWS, function (r) {
    return String(r.productId) === String(productId) &&
           String(r.status || 'approved') === 'approved';
  });
  if (!reviews.length) return;

  var sum = 0;
  for (var i = 0; i < reviews.length; i++) sum += Number(reviews[i].rating) || 0;

  updateRow(CONFIG.SHEETS.PRODUCTS, 'id', productId, {
    rating: Math.round((sum / reviews.length) * 10) / 10,
    reviewCount: reviews.length,
    updatedAt: nowISO()
  });
}
