/**
 * PShop — Message.gs
 * Support chat threads, contact form aur newsletter subscription.
 */

/** User ke saare message threads. */
function apiGetMessages(p, user) {
  if (!user) return fail('Please sign in.', 401);

  var list = findAll(CONFIG.SHEETS.MESSAGES, function (m) {
    return String(m.userId) === String(user.id);
  });

  // Pehli baar aane par welcome thread bana do.
  if (!list.length) {
    var welcome = {
      id: uid('MSG'), userId: user.id, name: 'PShop Support',
      email: CONFIG.SUPPORT_EMAIL, subject: 'Welcome to PShop 🎉',
      thread: JSON.stringify([{
        by: 'support',
        text: 'Hi! Thanks for joining PShop. Reply here any time — our team responds within a few hours.',
        at: nowISO()
      }]),
      status: 'open', unread: true, createdAt: nowISO(), updatedAt: nowISO()
    };
    appendRow(CONFIG.SHEETS.MESSAGES, welcome);
    list = [welcome];
  }

  list.sort(function (a, b) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  var items = list.map(function (m) {
    return {
      id: m.id, from: m.name, subject: m.subject, email: m.email,
      thread: toArray(m.thread), status: m.status,
      unread: m.unread === true || m.unread === 'TRUE',
      at: m.updatedAt || m.createdAt
    };
  });

  var unread = items.filter(function (m) { return m.unread; }).length;
  return ok({ items: items, unread: unread });
}

/** Message bhejta hai (naya thread ya existing me reply). */
function apiSendMessage(p, user) {
  var text = String(p.text || '').trim();
  if (!text) return fail('Please type a message.');

  var now = nowISO();
  var thread = p.threadId
    ? findOne(CONFIG.SHEETS.MESSAGES, function (m) { return String(m.id) === String(p.threadId); })
    : null;

  if (thread) {
    var msgs = toArray(thread.thread);
    msgs.push({ by: 'user', text: text, at: now });
    // Auto-acknowledgement.
    msgs.push({
      by: 'support',
      text: 'Thanks for reaching out! Ticket logged — our support team will reply shortly.',
      at: now
    });
    updateRow(CONFIG.SHEETS.MESSAGES, 'id', thread.id, {
      thread: JSON.stringify(msgs), unread: true, updatedAt: now
    });
    thread.thread = msgs;
  } else {
    thread = {
      id: uid('MSG'),
      userId: user ? user.id : 'guest',
      name: p.name || (user && user.name) || 'Guest',
      email: p.email || (user && user.email) || '',
      subject: String(p.subject || 'New enquiry').slice(0, 120),
      thread: JSON.stringify([
        { by: 'user', text: text, at: now },
        { by: 'support',
          text: 'Thanks for reaching out! Ticket logged — our support team will reply shortly.',
          at: now }
      ]),
      status: 'open', unread: true, createdAt: now, updatedAt: now
    };
    appendRow(CONFIG.SHEETS.MESSAGES, thread);

    // Admin ko notify karo.
    sendEmail(CONFIG.ADMIN_EMAIL, 'New support ticket: ' + thread.subject,
      emailTemplate('New support ticket',
        '<p><b>From:</b> ' + thread.name + ' (' + thread.email + ')</p>' +
        '<p><b>Subject:</b> ' + thread.subject + '</p>' +
        '<p><b>Message:</b><br>' + text + '</p>'));
  }

  return ok({
    thread: {
      id: thread.id, from: thread.name, subject: thread.subject,
      thread: toArray(thread.thread), status: thread.status, at: now
    }
  }, 'Message sent.');
}

/** Contact form — ticket bhi banata hai aur email bhi bhejta hai. */
function apiContact(p) {
  if (!V.name(p.name))   return fail('Please enter your name.');
  if (!V.email(p.email)) return fail('Please enter a valid email.');
  if (!p.message || String(p.message).trim().length < 10) {
    return fail('Message must be at least 10 characters.');
  }

  apiSendMessage({
    text: p.message, subject: p.subject || 'Contact form enquiry',
    name: p.name, email: p.email
  }, null);

  // User ko acknowledgement.
  sendEmail(p.email, 'We received your message — PShop',
    emailTemplate('Thanks for writing to us',
      '<p>Hi ' + p.name + ', we have received your message and our team will get back ' +
      'to you within 24 hours.</p><p><i>"' + String(p.message).slice(0, 200) + '"</i></p>'));

  return ok({ received: true }, 'Thanks! We have received your message.');
}

/** Newsletter subscription. */
function apiSubscribeNewsletter(p) {
  if (!V.email(p.email)) return fail('Please enter a valid email address.');
  var email = String(p.email).trim().toLowerCase();

  var sh = getSheet('Newsletter', ['email', 'subscribedAt', 'status']);
  var rows = readAll('Newsletter');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === email) {
      return ok({ already: true }, 'You are already subscribed.');
    }
  }

  appendRow('Newsletter', { email: email, subscribedAt: nowISO(), status: 'active' });

  sendEmail(email, 'Welcome to the PShop newsletter',
    emailTemplate('You are on the list! 🎉',
      '<p>Thanks for subscribing. You will be the first to know about flash sales, ' +
      'price drops and exclusive coupons.</p>'));

  return ok({ subscribed: true }, 'Subscribed! Watch your inbox for deals.');
}
