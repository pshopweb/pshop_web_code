/**
 * PShop — Product.gs
 * Product listing, filtering, sorting, pagination, search aur filter options.
 */

/** Filter + sort + paginate ke saath products deta hai. */
function apiGetProducts(p) {
  var items = readAll(CONFIG.SHEETS.PRODUCTS).filter(function (x) {
    return String(x.status || 'active') === 'active';
  });

  items = filterProducts(items, p);
  items = sortProducts(items, p.sort);

  var total = items.length;
  var page = Math.max(1, parseInt(p.page, 10) || 1);
  var size = parseInt(p.pageSize, 10) || 12;

  var out = (p.all === true || p.all === 'true')
    ? items
    : items.slice((page - 1) * size, page * size);

  return ok({
    items: out.map(normalizeProduct),
    total: total, page: page, pageSize: size,
    pages: Math.max(1, Math.ceil(total / size))
  });
}

/** Ek product + related + reviews. */
function apiGetProduct(p) {
  var items = readAll(CONFIG.SHEETS.PRODUCTS);
  var found = null;
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === String(p.id) || String(items[i].slug) === String(p.slug)) {
      found = items[i]; break;
    }
  }
  if (!found) return fail('Product not found.', 404);

  var product = normalizeProduct(found);

  // Same category ke products, price ke hisab se sabse kareeb wale.
  var related = items
    .filter(function (x) {
      return x.categoryId === found.categoryId && x.id !== found.id &&
             String(x.status || 'active') === 'active';
    })
    .sort(function (a, b) {
      return Math.abs(a.price - found.price) - Math.abs(b.price - found.price);
    })
    .slice(0, 10)
    .map(normalizeProduct);

  var reviews = findAll(CONFIG.SHEETS.REVIEWS, function (r) {
    return String(r.productId) === String(found.id) && String(r.status || 'approved') === 'approved';
  });

  return ok({ product: product, related: related, reviews: reviews });
}

/** Search + suggestions. */
function apiSearchProducts(p) {
  var term = String(p.q || '').trim().toLowerCase();
  if (!term) return ok({ items: [], total: 0, suggestions: [] });

  var items = readAll(CONFIG.SHEETS.PRODUCTS).filter(function (x) {
    return String(x.status || 'active') === 'active';
  });

  var scored = [];
  for (var i = 0; i < items.length; i++) {
    var s = scoreProduct(items[i], term);
    if (s > 0) scored.push({ p: items[i], s: s });
  }
  scored.sort(function (a, b) { return b.s - a.s; });

  var limit = parseInt(p.limit, 10) || 8;

  // Suggestions: categories + brands + sub-categories.
  var suggestions = [];
  var cats = readAll(CONFIG.SHEETS.CATEGORIES);
  for (var c = 0; c < cats.length && suggestions.length < 3; c++) {
    if (String(cats[c].name).toLowerCase().indexOf(term) > -1) {
      suggestions.push({ type: 'category', label: cats[c].name, slug: cats[c].slug });
    }
  }
  var seenBrand = {};
  for (var b = 0; b < scored.length && suggestions.length < 6; b++) {
    var brand = scored[b].p.brand;
    if (brand && !seenBrand[brand] && String(brand).toLowerCase().indexOf(term) > -1) {
      seenBrand[brand] = 1;
      suggestions.push({ type: 'brand', label: brand });
    }
  }

  return ok({
    items: scored.slice(0, limit).map(function (x) { return normalizeProduct(x.p); }),
    total: scored.length,
    suggestions: suggestions
  });
}

/** Sidebar ke filter options (brands, sub-categories, price range, ratings). */
function apiGetFilters(p) {
  var items = readAll(CONFIG.SHEETS.PRODUCTS).filter(function (x) {
    return String(x.status || 'active') === 'active';
  });
  if (p.category) {
    items = items.filter(function (x) {
      return x.categorySlug === p.category || x.categoryId === p.category;
    });
  }

  var prices = items.map(function (x) { return Number(x.price) || 0; });

  return ok({
    brands: countBy(items, 'brand'),
    subCategories: countBy(items, 'subCategory'),
    categories: countBy(items, 'category'),
    min: prices.length ? Math.min.apply(null, prices) : 0,
    max: prices.length ? Math.max.apply(null, prices) : 0,
    ratings: [4, 3, 2, 1].map(function (r) {
      return { value: r, count: items.filter(function (x) { return Number(x.rating) >= r; }).length };
    })
  });
}

/* ======================= HELPERS ======================= */

/** Sheet row ko frontend ke expected shape me laata hai. */
function normalizeProduct(row) {
  var p = {};
  for (var k in row) if (row.hasOwnProperty(k)) p[k] = row[k];

  p.price = Number(p.price) || 0;
  p.mrp = Number(p.mrp) || p.price;
  p.discount = Number(p.discount) || (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
  p.rating = Number(p.rating) || 0;
  p.ratingCount = Number(p.ratingCount) || 0;
  p.reviewCount = Number(p.reviewCount) || 0;
  p.stock = Number(p.stock) || 0;
  p.inStock = p.stock > 0;
  p.deliveryDays = Number(p.deliveryDays) || 3;
  p.returnDays = Number(p.returnDays) || 7;
  p.sold = Number(p.sold) || 0;
  p.codAvailable = p.codAvailable !== false && p.codAvailable !== 'FALSE';

  p.images = toArray(p.images);
  p.colors = toArray(p.colors);
  p.highlights = toArray(p.highlights);
  p.tags = toArray(p.tags);
  p.specs = toObject(p.specs);
  p.thumb = p.thumb || p.images[0] || '';

  return p;
}

/** String/array ko hamesha array banata hai. */
function toArray(v) {
  if (!v) return [];
  if (Object.prototype.toString.call(v) === '[object Array]') return v;
  if (typeof v === 'string') {
    var s = v.trim();
    if (s.charAt(0) === '[') { try { return JSON.parse(s); } catch (e) {} }
    return s ? s.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
  }
  return [];
}

function toObject(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch (e) { return {}; }
}

/** Saare filters apply karta hai. */
function filterProducts(items, f) {
  f = f || {};

  if (f.category) {
    items = items.filter(function (p) {
      return p.categorySlug === f.category || p.categoryId === f.category;
    });
  }
  if (f.sub) {
    var subs = splitList(f.sub);
    items = items.filter(function (p) { return subs.indexOf(p.subCategory) > -1; });
  }
  if (f.brand) {
    var brands = splitList(f.brand);
    items = items.filter(function (p) { return brands.indexOf(p.brand) > -1; });
  }
  if (f.tag) {
    items = items.filter(function (p) { return toArray(p.tags).indexOf(f.tag) > -1; });
  }
  if (f.ids) {
    var ids = splitList(f.ids);
    items = items.filter(function (p) { return ids.indexOf(String(p.id)) > -1; });
  }
  if (f.minPrice) items = items.filter(function (p) { return Number(p.price) >= Number(f.minPrice); });
  if (f.maxPrice) items = items.filter(function (p) { return Number(p.price) <= Number(f.maxPrice); });
  if (f.rating)   items = items.filter(function (p) { return Number(p.rating) >= Number(f.rating); });
  if (f.discount) items = items.filter(function (p) { return Number(p.discount) >= Number(f.discount); });
  if (f.inStock === true || f.inStock === 'true') {
    items = items.filter(function (p) { return Number(p.stock) > 0; });
  }
  if (f.q) {
    var term = String(f.q).toLowerCase();
    items = items.filter(function (p) { return scoreProduct(p, term) > 5; });
  }
  return items;
}

function splitList(v) {
  if (Object.prototype.toString.call(v) === '[object Array]') return v;
  return String(v).split(',').filter(Boolean);
}

/** Sorting. */
function sortProducts(items, sort) {
  var out = items.slice();
  switch (sort) {
    case 'price-asc':  return out.sort(function (a, b) { return a.price - b.price; });
    case 'price-desc': return out.sort(function (a, b) { return b.price - a.price; });
    case 'rating':     return out.sort(function (a, b) { return b.rating - a.rating; });
    case 'discount':   return out.sort(function (a, b) { return b.discount - a.discount; });
    case 'newest':     return out.sort(function (a, b) {
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
    case 'popular':    return out.sort(function (a, b) { return (b.sold || 0) - (a.sold || 0); });
    case 'name':       return out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    default:
      // Relevance: rating × log(popularity)
      return out.sort(function (a, b) {
        var sa = (Number(a.rating) || 0) * Math.log(10 + (Number(a.ratingCount) || 0));
        var sb = (Number(b.rating) || 0) * Math.log(10 + (Number(b.ratingCount) || 0));
        return sb - sa;
      });
  }
}

/** Search relevance score. */
function scoreProduct(p, term) {
  var name = String(p.name || '').toLowerCase();
  var s = 0;
  if (name.indexOf(term) === 0) s += 100;
  if (name.indexOf(term) > -1) s += 60;
  if (String(p.brand || '').toLowerCase().indexOf(term) > -1) s += 40;
  if (String(p.subCategory || '').toLowerCase().indexOf(term) > -1) s += 30;
  if (String(p.category || '').toLowerCase().indexOf(term) > -1) s += 20;

  // Multi-word queries.
  var tokens = term.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    var haystack = (name + ' ' + p.brand + ' ' + p.category).toLowerCase();
    var all = true;
    for (var i = 0; i < tokens.length; i++) {
      if (haystack.indexOf(tokens[i]) === -1) { all = false; break; }
    }
    if (all) s += 45;
  }
  return s > 0 ? s + Math.min(Number(p.rating) || 0, 5) : 0;
}

/** Kisi field ke unique values + counts. */
function countBy(items, key) {
  var map = {};
  for (var i = 0; i < items.length; i++) {
    var v = items[i][key];
    if (!v) continue;
    map[v] = (map[v] || 0) + 1;
  }
  var out = [];
  for (var k in map) if (map.hasOwnProperty(k)) out.push({ value: k, count: map[k] });
  out.sort(function (a, b) { return String(a.value).localeCompare(String(b.value)); });
  return out;
}
