// Admin page: edit the prices in form-data.js and save them back to the GitHub repository,
// which GitHub Pages then republishes. Saving uses a GitHub token the admin pastes in; it is
// kept in this browser only (and only if "Remember on this device" is ticked).
(function () {
  var REPO = { owner: 'khaledhamza', name: 'LHWS-Pricing', branch: 'main', path: 'form-data.js' };
  var API = 'https://api.github.com/repos/' + REPO.owner + '/' + REPO.name + '/contents/' + REPO.path;
  var TOKEN_KEY = 'lhws-admin-token';
  var W = window.LHWS_WRITER;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('admin-form');
  var tokenInput = $('token');
  var remember = $('remember');
  var base = null;   // the prices as last loaded or saved
  var edit = null;   // the prices being edited
  var fields = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function setStatus(node, text, kind) {
    node.textContent = text;
    node.className = 'status ' + (kind || '');
  }

  function show(field, v) {
    if (field.kind === 'text') return v;
    if (field.kind === 'percent') return trim(v * 100) + '%';
    return '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function trim(n) { return String(Number(Number(n).toPrecision(12))); }

  // ---- GitHub token, kept only in this browser ----

  function readStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function storeToken() {
    try {
      if (remember.checked && tokenInput.value.trim()) localStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* storage blocked: the token still works for this visit */ }
    showAccess();
  }
  function token() { return tokenInput.value.trim(); }
  function showAccess() {
    var s = $('access-state');
    s.textContent = token() ? 'Token set' : 'Needed to save';
    s.className = 'count' + (token() ? ' ok' : '');
  }

  tokenInput.value = readStoredToken();
  remember.checked = !!tokenInput.value;
  if (!tokenInput.value) $('access').open = true;
  tokenInput.addEventListener('input', storeToken);
  remember.addEventListener('change', storeToken);
  $('forget').addEventListener('click', function () {
    tokenInput.value = '';
    remember.checked = false;
    storeToken();
  });
  showAccess();

  // ---- Reading form-data.js ----

  function headers() {
    var h = { Accept: 'application/vnd.github+json' };
    if (token()) h.Authorization = 'Bearer ' + token();
    return h;
  }

  function decode(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  // The file as it is right now on the branch, straight from GitHub (not the Pages copy,
  // which can lag a minute or two behind a save).
  function fetchRemote() {
    return fetch(API + '?ref=' + REPO.branch + '&t=' + Date.now(), { headers: headers(), cache: 'no-store' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) throw githubError(r.status, body);
          return { sha: body.sha, text: decode(body.content) };
        });
      });
  }

  function githubError(status, body) {
    var msg = (body && body.message) || ('GitHub answered ' + status);
    if (status === 401) msg = 'GitHub did not accept the token. Check it was pasted in full and has not expired';
    else if (status === 403 && /rate limit/i.test(msg)) msg = 'GitHub is limiting requests without a token. Paste a token above and reload';
    else if (status === 403 || status === 404) msg = 'The token cannot write to ' + REPO.name + '. Give it Contents: Read and write on that repository';
    else if (status === 409) msg = 'The price file changed on GitHub while saving. Reload the page and make your changes again';
    var err = new Error(msg);
    err.status = status;
    return err;
  }

  function load() {
    return fetchRemote()
      .then(function (remote) { return { text: remote.text, from: 'GitHub' }; })
      .catch(function () {
        // Fall back to the published copy, e.g. when GitHub's API is rate limiting this network.
        return fetch(REPO.path + '?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('could not load ' + REPO.path); return r.text(); })
          .then(function (text) { return { text: text, from: 'the published site' }; });
      })
      .then(function (got) {
        base = W.loadFormData(got.text).form;
        edit = clone(base);
        build();
        form.hidden = false;
        setStatus($('load-status'), 'Current prices loaded from ' + got.from + '. Changed fields are highlighted.', '');
      })
      .catch(function (err) {
        setStatus($('load-status'), 'Could not load the prices: ' + err.message + '.', 'bad');
      });
  }

  // ---- Building the editor ----

  function addField(parent, f) {
    var input = el('input', {
      type: f.kind === 'text' ? 'text' : 'number', id: 'f' + fields.length,
      inputmode: 'decimal', step: 'any', min: '0', autocomplete: 'off',
    });
    f.input = input;
    f.was = el('span', { class: 'was' });
    f.error = el('p', { class: 'error' });
    input.value = f.kind === 'percent' ? trim(f.get(base) * 100) : f.get(base);
    input.addEventListener('input', function () { onInput(f); });
    var box = f.kind === 'text' ? input : el('span', { class: 'money ' + (f.kind === 'percent' ? 'percent' : 'dollar') }, [input]);
    parent.appendChild(el('div', { class: 'price price-row' }, [
      el('label', { for: input.id }, [el('span', { text: f.label }), f.was]), box, f.error,
    ]));
    fields.push(f);
  }

  function build() {
    fields = [];
    var titleInput = $('title');
    var titleField = {
      label: 'Price list name', kind: 'text', input: titleInput, was: el('span'), error: el('p'),
      get: function (F) { return F.title; }, set: function (F, v) { F.title = v; },
    };
    titleInput.value = base.title;
    titleInput.oninput = function () { onInput(titleField); };
    fields.push(titleField);

    var pickers = $('pickers');
    var wasOpen = [].map.call(pickers.children, function (d) { return d.open; });
    pickers.textContent = '';
    base.pickers.forEach(function (q, qi) {
      var groups = [el('div', { class: 'group' })];
      q.options.forEach(function (o, oi) {
        if (o === null) { groups.push(el('div', { class: 'group' })); return; }
        addField(groups[groups.length - 1], {
          label: o[0], section: q.label, kind: 'dollar',
          get: function (F) { return F.pickers[qi].options[oi][1]; },
          set: function (F, v) { F.pickers[qi].options[oi][1] = v; },
        });
      });
      var summary = el('summary', {}, [el('span', { class: 'q-label', text: q.label }), el('span', { class: 'count', id: 'changed-' + qi })]);
      var card = el('details', { class: 'card' }, [summary, el('div', { class: 'options' }, groups)]);
      card.open = !!wasOpen[qi];
      pickers.appendChild(card);
    });

    var numbers = $('numbers');
    numbers.querySelectorAll('.price').forEach(function (n) { n.remove(); });
    base.numbers.forEach(function (q, ni) {
      addField(numbers, {
        label: q.label + ' (per unit)', kind: 'dollar',
        get: function (F) { return F.numbers[ni].rate; },
        set: function (F, v) { F.numbers[ni].rate = v; },
      });
    });

    var calc = $('calc');
    calc.querySelectorAll('.price').forEach(function (n) { n.remove(); });
    addField(calc, {
      label: 'PAR % of RETAIL', kind: 'percent',
      get: function (F) { return F.calc.parRate; }, set: function (F, v) { F.calc.parRate = v; },
    });
    addField(calc, {
      label: 'Admin fee added to PAR', kind: 'dollar',
      get: function (F) { return F.calc.adminFee; },
      set: function (F, v) {
        F.calc.adminFee = v;
        // Keep the "*Includes $500 admin fee" note under PAR in step with the fee.
        F.results.par.sub = base.results.par.sub.replace(/\$[\d,]+(\.\d+)?/, '$' + Number(v).toLocaleString('en-US'));
      },
    });
    addField(calc, {
      label: 'COST % of RETAIL', kind: 'percent',
      get: function (F) { return F.calc.costRate; }, set: function (F, v) { F.calc.costRate = v; },
    });
    refresh();
  }

  function onInput(f) {
    var raw = f.input.value.trim();
    var msg = '';
    if (f.kind === 'text') {
      if (!raw) msg = 'Enter a name';
      else f.set(edit, raw);
    } else {
      var v = Number(raw);
      if (raw === '' || isNaN(v)) msg = 'Enter a number';
      else if (v < 0) msg = 'Cannot be negative';
      else f.set(edit, f.kind === 'percent' ? Number((v / 100).toPrecision(12)) : v);
    }
    f.bad = !!msg;
    f.error.textContent = msg;
    f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    refresh();
  }

  function changes() {
    return fields.filter(function (f) { return !f.bad && f.get(edit) !== f.get(base); });
  }

  function refresh() {
    var changed = changes();
    fields.forEach(function (f) {
      var isChanged = changed.indexOf(f) !== -1;
      f.input.classList.toggle('changed', isChanged);
      f.was.textContent = isChanged && f.kind !== 'text' ? 'was ' + show(f, f.get(base)) : '';
    });
    base.pickers.forEach(function (q, qi) {
      var n = changed.filter(function (f) { return f.section === q.label; }).length;
      $('changed-' + qi).textContent = n ? n + ' changed' : '';
    });
    var bad = fields.some(function (f) { return f.bad; });
    $('change-count').textContent = bad ? 'Fix the field marked in red'
      : changed.length ? changed.length + (changed.length === 1 ? ' change' : ' changes') : 'No changes';
    $('review-btn').disabled = bad || !changed.length;
    if (bad || !changed.length) $('review').hidden = true;
    else if (!$('review').hidden) renderReview();
  }

  function describe(f) {
    return (f.section ? f.section + ': ' : '') + f.label + ': ' + show(f, f.get(base)) + ' → ' + show(f, f.get(edit));
  }

  function renderReview() {
    var list = $('change-list');
    list.textContent = '';
    changes().forEach(function (f) { list.appendChild(el('li', { text: describe(f) })); });
  }

  $('review-btn').addEventListener('click', function () {
    renderReview();
    setStatus($('save-status'), '');
    $('review').hidden = false;
    $('review').scrollIntoView({ behavior: 'smooth' });
  });

  $('undo-btn').addEventListener('click', function () {
    edit = clone(base);
    build();
    $('review').hidden = true;
  });

  // ---- Saving ----

  function newFile() {
    var text = W.renderFormData(edit);
    // Re-read what was written, so a save can never publish a file the form cannot load.
    var check = W.loadFormData(text);
    if (JSON.stringify(check.form) !== JSON.stringify(edit)) throw new Error('the new price file did not read back the same');
    check.calc(0, {});
    return text;
  }

  $('download-btn').addEventListener('click', function () {
    var blob = new Blob([newFile()], { type: 'text/javascript' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'form-data.js' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus($('save-status'), 'Downloaded. Upload it to the repository in place of form-data.js to publish it.', 'ok');
  });

  $('save-btn').addEventListener('click', function () {
    var status = $('save-status');
    if (!token()) {
      $('access').open = true;
      $('access').scrollIntoView({ behavior: 'smooth' });
      setStatus(status, 'Paste a GitHub token under "GitHub access" first, or download the file instead.', 'bad');
      return;
    }
    var list = changes();
    var text;
    try { text = newFile(); } catch (e) { setStatus(status, 'Could not build the price file: ' + e.message + '.', 'bad'); return; }
    var btn = $('save-btn');
    btn.disabled = true;
    setStatus(status, 'Saving…');
    fetchRemote()
      .then(function (remote) {
        // Someone else saved since this page loaded: don't overwrite their prices.
        if (W.renderFormData(W.loadFormData(remote.text).form) !== W.renderFormData(base)) {
          throw new Error('The prices were changed somewhere else since this page loaded. Reload the page and make your changes again');
        }
        var summary = list.length === 1 ? describe(list[0]) : 'Update ' + list.length + ' prices';
        var message = 'Admin: ' + summary + '\n\n' + list.map(function (f) { return '- ' + describe(f); }).join('\n');
        return fetch(API, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers()),
          body: JSON.stringify({ message: message, content: encode(text), sha: remote.sha, branch: REPO.branch }),
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            if (!r.ok) throw githubError(r.status, body);
          });
        });
      })
      .then(function () {
        base = clone(edit);
        build();
        setStatus($('load-status'), 'Saved. The public form shows the new prices once GitHub Pages republishes, usually within 10 minutes. A phone that already has the form open may need a refresh.', 'ok');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function (err) {
        setStatus(status, 'Not saved: ' + err.message + '.', 'bad');
      })
      .then(function () { btn.disabled = false; });
  });

  load();
})();
