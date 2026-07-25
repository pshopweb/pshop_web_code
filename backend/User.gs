/**
 * PShop — User.gs
 * Profile read/update, address book aur image upload (Drive).
 */

/** Profile details. */
function apiGetProfile(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var record = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(user.id); });
  if (!record) return fail('Account not found.', 404);
  return ok({ user: publicUser(record) });
}

/** Profile update (name, email, phone, dob, gender, avatar). */
function apiUpdateProfile(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var patch = p.patch || p;
  var updates = { updatedAt: nowISO() };

  if (patch.name !== undefined) {
    if (!V.name(patch.name)) return fail('Please enter a valid name.');
    updates.name = String(patch.name).trim();
  }
  if (patch.email !== undefined) {
    if (!V.email(patch.email)) return fail('Please enter a valid email.');
    var email = String(patch.email).trim().toLowerCase();
    var clash = findOne(CONFIG.SHEETS.USERS, function (u) {
      return String(u.email).toLowerCase() === email && String(u.id) !== String(user.id);
    });
    if (clash) return fail('That email is already used by another account.');
    updates.email = email;
  }
  if (patch.phone !== undefined) {
    if (!V.phone(patch.phone)) return fail('Please enter a valid 10-digit mobile number.');
    var phone = String(patch.phone).replace(/\D/g, '').slice(-10);
    var clash2 = findOne(CONFIG.SHEETS.USERS, function (u) {
      return String(u.phone) === phone && String(u.id) !== String(user.id);
    });
    if (clash2) return fail('That mobile number is already registered.');
    updates.phone = phone;
  }
  if (patch.gender !== undefined) updates.gender = patch.gender;
  if (patch.dob !== undefined) updates.dob = patch.dob;
  if (patch.avatar !== undefined) updates.avatar = patch.avatar;

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id, updates);

  var fresh = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(user.id); });
  return ok({ user: publicUser(fresh) }, 'Profile updated.');
}

/** User ki saari addresses. */
function apiGetAddresses(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var record = findOne(CONFIG.SHEETS.USERS, function (u) { return String(u.id) === String(user.id); });
  var list = [];
  try { list = typeof record.addresses === 'string' ? JSON.parse(record.addresses || '[]') : (record.addresses || []); }
  catch (e) { list = []; }
  return ok({ items: list });
}

/** Address add ya update karta hai. */
function apiSaveAddress(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var a = p.address || {};

  if (!V.name(a.name))  return fail('Please enter the recipient name.');
  if (!V.phone(a.phone)) return fail('Please enter a valid 10-digit mobile number.');
  if (!V.pin(a.pin))    return fail('Please enter a valid 6-digit pincode.');
  if (!V.required(a.city))  return fail('Please enter your city.');
  if (!V.required(a.state)) return fail('Please select your state.');
  if (String(a.line1 || '').trim().length < 8) return fail('Please enter your full street address.');

  var res = apiGetAddresses({}, user);
  var list = res.data.items;

  // Client apna id bhej sakta hai (offline banaya hua). Agar wo id list me
  // mile to update karo, warna naya address maankar append karo.
  var found = false;
  if (a.id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === a.id) {
        list[i] = Object.assign({}, list[i], a);
        found = true;
        break;
      }
    }
  }
  if (!found) {
    a.id = a.id || uid('ADR');
    a.createdAt = a.createdAt || nowISO();
    list.push(a);
  }

  // Default sirf ek hi ho sakta hai.
  if (a.isDefault || list.length === 1) {
    for (var j = 0; j < list.length; j++) list[j].isDefault = (list[j].id === a.id);
  }

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id,
    { addresses: JSON.stringify(list), updatedAt: nowISO() });

  return ok({ items: list, address: a }, 'Address saved.');
}

/** Address delete. */
function apiDeleteAddress(p, user) {
  if (!user) return fail('Please sign in.', 401);
  var res = apiGetAddresses({}, user);
  var list = res.data.items.filter(function (a) { return a.id !== p.addressId; });

  // Default hat gaya to pehle wale ko default bana do.
  var hasDefault = list.some(function (a) { return a.isDefault; });
  if (list.length && !hasDefault) list[0].isDefault = true;

  updateRow(CONFIG.SHEETS.USERS, 'id', user.id,
    { addresses: JSON.stringify(list), updatedAt: nowISO() });

  return ok({ items: list }, 'Address deleted.');
}

/**
 * Base64 image ko Google Drive me save karke public URL deta hai.
 * payload: { base64: "data:image/jpeg;base64,...", filename: "avatar.jpg" }
 */
function apiUploadImage(p, user) {
  if (!user) return fail('Please sign in.', 401);
  if (!p.base64) return fail('No image data received.');

  try {
    var parts = String(p.base64).split(',');
    var meta = parts[0] || '';
    var data = parts[1] || parts[0];
    var mime = (meta.match(/data:([^;]+);/) || [null, 'image/jpeg'])[1];

    var blob = Utilities.newBlob(Utilities.base64Decode(data), mime,
      p.filename || (uid('IMG') + '.jpg'));

    var folder = getUploadFolder();
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    return ok({ url: url, fileId: file.getId() }, 'Image uploaded.');
  } catch (e) {
    return fail('Upload failed: ' + e.message, 500);
  }
}

/** Uploads folder banata/deta hai. */
function getUploadFolder() {
  var name = 'PShop Uploads';
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
