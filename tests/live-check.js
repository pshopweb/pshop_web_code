/**
 * PShop — Live backend & website connection test
 * Chalane ke liye:  node tests/live-check.js
 *
 * Optional:  node tests/live-check.js https://your-github-pages-url
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// Auto-detect API URL from config.js
let API_URL = 'https://script.google.com/macros/s/AKfycbzotpIgoozPBONp5QxAvQs4IvzhEJBdGP1jEqH5azE7DM7U8fRSmVV9WsR00UUOB_Iz/exec';
try {
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'core', 'config.js'), 'utf8');
  const m = cfg.match(/API_BASE_URL:\s*'([^']*)'/);
  if (m) API_URL = m[1];
} catch { /* ignore */ }

const SITE_URL = args[0] || 'http://localhost:5500';

let pass = 0, fail = 0;
const ck = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  \x1b[32mPASS\x1b[0m  ${name}`); }
  else    { fail++; console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? '  [' + detail + ']' : ''}`); }
};

async function api(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testBackend() {
  console.log('\n\x1b[1m=== BACKEND CONNECTION ===\x1b[0m');
  if (!API_URL) {
    console.log('  API_BASE_URL not set in config.js — skipping backend tests');
    return;
  }
  console.log(`  Testing: ${API_URL.slice(0, 70)}...\n`);

  // Ping
  try {
    const res = await fetch(API_URL, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    ck('Backend reachable', data.success === true);
    ck('Spreadsheet connected', !!data?.data?.spreadsheet?.id,
       JSON.stringify(data?.data?.spreadsheet || {}));
  } catch (e) {
    ck('Backend reachable', false, e.message);
    return;
  }

  // API calls
  const cats = await api('getCategories');
  ck('getCategories works', cats.success === true);

  const prods = await api('getProducts', { pageSize: 3 });
  ck('getProducts works', prods.success === true);
  ck('Products have data', (prods.data?.total || 0) > 0, `total=${prods.data?.total}`);

  const banners = await api('getBanners');
  ck('getBanners works', banners.success === true);

  const faqs = await api('getFaqs');
  ck('getFaqs works', faqs.success === true);

  // Login test
  const login = await api('login', { identifier: 'admin@pshop.in', password: 'admin123' });
  ck('Admin login works', login.success === true, login.message || '');

  // Error handling
  const unk = await api('thisDoesNotExist');
  ck('Unknown action returns error', unk.success === false);
}

async function testDataFiles() {
  console.log('\n\x1b[1m=== LOCAL DATA FILES ===\x1b[0m');
  const dataDir = path.join(__dirname, '..', 'assets', 'data');
  const files = ['products.js', 'categories.js', 'banners.js', 'reviews.js', 'coupons.js', 'faqs.js'];

  for (const f of files) {
    const fp = path.join(dataDir, f);
    const exists = fs.existsSync(fp);
    ck(`${f} exists`, exists);
    if (exists) {
      try {
        const content = fs.readFileSync(fp, 'utf8');
        const hasExport = content.startsWith('export default');
        ck(`${f} is valid JS module`, hasExport, `${content.length} bytes`);
      } catch {
        ck(`${f} is valid JS module`, false);
      }
    }
  }
}

async function testSitePages() {
  if (args.length === 0) {
    console.log('\n\x1b[1m=== SITE PAGES (skipped — pass URL as argument) ===\x1b[0m');
    console.log('  Usage: node tests/live-check.js https://username.github.io/repo-name');
    return;
  }

  console.log(`\n\x1b[1m=== SITE PAGES (${SITE_URL}) ===\x1b[0m`);
  const pages = [
    'index.html',
    'pages/shop.html',
    'pages/product-details.html',
    'pages/login.html',
    'pages/cart.html',
    'pages/category.html'
  ];

  for (const p of pages) {
    try {
      const url = `${SITE_URL.replace(/\/$/, '')}/${p}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      ck(`${p} loads (HTTP ${res.status})`, res.ok, `status=${res.status}`);
    } catch (e) {
      ck(`${p} loads`, false, e.message);
    }
  }
}

async function main() {
  console.log('PShop — Live Check (Node.js)');
  console.log('='.repeat(50));

  await testBackend();
  await testDataFiles();
  await testSitePages();

  console.log('\n' + '='.repeat(50));
  if (fail === 0) {
    console.log(`  \x1b[32mALL ${pass} PASSED\x1b[0m`);
  } else {
    console.log(`  \x1b[33m${pass} passed, ${fail} failed\x1b[0m`);
  }
  console.log('='.repeat(50));
  process.exit(fail ? 1 : 0);
}

main();
