/**
 * PShop — Code.gs  (MAIN ENTRY POINT)
 * Yahi file Web App ka doGet/doPost handle karti hai aur har request ko
 * sahi module tak route karti hai. Sab response JSON hote hain.
 *
 * DEPLOY KARNE KA TARIKA:
 *   1. Extensions → Apps Script
 *   2. Saari .gs files paste karein
 *   3. setupDatabase() ek baar run karein
 *   4. Deploy → New deployment → Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *   5. Jo /exec URL mile use assets/js/core/config.js me API_BASE_URL me daal dein
 */

/** GET requests — testing aur simple reads ke liye. */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'ping';

    // Browser me URL kholne par health check dikhe.
    if (action === 'ping') {
      var info = { app: 'PShop API', version: '1.0.0', status: 'running', time: nowISO() };
      try {
        var ss = getSS();
        info.spreadsheet = { name: ss.getName(), id: ss.getId() };
        info.sheets = listSheetStatus();
        info.setupComplete = !!getSS().getSheetByName('Users');
      } catch (err) {
        // Sheet nahi mili — user ko saaf batao kya karna hai.
        return jsonOutput(fail(
          err.message + ' | Fix: Utility.gs me CONFIG.SHEET_ID set karein ' +
          'ya setSheetId() function run karein.', 500));
      }
      return jsonOutput(ok(info, 'PShop backend is live.'));
    }

    return jsonOutput(routeRequest(action, params, params.token || null));
  } catch (err) {
    return jsonOutput(fail('Server error: ' + err.message, 500));
  }
}

/**
 * POST requests — frontend inhi ko use karta hai.
 * Body: { action: "login", payload: {...}, token: "..." }
 * Note: frontend text/plain bhejta hai taaki CORS preflight na ho.
 */
function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); }
      catch (parseErr) { return jsonOutput(fail('Invalid JSON body.', 400)); }
    }
    var action = body.action || (e && e.parameter ? e.parameter.action : '');
    var payload = body.payload || {};
    var token = body.token || null;

    if (!action) return jsonOutput(fail('No action specified.', 400));

    return jsonOutput(routeRequest(action, payload, token));
  } catch (err) {
    return jsonOutput(fail('Server error: ' + err.message, 500));
  }
}

/**
 * Central router — har action ko uske handler tak bhejta hai.
 * @param {string} action
 * @param {Object} payload
 * @param {string} token
 */
function routeRequest(action, payload, token) {
  payload = payload || {};

  // Kaunse actions ke liye login zaroori hai.
  var PROTECTED = {
    updateProfile: 1, changePassword: 1, getCart: 1, addCart: 1, updateCart: 1,
    removeCart: 1, clearCart: 1, getWishlist: 1, addWishlist: 1, removeWishlist: 1,
    placeOrder: 1, getOrders: 1, cancelOrder: 1, returnOrder: 1,
    getNotifications: 1, markNotificationRead: 1, getMessages: 1, uploadImage: 1
  };

  // Sirf admin ke liye.
  var ADMIN = {
    adminStats: 1, adminUsers: 1, adminUpdateUser: 1, adminDeleteUser: 1,
    adminAddProduct: 1, adminUpdateProduct: 1, adminDeleteProduct: 1,
    adminAddCategory: 1, adminUpdateCategory: 1, adminDeleteCategory: 1,
    adminOrders: 1, adminUpdateOrder: 1, adminPayments: 1, adminRefund: 1,
    adminCoupons: 1, adminAddCoupon: 1, adminUpdateCoupon: 1, adminDeleteCoupon: 1,
    adminReviews: 1, adminModerateReview: 1, adminMessages: 1, adminReplyMessage: 1,
    adminDelivery: 1, adminUpdateDelivery: 1, adminReports: 1, adminSettings: 1,
    adminUpdateSettings: 1
  };

  var user = token ? getUserFromToken(token) : null;

  if (PROTECTED[action] && !user) {
    return fail('Please sign in to continue.', 401);
  }
  if (ADMIN[action]) {
    if (!user) return fail('Please sign in to continue.', 401);
    if (user.role !== 'admin') return fail('Admin access required.', 403);
  }

  // userId har protected call me inject kar dete hain.
  if (user) payload.userId = payload.userId || user.id;

  switch (action) {
    /* ---------------- AUTH (Auth.gs) ---------------- */
    case 'signup':          return apiSignup(payload);
    case 'login':           return apiLogin(payload);
    case 'sendOtp':         return apiSendOtp(payload);
    case 'verifyOtp':       return apiVerifyOtp(payload);
    case 'resetPassword':   return apiResetPassword(payload);
    case 'changePassword':  return apiChangePassword(payload, user);
    case 'validateToken':   return user ? ok({ user: user }, 'Token valid.') : fail('Invalid token.', 401);

    /* ---------------- USER (User.gs) ---------------- */
    case 'getProfile':      return apiGetProfile(payload, user);
    case 'updateProfile':   return apiUpdateProfile(payload, user);
    case 'getAddresses':    return apiGetAddresses(payload, user);
    case 'saveAddress':     return apiSaveAddress(payload, user);
    case 'deleteAddress':   return apiDeleteAddress(payload, user);
    case 'uploadImage':     return apiUploadImage(payload, user);

    /* ---------------- PRODUCTS (Product.gs) ---------------- */
    case 'getProducts':     return apiGetProducts(payload);
    case 'getProduct':      return apiGetProduct(payload);
    case 'searchProducts':  return apiSearchProducts(payload);
    case 'getFilters':      return apiGetFilters(payload);

    /* ---------------- CONTENT (Content.gs) ---------------- */
    case 'getBanners':      return apiGetBanners(payload);
    case 'getFaqs':         return apiGetFaqs(payload);

    /* ---------------- CATEGORIES (Category.gs) ---------------- */
    case 'getCategories':   return apiGetCategories(payload);
    case 'getCategory':     return apiGetCategory(payload);

    /* ---------------- CART (Cart.gs) ---------------- */
    case 'getCart':         return apiGetCart(payload, user);
    case 'addCart':         return apiAddCart(payload, user);
    case 'updateCart':      return apiUpdateCart(payload, user);
    case 'removeCart':      return apiRemoveCart(payload, user);
    case 'clearCart':       return apiClearCart(payload, user);

    /* ---------------- WISHLIST (Wishlist.gs) ---------------- */
    case 'getWishlist':     return apiGetWishlist(payload, user);
    case 'addWishlist':     return apiAddWishlist(payload, user);
    case 'removeWishlist':  return apiRemoveWishlist(payload, user);

    /* ---------------- ORDERS (Order.gs) ---------------- */
    case 'placeOrder':      return apiPlaceOrder(payload, user);
    case 'getOrders':       return apiGetOrders(payload, user);
    case 'getOrder':        return apiGetOrder(payload, user);
    case 'trackOrder':      return apiTrackOrder(payload);
    case 'cancelOrder':     return apiCancelOrder(payload, user);
    case 'returnOrder':     return apiReturnOrder(payload, user);

    /* ---------------- PAYMENT (Payment.gs) ---------------- */
    case 'savePayment':     return apiSavePayment(payload, user);
    case 'getPaymentStatus':return apiGetPaymentStatus(payload);
    case 'getRefundStatus': return apiGetRefundStatus(payload);

    /* ---------------- COUPON (Coupon.gs) ---------------- */
    case 'getCoupons':      return apiGetCoupons(payload);
    case 'verifyCoupon':    return apiVerifyCoupon(payload);

    /* ---------------- REVIEWS (Review.gs) ---------------- */
    case 'getReviews':      return apiGetReviews(payload);
    case 'addReview':       return apiAddReview(payload, user);

    /* ---------------- MESSAGES (Message.gs) ---------------- */
    case 'getMessages':     return apiGetMessages(payload, user);
    case 'sendMessage':     return apiSendMessage(payload, user);
    case 'contact':         return apiContact(payload);
    case 'subscribeNewsletter': return apiSubscribeNewsletter(payload);

    /* ---------------- NOTIFICATIONS (Notification.gs) ---------------- */
    case 'getNotifications':      return apiGetNotifications(payload, user);
    case 'markNotificationRead':  return apiMarkNotificationRead(payload, user);

    /* ---------------- DELIVERY (Delivery.gs) ---------------- */
    case 'checkPincode':    return apiCheckPincode(payload);
    case 'getDelivery':     return apiGetDelivery(payload);

    /* ---------------- ADMIN ---------------- */
    case 'adminStats':          return apiAdminStats(payload);
    case 'adminUsers':          return apiAdminUsers(payload);
    case 'adminUpdateUser':     return apiAdminUpdateUser(payload);
    case 'adminDeleteUser':     return apiAdminDeleteUser(payload);
    case 'adminAddProduct':     return apiAdminSaveProduct(payload, true);
    case 'adminUpdateProduct':  return apiAdminSaveProduct(payload, false);
    case 'adminDeleteProduct':  return apiAdminDeleteProduct(payload);
    case 'adminAddCategory':    return apiAdminSaveCategory(payload, true);
    case 'adminUpdateCategory': return apiAdminSaveCategory(payload, false);
    case 'adminDeleteCategory': return apiAdminDeleteCategory(payload);
    case 'adminOrders':         return apiAdminOrders(payload);
    case 'adminUpdateOrder':    return apiAdminUpdateOrder(payload);
    case 'adminPayments':       return apiAdminPayments(payload);
    case 'adminRefund':         return apiAdminRefund(payload);
    case 'adminCoupons':        return apiAdminCoupons(payload);
    case 'adminAddCoupon':      return apiAdminSaveCoupon(payload, true);
    case 'adminUpdateCoupon':   return apiAdminSaveCoupon(payload, false);
    case 'adminDeleteCoupon':   return apiAdminDeleteCoupon(payload);
    case 'adminReviews':        return apiAdminReviews(payload);
    case 'adminModerateReview': return apiAdminModerateReview(payload);
    case 'adminMessages':       return apiAdminMessages(payload);
    case 'adminReplyMessage':   return apiAdminReplyMessage(payload);
    case 'adminDelivery':       return apiAdminDelivery(payload);
    case 'adminUpdateDelivery': return apiAdminUpdateDelivery(payload);
    case 'adminReports':        return apiAdminReports(payload);
    case 'adminSettings':       return apiAdminSettings(payload);
    case 'adminUpdateSettings': return apiAdminUpdateSettings(payload);

    default:
      return fail('Unknown action: ' + action, 404);
  }
}

/** Har sheet ka row count — health check ke liye. */
function listSheetStatus() {
  var out = {};
  for (var key in CONFIG.SHEETS) {
    if (!CONFIG.SHEETS.hasOwnProperty(key)) continue;
    var name = CONFIG.SHEETS[key];
    var sh = getSS().getSheetByName(name);
    out[name] = sh ? Math.max(0, sh.getLastRow() - 1) : 'missing';
  }
  return out;
}

/* ==========================================================================
   SETUP — ye function Apps Script editor me EK BAAR manually run karein.
   Ye saari sheets, headers aur demo data bana dega.
   ========================================================================== */
function setupDatabase() {
  var ss;
  try {
    ss = getSS();
  } catch (err) {
    Logger.log('❌ ' + err.message);
    throw err;   // execution log me poora message dikhega
  }
  Logger.log('Setting up: "' + ss.getName() + '" (ID: ' + ss.getId() + ')');

  var SCHEMA = {
    Users: ['id','name','email','phone','password','role','verified','avatar','gender','dob',
            'addresses','status','createdAt','updatedAt','lastLogin'],
    Products: ['id','sku','name','slug','brand','categoryId','category','categorySlug','subCategory',
               'price','mrp','discount','stock','inStock','rating','ratingCount','reviewCount',
               'images','thumb','colors','highlights','description','specs','tags','deliveryDays',
               'returnDays','codAvailable','sold','status','createdAt','updatedAt'],
    Categories: ['id','name','slug','description','icon','banner','color','subCategories','brands',
                 'productCount','status','sortOrder','createdAt'],
    Orders: ['id','userId','items','address','contact','payment','totals','coupon','status',
             'paymentStatus','placedAt','expectedAt','deliveredAt','invoiceNo','awb','courier',
             'timeline','cancelReason','returnReason','cancellable','returnable','updatedAt'],
    Cart: ['id','userId','productId','name','brand','price','mrp','image','slug','variant','qty',
           'stock','codAvailable','addedAt'],
    Wishlist: ['id','userId','productId','name','brand','price','mrp','image','slug','rating',
               'discount','addedAt'],
    Payments: ['id','orderId','userId','method','amount','status','reference','app','last4',
               'refundStatus','refundAmount','refundedAt','createdAt'],
    Messages: ['id','userId','name','email','subject','thread','status','unread','createdAt','updatedAt'],
    Reviews: ['id','productId','userId','user','rating','title','comment','images','verified',
              'helpful','status','createdAt'],
    Coupons: ['code','type','value','minOrder','maxDiscount','description','usageLimit','usedCount',
              'expiry','active','createdAt'],
    Notifications: ['id','userId','title','body','type','link','read','createdAt'],
    Delivery: ['id','orderId','awb','courier','status','pincode','city','agent','agentPhone',
               'eta','updates','createdAt','updatedAt'],
    Settings: ['key','value','description','updatedAt'],
    OTP: ['identifier','code','purpose','attempts','expiresAt','createdAt'],
    Banners: ['id','title','subtitle','cta','link','image','theme','active','sortOrder'],
    FAQs: ['id','category','question','answer','sortOrder','active'],
    Newsletter: ['email','subscribedAt','status']
  };

  // 1. Sheets + headers
  for (var name in SCHEMA) {
    if (!SCHEMA.hasOwnProperty(name)) continue;
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]])
      .setFontWeight('bold').setBackground('#2563eb').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, Math.min(SCHEMA[name].length, 12));
  }

  // 2. Default admin + demo customer
  if (readAll('Users').length === 0) {
    appendRow('Users', {
      id: 'U0001', name: 'PShop Admin', email: CONFIG.ADMIN_EMAIL, phone: '9000000001',
      password: hashPassword('admin123'), role: 'admin', verified: true, avatar: '',
      gender: '', dob: '', addresses: '[]', status: 'active',
      createdAt: nowISO(), updatedAt: nowISO(), lastLogin: ''
    });
    appendRow('Users', {
      id: 'U0002', name: 'Demo Customer', email: 'demo@pshop.in', phone: '9876543210',
      password: hashPassword('demo123'), role: 'customer', verified: true, avatar: '',
      gender: 'Male', dob: '1996-04-18', addresses: '[]', status: 'active',
      createdAt: nowISO(), updatedAt: nowISO(), lastLogin: ''
    });
  }

  // 3. Default categories
  if (readAll('Categories').length === 0) {
    var cats = [
      ['c1','Electronics','electronics','Phones, laptops, audio & smart gear','#2563eb',
       ['Smartphones','Laptops','Headphones','Smart Watches','Cameras','Accessories']],
      ['c2','Fashion','fashion','Clothing, footwear & accessories','#db2777',
       ["Men's Wear","Women's Wear",'Footwear','Watches','Bags','Jewellery']],
      ['c3','Home & Kitchen','home-kitchen','Appliances, cookware & decor','#f59e0b',
       ['Cookware','Appliances','Furniture','Decor','Storage','Bedding']],
      ['c4','Beauty','beauty','Skincare, grooming & fragrance','#8b5cf6',
       ['Skincare','Haircare','Makeup','Fragrance','Grooming','Wellness']],
      ['c5','Sports','sports','Fitness, outdoor & sportswear','#10b981',
       ['Fitness','Cricket','Cycling','Footwear','Outdoor','Yoga']],
      ['c6','Grocery','grocery','Daily essentials & packaged food','#ef4444',
       ['Staples','Snacks','Beverages','Dairy','Personal Care','Household']],
      ['c7','Toys & Baby','toys-baby','Toys, games & baby care','#06b6d4',
       ['Action Figures','Board Games','Soft Toys','Baby Care','Learning','Outdoor Play']],
      ['c8','Books','books','Fiction, academics & stationery','#64748b',
       ['Fiction','Non-Fiction','Academics','Comics','Stationery','Exam Prep']]
    ];
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      appendRow('Categories', {
        id: c[0], name: c[1], slug: c[2], description: c[3], color: c[4],
        icon: 'assets/img/categories/' + c[2] + '.svg',
        banner: 'assets/img/categories/' + c[2] + '-banner.svg',
        subCategories: JSON.stringify(c[5]), brands: '[]', productCount: 0,
        status: 'active', sortOrder: i + 1, createdAt: nowISO()
      });
    }
  }

  // 4. Default coupons
  if (readAll('Coupons').length === 0) {
    var coupons = [
      ['PSHOP10','percent',10,999,300,'10% off on orders above ₹999'],
      ['FLAT200','flat',200,1499,200,'Flat ₹200 off above ₹1499'],
      ['NEWUSER','percent',15,499,500,'15% off for your first order'],
      ['FREESHIP','shipping',0,0,79,'Free delivery on any order'],
      ['BIGSAVE50','percent',50,4999,1500,'50% off above ₹4999 (max ₹1500)']
    ];
    for (var j = 0; j < coupons.length; j++) {
      var cp = coupons[j];
      appendRow('Coupons', {
        code: cp[0], type: cp[1], value: cp[2], minOrder: cp[3], maxDiscount: cp[4],
        description: cp[5], usageLimit: 10000, usedCount: 0,
        expiry: '2026-12-31', active: true, createdAt: nowISO()
      });
    }
  }

  // 5. Default settings
  if (readAll('Settings').length === 0) {
    var settings = [
      ['siteName','PShop','Website ka naam'],
      ['currency','INR','Default currency'],
      ['freeShipAbove','499','Is amount ke upar free delivery'],
      ['shippingFee','79','Standard delivery charge'],
      ['expressFee','129','Express delivery charge'],
      ['codFee','29','Cash on delivery ka extra charge'],
      ['taxRate','0.18','GST rate (inclusive)'],
      ['supportEmail',CONFIG.SUPPORT_EMAIL,'Support email address'],
      ['supportPhone','1800 209 7746','Support phone number'],
      ['maintenanceMode','false','Site maintenance mode on/off']
    ];
    for (var k = 0; k < settings.length; k++) {
      appendRow('Settings', {
        key: settings[k][0], value: settings[k][1],
        description: settings[k][2], updatedAt: nowISO()
      });
    }
  }

  // 6. Default banners aur FAQs (Content.gs khud seed kar leta hai)
  apiGetBanners({});
  apiGetFaqs({});

  Logger.log('✅ PShop database setup complete.');
  Logger.log('   Sheet: "' + ss.getName() + '"');
  Logger.log('   URL: ' + ss.getUrl());
  Logger.log('   Tabs: ' + Object.keys(SCHEMA).join(', '));
  Logger.log('   Admin login: ' + CONFIG.ADMIN_EMAIL + ' / admin123');
  return ok(listSheetStatus(), 'Database setup complete.');
}

/**
 * OPTIONAL — demo products import karne ke liye.
 * assets/data/products.json ka content yahan paste karke run karein,
 * ya PUBLIC_JSON_URL me apni hosted JSON ka URL de dein.
 */
function importDemoProducts() {
  var PUBLIC_JSON_URL = '';   // e.g. 'https://yoursite.com/assets/data/products.json'
  if (!PUBLIC_JSON_URL) {
    Logger.log('PUBLIC_JSON_URL set karein ya products manually add karein.');
    return fail('No import URL configured.');
  }
  var res = UrlFetchApp.fetch(PUBLIC_JSON_URL);
  var items = JSON.parse(res.getContentText());
  var sh = getSheet(CONFIG.SHEETS.PRODUCTS);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var p = items[i];
    p.status = 'active';
    p.createdAt = p.createdAt || nowISO();
    p.updatedAt = nowISO();
    rows.push(objectToRow(headers, p));
  }
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  Logger.log('Imported ' + rows.length + ' products.');
  return ok({ imported: rows.length }, 'Products imported.');
}

/** Purane OTP records saaf karta hai — time-driven trigger me lagayen (roz). */
function cleanupExpiredOtps() {
  var sh = getSheet(CONFIG.SHEETS.OTP);
  var values = sh.getDataRange().getValues();
  var now = new Date().getTime();
  var removed = 0;
  for (var r = values.length - 1; r >= 1; r--) {
    var exp = new Date(values[r][4]).getTime();
    if (!exp || exp < now) { sh.deleteRow(r + 1); removed++; }
  }
  Logger.log('Removed ' + removed + ' expired OTP rows.');
  return removed;
}
