// Simple sign-in for admin.html: the admin types their email, the page emails them a one-time link
// (through FormSubmit), and opening that link on the same device signs them in for 30 days.
// This is a front door, not a lock: the site has no server, so a technical visitor could get past
// it in their browser. Saving prices still needs the GitHub token, which is the real protection.
(function () {
  var C = window.LHWS_ADMIN || {};
  var PENDING_KEY = 'lhws-admin-login-pending';
  var SESSION_KEY = 'lhws-admin-session';
  var LINK_MINUTES = 30;
  var SESSION_DAYS = 30;
  var $ = function (id) { return document.getElementById(id); };

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function write(key, value) {
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key);
      return true;
    } catch (e) { return false; }
  }
  function status(text, kind) {
    $('login-status').textContent = text;
    $('login-status').className = 'status ' + (kind || '');
  }
  function admin() { return String(C.adminEmail).toLowerCase(); }
  function randomCode() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function sendLink(email) {
    var code = randomCode();
    if (!write(PENDING_KEY, { code: code, until: Date.now() + LINK_MINUTES * 60000 })) {
      return Promise.reject(new Error('this browser is blocking site storage'));
    }
    var link = location.origin + location.pathname + '#signin=' + code;
    return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'LHWS Price Admin sign-in link',
        _template: 'box',
        _captcha: 'false',
        message: 'Open this link on the same device to sign in to the LHWS price admin page. ' +
          'It works once, for ' + LINK_MINUTES + ' minutes:\n\n' + link,
      }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.body.success) === 'false') throw new Error(res.body.message || 'the email service did not accept it');
      });
  }

  // A link opened in a tab that already shows this page only changes the hash; start over.
  window.addEventListener('hashchange', function () {
    if (/^#signin=/.test(location.hash)) location.reload();
  });

  // Resolves with the signed-in admin once there is a valid session.
  function start() {
    var match = location.hash.match(/^#signin=([0-9a-f]+)$/);
    if (match) {
      history.replaceState(null, '', location.pathname);
      var pending = read(PENDING_KEY);
      if (pending && pending.code === match[1] && pending.until > Date.now()) {
        write(PENDING_KEY, null);
        write(SESSION_KEY, { email: C.adminEmail, until: Date.now() + SESSION_DAYS * 86400000 });
      } else {
        status('That sign-in link has expired, was already used, or was opened on a different device. Send a new one.', 'bad');
      }
    }

    var session = read(SESSION_KEY);
    if (session && session.until > Date.now() && String(session.email).toLowerCase() === admin()) {
      return Promise.resolve({
        email: session.email,
        signOut: function () { write(SESSION_KEY, null); return Promise.resolve(); },
      });
    }
    write(SESSION_KEY, null);

    $('login').hidden = false;
    $('login-btn').addEventListener('click', function () {
      var email = $('login-email').value.trim().toLowerCase();
      if (!email) { status('Enter your email.', 'bad'); return; }
      if (email !== admin()) { status('Only the admin email can sign in here.', 'bad'); return; }
      $('login-btn').disabled = true;
      status('Sending…');
      sendLink(email)
        .then(function () { status('Sign-in link sent to ' + email + '. Open it on this device to sign in.', 'ok'); })
        .catch(function (e) { status('Could not send the link: ' + e.message + '.', 'bad'); })
        .then(function () { $('login-btn').disabled = false; });
    });
    return new Promise(function () {}); // the emailed link reloads the page signed in
  }

  window.LHWS_LOGIN = { start: start };
})();
