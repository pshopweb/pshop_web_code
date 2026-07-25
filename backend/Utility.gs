/**
 * PShop — Utility.gs
 * Common helpers: sheet access, JSON responses, IDs, hashing, validation.
 * Har dusri .gs file in helpers ko use karti hai.
 */

/* ======================= CONFIGURATION ======================= */
var CONFIG = {
  /* ====================================================================
     SHEET_ID — yahan apni Google Sheet ki ID paste karein.
     --------------------------------------------------------------------
     Sheet ka URL aisa dikhta hai:
     https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit
                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                            ye lamba hissa hi SHEET_ID hai

     Kab zaroori hai?
     • Agar aapne script ko Sheet ke andar se banaya (Extensions → Apps Script)
       to ise khaali chhod sakte hain — script khud apni Sheet dhoond leta hai.
     • Agar script ALAG project hai (script.google.com se banaya), ya aap ek
       folder me multiple files/scripts rakhte hain, to SHEET_ID dena ZAROORI hai.
     ==================================================================== */
  SHEET_ID: '',

  // Sheet ka naam (spreadsheet ke andar tabs).
  SHEETS: {
    USERS: 'Users', PRODUCTS: 'Products', CATEGORIES: 'Categories', ORDERS: 'Orders',
    CART: 'Cart', WISHLIST: 'Wishlist', PAYMENTS: 'Payments', MESSAGES: 'Messages',
    REVIEWS: 'Reviews', COUPONS: 'Coupons', NOTIFICATIONS: 'Notifications',
    DELIVERY: 'Delivery', SETTINGS: 'Settings', OTP: 'OTP'
  },
  SALT: 'PShop$2026$SecureSalt',        // Setup ke baad ise apne value se badal dein
  TOKEN_TTL_HOURS: 720,                 // 30 din
  OTP_TTL_MINUTES: 5,
  OTP_MAX_ATTEMPTS: 5,
  FREE_SHIP_ABOVE: 499,
  SHIPPING_FEE: 79,
  EXPRESS_FEE: 129,
  COD_FEE: 29,
  TAX_RATE: 0.18,
  CURRENCY: 'INR',
  ADMIN_EMAIL: 'admin@pshop.in',
  SUPPORT_EMAIL: 'care@pshop.in',
  SEND_EMAILS: true                     // false karne par OTP email nahi jayegi (testing)
};

/* ======================= SPREADSHEET ACCESS ======================= */

/**
 * Spreadsheet kholta hai. Teen tarike se ID dhoondta hai (priority order):
 *   1. Script Properties ka 'SHEET_ID'  (sabse flexible — code badle bina badal sakte hain)
 *   2. CONFIG.SHEET_ID                  (upar wali line me paste kiya hua)
 *   3. Active spreadsheet               (jab script Sheet ke andar se bana ho)
 */
function getSS() {
  // 1. Script Properties (Project Settings → Script Properties)
  var propId = '';
  try {
    propId = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || '';
  } catch (e) { /* properties available nahi — ignore */ }

  var id = String(propId || CONFIG.SHEET_ID || '').trim();

  // Galti se poora URL paste kar diya ho to usme se ID nikal lo.
  if (id.indexOf('http') === 0) {
    var m = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (m) id = m[1];
  }

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      throw new Error('SHEET_ID galat hai ya us Sheet tak aapki pahunch nahi hai. ' +
        'ID check karein: "' + id + '". Original error: ' + err.message);
    }
  }

  // 3. Container-bound script — Sheet ke andar se bana hua
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      'Koi spreadsheet nahi mila. Utility.gs me CONFIG.SHEET_ID set karein, ' +
      'ya Project Settings → Script Properties me SHEET_ID add karein. ' +
      'Sheet URL me /d/ ke baad wala lamba hissa hi ID hai.');
  }
  return active;
}

/**
 * Sheet ID ko Script Properties me save karta hai (code badle bina).
 * Editor me is function ko ek baar run karein — pehle apni ID neeche daalein.
 */
function setSheetId() {
  var MY_SHEET_ID = '';   // <<< yahan apni Sheet ID paste karke Run dabayein

  if (!MY_SHEET_ID) {
    Logger.log('Pehle MY_SHEET_ID variable me apni Sheet ID paste karein.');
    return fail('No Sheet ID provided.');
  }
  var id = MY_SHEET_ID.trim();
  var m = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m) id = m[1];

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', id);

  // Turant verify karo ki Sheet khul rahi hai.
  try {
    var ss = SpreadsheetApp.openById(id);
    Logger.log('✅ Sheet connected: "' + ss.getName() + '"  (ID: ' + id + ')');
    Logger.log('Ab setupDatabase() run karein.');
    return ok({ id: id, name: ss.getName() }, 'Sheet ID saved.');
  } catch (err) {
    PropertiesService.getScriptProperties().deleteProperty('SHEET_ID');
    Logger.log('❌ Ye ID nahi khul rahi: ' + err.message);
    return fail('Invalid Sheet ID: ' + err.message);
  }
}

/** Abhi kaunsi Sheet connected hai — check karne ke liye. */
function whichSheet() {
  try {
    var ss = getSS();
    var tabs = ss.getSheets().map(function (s) { return s.getName(); });
    Logger.log('Connected Sheet: "' + ss.getName() + '"');
    Logger.log('URL: ' + ss.getUrl());
    Logger.log('Tabs (' + tabs.length + '): ' + tabs.join(', '));
    return ok({ name: ss.getName(), url: ss.getUrl(), tabs: tabs });
  } catch (err) {
    Logger.log('❌ ' + err.message);
    return fail(err.message);
  }
}

/** Naam se sheet leta hai; na mile to headers ke saath bana deta hai. */
function getSheet(name, headers) {
  var ss = getSS();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** Sheet ke saare rows objects ki array me deta hai. */
function readAll(sheetName) {
  var sh = getSheet(sheetName);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.join('') === '') continue;            // blank row skip
    out.push(rowToObject(headers, row));
  }
  return out;
}

/** Header array + row array ko object me badalta hai (JSON fields parse karke). */
function rowToObject(headers, row) {
  var obj = {};
  for (var c = 0; c < headers.length; c++) {
    var key = String(headers[c]).trim();
    if (!key) continue;
    obj[key] = parseCell(row[c]);
  }
  return obj;
}

/** JSON-looking strings ko object me parse karta hai. */
function parseCell(v) {
  if (typeof v !== 'string') return v;
  var s = v.trim();
  if ((s.charAt(0) === '{' && s.charAt(s.length - 1) === '}') ||
      (s.charAt(0) === '[' && s.charAt(s.length - 1) === ']')) {
    try { return JSON.parse(s); } catch (e) { return v; }
  }
  if (s === 'TRUE' || s === 'true') return true;
  if (s === 'FALSE' || s === 'false') return false;
  return v;
}

/** Object ko sheet ke header order me row array banata hai. */
function objectToRow(headers, obj) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var v = obj[headers[i]];
    if (v === undefined || v === null) v = '';
    else if (typeof v === 'object') v = JSON.stringify(v);
    row.push(v);
  }
  return row;
}

/** Sheet me ek naya row append karta hai. */
function appendRow(sheetName, obj) {
  var sh = getSheet(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(objectToRow(headers, obj));
  return obj;
}

/** id ke basis par row update karta hai. Milne par true. */
function updateRow(sheetName, idField, idValue, patch) {
  var sh = getSheet(sheetName);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf(idField);
  if (idCol < 0) return false;

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(idValue)) {
      var current = rowToObject(headers, values[r]);
      for (var k in patch) { if (patch.hasOwnProperty(k)) current[k] = patch[k]; }
      sh.getRange(r + 1, 1, 1, headers.length).setValues([objectToRow(headers, current)]);
      return true;
    }
  }
  return false;
}

/** id ke basis par row delete karta hai. */
function deleteRow(sheetName, idField, idValue) {
  var sh = getSheet(sheetName);
  var values = sh.getDataRange().getValues();
  var idCol = values[0].indexOf(idField);
  if (idCol < 0) return false;
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idCol]) === String(idValue)) { sh.deleteRow(r + 1); return true; }
  }
  return false;
}

/** Ek matching record dhoondhta hai. */
function findOne(sheetName, predicate) {
  var rows = readAll(sheetName);
  for (var i = 0; i < rows.length; i++) if (predicate(rows[i])) return rows[i];
  return null;
}

/** Saare matching records. */
function findAll(sheetName, predicate) {
  return readAll(sheetName).filter(predicate);
}

/* ======================= RESPONSES ======================= */

/** Success JSON response. */
function ok(data, message) {
  return { success: true, data: data === undefined ? null : data, message: message || '' };
}

/** Error JSON response. */
function fail(message, code) {
  return { success: false, data: null, message: message || 'Request failed', code: code || 400 };
}

/** Object ko Apps Script JSON output me convert karta hai. */
function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ======================= IDS & TIME ======================= */

/** Prefix ke saath unique ID. */
function uid(prefix) {
  var t = new Date().getTime().toString(36).toUpperCase();
  var r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return (prefix || 'ID') + t + r;
}

/** Sheet me sequential ID banata hai, jaise U0001, P0042. */
function nextId(sheetName, prefix, width) {
  var rows = readAll(sheetName);
  var max = 0;
  for (var i = 0; i < rows.length; i++) {
    var v = String(rows[i].id || '');
    if (v.indexOf(prefix) === 0) {
      var n = parseInt(v.substring(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  var num = String(max + 1);
  while (num.length < (width || 4)) num = '0' + num;
  return prefix + num;
}

function nowISO() { return new Date().toISOString(); }

function addDays(date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ======================= SECURITY ======================= */

/** Password ka SHA-256 hash (salt ke saath). */
function hashPassword(password) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, CONFIG.SALT + String(password), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(raw);
}

/** Token banata hai: base64(userId|expiry|signature). */
function createToken(userId) {
  var expiry = new Date().getTime() + CONFIG.TOKEN_TTL_HOURS * 3600 * 1000;
  var payload = userId + '|' + expiry;
  var sig = Utilities.base64Encode(Utilities.computeHmacSha256Signature(payload, CONFIG.SALT));
  return Utilities.base64Encode(payload + '|' + sig);
}

/** Token verify karke userId return karta hai, warna null. */
function verifyToken(token) {
  if (!token) return null;
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var parts = decoded.split('|');
    if (parts.length !== 3) return null;
    var userId = parts[0], expiry = parseInt(parts[1], 10), sig = parts[2];
    if (new Date().getTime() > expiry) return null;
    var expected = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(userId + '|' + expiry, CONFIG.SALT));
    return sig === expected ? userId : null;
  } catch (e) { return null; }
}

/** Token se user object nikaalta hai (password ke bina). */
function getUserFromToken(token) {
  var userId = verifyToken(token);
  if (!userId) return null;
  var user = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(userId); });
  return user ? publicUser(user) : null;
}

/** User object se password hata deta hai. */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role || 'customer',
    verified: u.verified === true || u.verified === 'TRUE', avatar: u.avatar || '',
    gender: u.gender || '', dob: u.dob || '', createdAt: u.createdAt
  };
}

/* ======================= VALIDATION ======================= */

var V = {
  email: function (v) { return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(v || '').trim()); },
  phone: function (v) { return /^[6-9]\d{9}$/.test(String(v || '').replace(/\D/g, '').slice(-10)); },
  pin:   function (v) { return /^[1-9]\d{5}$/.test(String(v || '').trim()); },
  name:  function (v) { return String(v || '').trim().length >= 2; },
  pw:    function (v) { return String(v || '').length >= 6; },
  required: function (v) { return String(v === undefined || v === null ? '' : v).trim().length > 0; }
};

/** Email ya phone ko mask karta hai (de***@mail.com). */
function maskIdentifier(id) {
  id = String(id || '');
  if (id.indexOf('@') > -1) {
    var parts = id.split('@');
    var u = parts[0];
    return u.substring(0, 2) + repeatChar('*', Math.max(2, u.length - 2)) + '@' + parts[1];
  }
  return id.substring(0, 2) + '******' + id.substring(id.length - 2);
}

function repeatChar(ch, n) {
  var s = '';
  for (var i = 0; i < n; i++) s += ch;
  return s;
}

/* ======================= EMAIL ======================= */

/** HTML email bhejta hai (quota exceed hone par silently skip). */
function sendEmail(to, subject, htmlBody) {
  if (!CONFIG.SEND_EMAILS || !V.email(to)) return false;
  try {
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: htmlBody, name: 'PShop' });
    return true;
  } catch (e) {
    Logger.log('Email failed: ' + e.message);
    return false;
  }
}

/** Brand ke saath email template. */
function emailTemplate(title, bodyHtml) {
  return '<div style="font-family:Inter,Segoe UI,sans-serif;max-width:560px;margin:auto;' +
    'border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">' +
    '<div style="background:linear-gradient(120deg,#2563eb,#7c3aed);padding:22px;color:#fff">' +
    '<h1 style="margin:0;font-size:22px">PShop</h1></div>' +
    '<div style="padding:26px;color:#0f172a;line-height:1.6">' +
    '<h2 style="margin:0 0 12px;font-size:18px">' + title + '</h2>' + bodyHtml + '</div>' +
    '<div style="padding:16px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center">' +
    'PShop Retail India Pvt. Ltd. · ' + CONFIG.SUPPORT_EMAIL + '</div></div>';
}
