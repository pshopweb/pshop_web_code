/**
 * PShop — Content.gs
 * Homepage banners aur FAQ content. Ye data Sheets se aata hai taaki
 * admin bina code chhue website ka content badal sake.
 */

/** Hero slider ke banners. */
function apiGetBanners(p) {
  var sh = getSheet('Banners',
    ['id', 'title', 'subtitle', 'cta', 'link', 'image', 'theme', 'active', 'sortOrder']);

  var rows = readAll('Banners');

  // Pehli baar khaali ho to default banners daal do.
  if (!rows.length) {
    var defaults = [
      ['b1', 'Monsoon Mega Sale', 'Up to 60% off on Electronics', 'Shop Electronics',
       'pages/category.html?cat=electronics', 'assets/img/banners/banner-1.svg', '#1d4ed8'],
      ['b2', 'Fashion Fiesta', 'Trending styles from ₹299', 'Explore Fashion',
       'pages/category.html?cat=fashion', 'assets/img/banners/banner-2.svg', '#be185d'],
      ['b3', 'Home Upgrade Days', 'Appliances & cookware deals', 'Shop Home',
       'pages/category.html?cat=home-kitchen', 'assets/img/banners/banner-3.svg', '#b45309'],
      ['b4', 'Flash Sale Live', 'Extra 18% off — limited hours', 'Grab Now',
       'pages/shop.html?tag=flash', 'assets/img/banners/banner-4.svg', '#047857']
    ];
    for (var i = 0; i < defaults.length; i++) {
      var b = defaults[i];
      appendRow('Banners', {
        id: b[0], title: b[1], subtitle: b[2], cta: b[3], link: b[4],
        image: b[5], theme: b[6], active: true, sortOrder: i + 1
      });
    }
    rows = readAll('Banners');
  }

  var items = rows.filter(function (b) {
    return b.active === true || b.active === 'TRUE' || b.active === 'true';
  });
  items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });

  return ok({ items: items });
}

/** FAQ list (category ke hisab se grouped frontend me hoti hai). */
function apiGetFaqs(p) {
  var sh = getSheet('FAQs', ['id', 'category', 'question', 'answer', 'sortOrder', 'active']);
  var rows = readAll('FAQs');

  if (!rows.length) {
    var defaults = [
      ['Orders', 'How do I place an order on PShop?',
       'Add products to your cart, open the cart page, apply a coupon if you have one, then continue to checkout. Choose a delivery address, pick a payment method and confirm. You will receive an order ID instantly.'],
      ['Orders', 'Can I cancel my order after placing it?',
       'Yes. Orders can be cancelled free of charge any time before they are marked Shipped. Open Orders → Order Details → Cancel Order and select a reason.'],
      ['Orders', 'How do I track my shipment?',
       'Every order has a live timeline. Go to Orders → Track Order to see Placed, Packed, Shipped, Out for Delivery and Delivered stages with timestamps.'],
      ['Payments', 'Which payment methods are supported?',
       'We support Cash on Delivery, UPI (any UPI app), Razorpay cards/netbanking/wallets, and PShop wallet refunds.'],
      ['Payments', 'When will I get my refund?',
       'Refunds for prepaid orders are initiated within 24 hours of return pickup and reach your source account in 3–5 business days. COD refunds go to your bank account in 5–7 business days.'],
      ['Payments', 'Is it safe to pay online?',
       'Yes. Payments are processed by PCI-DSS compliant gateways. PShop never stores your full card number or UPI PIN.'],
      ['Delivery', 'What are the delivery charges?',
       'Delivery is free on orders above ₹499. Below that a flat ₹79 shipping fee applies. Express delivery costs ₹129.'],
      ['Delivery', 'Do you deliver to my pincode?',
       'We deliver to 19,000+ pincodes across India. Enter your pincode on any product page to check serviceability and the expected delivery date.'],
      ['Returns', 'What is the return policy?',
       'Most products carry a 7–30 day return window depending on category. The exact window is shown on the product page and in your order details.'],
      ['Returns', 'How does replacement work?',
       'Choose Replace Order from Order Details within the return window. A pickup is scheduled and the replacement ships once the original item is picked up.'],
      ['Account', 'How do I reset my password?',
       'Go to Login → Forgot Password, enter your registered email or mobile, verify the OTP and set a new password.'],
      ['Account', 'How does OTP login work?',
       'Enter your mobile number on the OTP Verification page. We send a 6-digit code valid for 5 minutes. Enter it to sign in without a password.'],
      ['Account', 'How do I delete my account?',
       'Open Settings → Danger Zone → Delete Account. This permanently removes your profile, addresses and cart. Order history is retained for legal compliance.'],
      ['Products', 'Are the products genuine?',
       'All products are sourced from brand-authorised sellers and pass a quality check before dispatch.'],
      ['Products', 'How do I compare products?',
       'Click the compare icon on any product card. You can compare up to 4 products side by side including price, rating, brand and specifications.']
    ];
    for (var i = 0; i < defaults.length; i++) {
      appendRow('FAQs', {
        id: 'F' + (i + 1), category: defaults[i][0], question: defaults[i][1],
        answer: defaults[i][2], sortOrder: i + 1, active: true
      });
    }
    rows = readAll('FAQs');
  }

  var items = rows.filter(function (f) {
    return f.active === true || f.active === 'TRUE' || f.active === 'true';
  });
  items.sort(function (a, b) { return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0); });

  return ok({ items: items });
}
