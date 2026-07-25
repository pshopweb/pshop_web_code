/**
 * PShop — Category.gs
 * Categories list aur single category (live product counts ke saath).
 */

/** Saari active categories. */
function apiGetCategories(p) {
  var cats = readAll(CONFIG.SHEETS.CATEGORIES).filter(function (c) {
    return String(c.status || 'active') === 'active';
  });
  var products = readAll(CONFIG.SHEETS.PRODUCTS).filter(function (x) {
    return String(x.status || 'active') === 'active';
  });

  var out = cats.map(function (c) {
    var mine = products.filter(function (p) { return p.categoryId === c.id; });
    return {
      id: c.id, name: c.name, slug: c.slug,
      description: c.description || '',
      icon: c.icon || '', banner: c.banner || '', color: c.color || '#2563eb',
      subCategories: toArray(c.subCategories),
      brands: uniqueValues(mine, 'brand'),
      productCount: mine.length,
      sortOrder: Number(c.sortOrder) || 999
    };
  });

  out.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  return ok({ items: out });
}

/** Ek category + uske products. */
function apiGetCategory(p) {
  var res = apiGetCategories({});
  var slug = p.slug || p.cat || p.id;
  var found = null;
  for (var i = 0; i < res.data.items.length; i++) {
    var c = res.data.items[i];
    if (c.slug === slug || c.id === slug) { found = c; break; }
  }
  if (!found) return fail('Category not found.', 404);

  var products = apiGetProducts({
    category: found.slug, page: p.page, pageSize: p.pageSize, sort: p.sort
  });

  return ok({ category: found, products: products.data });
}

/** Kisi field ke unique values. */
function uniqueValues(items, key) {
  var seen = {}, out = [];
  for (var i = 0; i < items.length; i++) {
    var v = items[i][key];
    if (v && !seen[v]) { seen[v] = 1; out.push(v); }
  }
  return out.sort();
}
