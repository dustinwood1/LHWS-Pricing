// Email-link sign-in for admin.html, through Firebase Authentication (free plan). The admin types
// their email, Firebase emails them a link, and opening it signs them in on that device. The GitHub
// token used for saving is kept in Firestore, readable only by the signed-in admin, so it is pasted
// once rather than on every device. Settings are in admin-config.js.
(function () {
  var C = window.LHWS_ADMIN || {};
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var EMAIL_KEY = 'lhws-admin-login-email';
  var $ = function (id) { return document.getElementById(id); };

  function script(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('could not load the sign-in service')); };
      document.head.appendChild(s);
    });
  }
  function remembered(email) {
    try {
      if (email === undefined) return localStorage.getItem(EMAIL_KEY) || '';
      if (email) localStorage.setItem(EMAIL_KEY, email); else localStorage.removeItem(EMAIL_KEY);
    } catch (e) { return ''; }
  }
  function status(text, kind) {
    $('login-status').textContent = text;
    $('login-status').className = 'status ' + (kind || '');
  }
  function admin() { return String(C.adminEmail).toLowerCase(); }

  // The admin's GitHub token lives in one Firestore document, through Firestore's REST API.
  function tokenDoc(user) {
    var url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(C.firebase.projectId) +
      '/databases/(default)/documents/admin/github';
    function call(method, body) {
      return user.getIdToken().then(function (idToken) {
        return fetch(url, {
          method: method,
          headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
      });
    }
    return {
      load: function () {
        return call('GET').then(function (r) {
          if (r.status === 404) return '';
          if (!r.ok) throw new Error('your account storage answered ' + r.status);
          return r.json().then(function (doc) {
            return (doc.fields && doc.fields.githubToken && doc.fields.githubToken.stringValue) || '';
          });
        });
      },
      save: function (token) {
        return call('PATCH', { fields: { githubToken: { stringValue: token } } }).then(function (r) {
          if (!r.ok) throw new Error('your account storage answered ' + r.status);
        });
      },
    };
  }

  // Resolves with a session once the admin is signed in, or with null when sign-in is turned off.
  function start() {
    if (!C.firebase) return Promise.resolve(null);
    $('login').hidden = false;
    return script(SDK + 'firebase-app-compat.js')
      .then(function () { return script(SDK + 'firebase-auth-compat.js'); })
      .then(function () {
        var app = window.firebase.initializeApp(C.firebase);
        var auth = app.auth();

        $('login-email').value = remembered() || '';
        $('login-btn').addEventListener('click', function () {
          var email = $('login-email').value.trim().toLowerCase();
          if (!email) { status('Enter your email.', 'bad'); return; }
          if (email !== admin()) { status('Only the admin email can sign in here.', 'bad'); return; }
          $('login-btn').disabled = true;
          status('Sending…');
          auth.sendSignInLinkToEmail(email, { url: location.origin + location.pathname, handleCodeInApp: true })
            .then(function () {
              remembered(email);
              status('Sign-in link sent to ' + email + '. Open it on this device to sign in.', 'ok');
            })
            .catch(function (e) { status('Could not send the link: ' + e.message, 'bad'); })
            .then(function () { $('login-btn').disabled = false; });
        });

        // Coming back from the emailed link.
        var finishing = Promise.resolve();
        if (auth.isSignInWithEmailLink(location.href)) {
          var email = remembered() || window.prompt('Confirm your email to finish signing in') || '';
          status('Signing in…');
          finishing = auth.signInWithEmailLink(email.trim().toLowerCase(), location.href)
            .then(function () { status(''); })
            .catch(function () { status('That sign-in link has expired or was already used. Send a new one.', 'bad'); })
            .then(function () { history.replaceState(null, '', location.pathname); });
        }

        return finishing.then(function () {
          return new Promise(function (resolve) {
            var done = false;
            auth.onAuthStateChanged(function (user) {
              if (done) { if (!user) location.reload(); return; }
              if (!user) return;
              if (String(user.email).toLowerCase() !== admin() || !user.emailVerified) {
                auth.signOut();
                status('Only ' + C.adminEmail + ' can use this page.', 'bad');
                return;
              }
              done = true;
              $('login').hidden = true;
              var doc = tokenDoc(user);
              resolve({
                email: user.email,
                loadToken: doc.load,
                saveToken: doc.save,
                signOut: function () { return auth.signOut(); },
              });
            });
          });
        });
      });
  }

  window.LHWS_LOGIN = { start: start };
})();
