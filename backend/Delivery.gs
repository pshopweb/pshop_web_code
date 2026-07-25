/**
 * PShop — Delivery.gs
 * Pincode serviceability, delivery records aur shipment updates.
 */

/** Pincode serviceable hai ya nahi + ETA. */
function apiCheckPincode(p) {
  var pin = String(p.pincode || '').trim();
  if (!V.pin(pin)) return fail('Please enter a valid 6-digit pincode.');

  // Blocked pincodes sheet me ho to unhe non-serviceable maano.
  var blocked = findOne(CONFIG.SHEETS.DELIVERY, function (d) {
    return String(d.pincode) === pin && String(d.status) === 'blocked';
  });
  if (blocked) {
    return ok({ serviceable: false, pincode: pin },
      'Sorry, we do not deliver to ' + pin + ' yet.');
  }

  // Metro pincodes (1st digit 1-5) thoda fast, baaki +1 din.
  var firstDigit = parseInt(pin.charAt(0), 10);
  var days = firstDigit <= 5 ? 3 : 4;
  if (p.express) days = Math.max(1, days - 2);

  return ok({
    serviceable: true,
    pincode: pin,
    days: days,
    eta: addDays(new Date(), days).toISOString(),
    codAvailable: true,
    expressAvailable: firstDigit <= 6
  }, 'Delivery available at ' + pin + '.');
}

/** Order ka delivery record. */
function apiGetDelivery(p) {
  var record = findOne(CONFIG.SHEETS.DELIVERY, function (d) {
    return String(d.orderId) === String(p.orderId);
  });
  if (!record) return fail('No delivery record found.', 404);
  record.updates = toArray(record.updates);
  return ok({ delivery: record });
}

/** Order place hone par delivery row banata hai. */
function createDeliveryRecord(order) {
  var address = toObject(order.address);
  appendRow(CONFIG.SHEETS.DELIVERY, {
    id: uid('DLV'),
    orderId: order.id,
    awb: order.awb,
    courier: order.courier || 'PShop Express',
    status: 'Pending pickup',
    pincode: address.pin || '',
    city: address.city || '',
    agent: '', agentPhone: '',
    eta: order.expectedAt,
    updates: JSON.stringify([{ at: nowISO(), note: 'Shipment created. Awaiting pickup.' }]),
    createdAt: nowISO(), updatedAt: nowISO()
  });
}

/** Delivery status update (admin / courier webhook). */
function updateDeliveryStatus(orderId, status, note, agent, agentPhone) {
  var record = findOne(CONFIG.SHEETS.DELIVERY, function (d) {
    return String(d.orderId) === String(orderId);
  });
  if (!record) return false;

  var updates = toArray(record.updates);
  updates.push({ at: nowISO(), note: note || status });

  var patch = { status: status, updates: JSON.stringify(updates), updatedAt: nowISO() };
  if (agent) patch.agent = agent;
  if (agentPhone) patch.agentPhone = agentPhone;

  updateRow(CONFIG.SHEETS.DELIVERY, 'id', record.id, patch);
  return true;
}
