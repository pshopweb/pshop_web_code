/**
 * PShop — Auth.gs
 * Signup, login, OTP bhejna/verify karna, password reset aur change.
 */

/** Naya account banata hai. */
function apiSignup(p) {
  if (!V.name(p.name))   return fail('Please enter a valid full name.');
  if (!V.email(p.email)) return fail('Please enter a valid email address.');
  if (!V.phone(p.phone)) return fail('Please enter a valid 10-digit mobile number.');
  if (!V.pw(p.password)) return fail('Password must be at least 6 characters.');

  var email = String(p.email).trim().toLowerCase();
  var phone = String(p.phone).replace(/\D/g, '').slice(-10);

  var existsEmail = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.email).toLowerCase() === email;
  });
  if (existsEmail) return fail('An account with this email already exists.');

  var existsPhone = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.phone) === phone;
  });
  if (existsPhone) return fail('This mobile number is already registered.');

  var user = {
    id: nextId(CONFIG.SHEETS.USERS, 'U', 4),
    name: String(p.name).trim(),
    email: email,
    phone: phone,
    password: hashPassword(p.password),
    role: 'customer',
    verified: false,
    avatar: '', gender: '', dob: '',
    addresses: '[]',
    status: 'active',
    createdAt: nowISO(), updatedAt: nowISO(), lastLogin: nowISO()
  };
  appendRow(CONFIG.SHEETS.USERS, user);

  // Welcome email + welcome notification.
  sendEmail(email, 'Welcome to PShop 🎉', emailTemplate('Welcome aboard, ' + user.name + '!',
    '<p>Your PShop account is ready. Use code <b>NEWUSER</b> for 15% off your first order.</p>' +
    '<p>Happy shopping!</p>'));

  pushNotification(user.id, 'Welcome to PShop',
    'Use code NEWUSER for 15% off your first order.', 'offer', 'pages/shop.html');

  return ok({ user: publicUser(user), token: createToken(user.id) },
    'Account created successfully.');
}

/** Email ya phone + password se login. */
function apiLogin(p) {
  var id = String(p.identifier || '').trim().toLowerCase();
  if (!id) return fail('Please enter your email or mobile number.');

  var user = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.email).toLowerCase() === id || String(u.phone) === id;
  });
  if (!user) return fail('No account found with those details.', 404);
  if (String(user.status) === 'blocked') return fail('This account has been suspended. Contact support.', 403);
  if (user.password !== hashPassword(p.password)) return fail('Incorrect password. Please try again.', 401);

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id, { lastLogin: nowISO() });

  return ok({ user: publicUser(user), token: createToken(user.id) },
    'Welcome back, ' + String(user.name).split(' ')[0] + '!');
}

/**
 * OTP bhejta hai (login / signup / reset ke liye).
 * Purpose 'signup' ho to account ka hona zaroori nahi.
 */
function apiSendOtp(p) {
  var id = String(p.identifier || '').trim().toLowerCase();
  var purpose = p.purpose || 'login';
  var isEmail = V.email(id), isPhone = V.phone(id);

  if (!isEmail && !isPhone) return fail('Enter a valid email or 10-digit mobile number.');

  var user = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.email).toLowerCase() === id || String(u.phone) === id;
  });
  if (purpose !== 'signup' && !user) return fail('No account is linked to those details.', 404);

  // 6-digit random code.
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(new Date().getTime() + CONFIG.OTP_TTL_MINUTES * 60000).toISOString();

  // Purana OTP hatao, naya daalo.
  deleteRow(CONFIG.SHEETS.OTP, 'identifier', id);
  appendRow(CONFIG.SHEETS.OTP, {
    identifier: id, code: code, purpose: purpose,
    attempts: 0, expiresAt: expiresAt, createdAt: nowISO()
  });

  // Email par OTP bhejo. (SMS ke liye apna gateway Delivery.gs me add kar sakte hain.)
  var target = isEmail ? id : (user ? user.email : '');
  if (target) {
    sendEmail(target, 'Your PShop verification code: ' + code,
      emailTemplate('Your verification code',
        '<p style="font-size:32px;font-weight:800;letter-spacing:8px;color:#2563eb;margin:18px 0">' +
        code + '</p>' +
        '<p>This code is valid for ' + CONFIG.OTP_TTL_MINUTES + ' minutes. ' +
        'Please do not share it with anyone.</p>' +
        '<p style="color:#64748b;font-size:13px">If you did not request this, you can ignore this email.</p>'));
  }

  return ok({
    sentTo: isEmail ? 'email' : 'mobile',
    masked: maskIdentifier(id),
    expiresIn: CONFIG.OTP_TTL_MINUTES * 60
  }, 'OTP sent to your ' + (isEmail ? 'email' : 'registered email') + '.');
}

/** OTP verify karta hai; login purpose ho to token bhi deta hai. */
function apiVerifyOtp(p) {
  var code = String(p.code || '').trim();
  var id = String(p.identifier || '').trim().toLowerCase();

  // identifier na aaye to sabse naya OTP record use karo.
  var record = id
    ? findOne(CONFIG.SHEETS.OTP, function (o) { return String(o.identifier).toLowerCase() === id; })
    : latestOtpRecord();

  if (!record) return fail('No OTP request found. Please request a new code.');

  if (new Date(record.expiresAt).getTime() < new Date().getTime()) {
    deleteRow(CONFIG.SHEETS.OTP, 'identifier', record.identifier);
    return fail('This OTP has expired. Please request a new one.');
  }

  var attempts = parseInt(record.attempts, 10) || 0;
  if (attempts >= CONFIG.OTP_MAX_ATTEMPTS) {
    deleteRow(CONFIG.SHEETS.OTP, 'identifier', record.identifier);
    return fail('Too many incorrect attempts. Please request a new OTP.');
  }

  if (String(record.code) !== code) {
    updateRow(CONFIG.SHEETS.OTP, 'identifier', record.identifier, { attempts: attempts + 1 });
    return fail('Incorrect OTP. ' + (CONFIG.OTP_MAX_ATTEMPTS - attempts - 1) + ' attempt(s) left.');
  }

  // Sahi OTP — record hata do.
  deleteRow(CONFIG.SHEETS.OTP, 'identifier', record.identifier);

  var ident = String(record.identifier).toLowerCase();
  var user = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.email).toLowerCase() === ident || String(u.phone) === ident;
  });

  if (user) {
    updateRow(CONFIG.SHEETS.USERS, 'id', user.id, { verified: true, lastLogin: nowISO() });
    user.verified = true;
  }

  return ok({
    verified: true,
    purpose: record.purpose,
    identifier: record.identifier,
    user: user ? publicUser(user) : null,
    token: user ? createToken(user.id) : null
  }, 'Verification successful.');
}

/** OTP verify hone ke baad naya password set karta hai. */
function apiResetPassword(p) {
  if (!V.pw(p.password)) return fail('Password must be at least 6 characters.');
  var id = String(p.identifier || '').trim().toLowerCase();

  var user = findOne(CONFIG.SHEETS.USERS, function (u) {
    return String(u.email).toLowerCase() === id || String(u.phone) === id;
  });
  if (!user) return fail('Account not found.', 404);

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id, {
    password: hashPassword(p.password), updatedAt: nowISO()
  });

  sendEmail(user.email, 'Your PShop password was changed',
    emailTemplate('Password updated',
      '<p>Your PShop password was changed on ' + new Date().toLocaleString('en-IN') + '.</p>' +
      '<p>If this was not you, please contact us immediately at ' + CONFIG.SUPPORT_EMAIL + '.</p>'));

  return ok({ reset: true }, 'Password updated. Please sign in.');
}

/** Logged-in user ka password change. */
function apiChangePassword(p, user) {
  if (!user) return fail('Please sign in to continue.', 401);

  var record = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(user.id); });
  if (!record) return fail('Account not found.', 404);

  if (record.password !== hashPassword(p.current)) return fail('Your current password is incorrect.');
  if (!V.pw(p.next)) return fail('New password must be at least 6 characters.');

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id, {
    password: hashPassword(p.next), updatedAt: nowISO()
  });

  return ok({ changed: true }, 'Password changed successfully.');
}

/** Sabse recent OTP row (fallback). */
function latestOtpRecord() {
  var rows = readAll(CONFIG.SHEETS.OTP);
  if (!rows.length) return null;
  rows.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return rows[0];
}
