/**
 * PShop — Notification.gs
 * In-app notifications create, list aur read-mark karna.
 */

/** User ki notifications. */
function apiGetNotifications(p, user) {
  if (!user) return fail('Please sign in.', 401);

  var list = findAll(CONFIG.SHEETS.NOTIFICATIONS, function (n) {
    return String(n.userId) === String(user.id) || String(n.userId) === 'all';
  });

  list.sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  var items = list.slice(0, 50).map(function (n) {
    return {
      id: n.id, title: n.title, body: n.body, type: n.type || 'system',
      link: n.link || '', read: n.read === true || n.read === 'TRUE',
      at: n.createdAt
    };
  });

  return ok({
    items: items,
    unread: items.filter(function (n) { return !n.read; }).length
  });
}

/** Ek ya saari notifications read mark karta hai. */
function apiMarkNotificationRead(p, user) {
  if (!user) return fail('Please sign in.', 401);

  if (p.all) {
    var list = findAll(CONFIG.SHEETS.NOTIFICATIONS, function (n) {
      return String(n.userId) === String(user.id);
    });
    for (var i = 0; i < list.length; i++) {
      updateRow(CONFIG.SHEETS.NOTIFICATIONS, 'id', list[i].id, { read: true });
    }
  } else if (p.id) {
    updateRow(CONFIG.SHEETS.NOTIFICATIONS, 'id', p.id, { read: true });
  }

  return apiGetNotifications(p, user);
}

/**
 * Notification banata hai — baaki modules isi ko call karte hain.
 * @param {string} userId 'all' bhi ho sakta hai
 */
function pushNotification(userId, title, body, type, link) {
  appendRow(CONFIG.SHEETS.NOTIFICATIONS, {
    id: uid('N'), userId: userId || 'all',
    title: title, body: body,
    type: type || 'system', link: link || '',
    read: false, createdAt: nowISO()
  });
}

/** Admin: sabhi users ko broadcast. */
function broadcastNotification(title, body, type, link) {
  pushNotification('all', title, body, type || 'offer', link || '');
  return ok({ sent: true }, 'Notification broadcast to all users.');
}
