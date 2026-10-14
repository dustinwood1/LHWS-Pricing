(function () {
  var FORM = window.LHWS_FORM;
  var form = document.getElementById('price-form');
  var statusEl = document.getElementById('status');
  var submitBtn = document.getElementById('submit-btn');

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function money(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // The title and the PAR note (which names the admin fee) can be changed on the admin page.
  document.title = FORM.title;
  document.getElementById('title').textContent = FORM.title;
  ['par', 'cost'].forEach(function (k) {
    document.getElementById('sub-' + k).textContent = FORM.results[k].sub;
  });

  // Multi-select questions become tappable checkbox lists, grouped where the original has "—".
  FORM.pickers.forEach(function (q) {
    var groups = [[]];
    q.options.forEach(function (opt, i) {
      if (opt === null) { groups.push([]); return; }
      var input = el('input', {
        type: 'checkbox', name: q.name, id: 'q' + q.id + '_' + i,
        value: opt[2] || opt[0], 'data-price': opt[1],
      });
      groups[groups.length - 1].push(el('label', { class: 'option', for: input.id }, [
        input, el('span', { text: opt[0] }),
      ]));
    });
    var list = el('div', { class: 'options' }, groups.filter(function (g) { return g.length; })
      .map(function (g) { return el('div', { class: 'group' }, g); }));
    var count = el('span', { class: 'count', id: 'count-' + q.id });
    var summary = el('summary', {}, [
      el('span', { class: 'q-label', text: q.label }), count,
    ]);
    var body = [summary];
    if (q.sub) body.push(el('p', { class: 'sub', text: q.sub }));
    body.push(list);
    document.getElementById('pickers').appendChild(el('details', { class: 'card', open: '' }, body));
  });

  FORM.numbers.forEach(function (q) {
    var input = el('input', {
      type: 'number', id: 'input_' + q.id, name: q.name, inputmode: 'decimal', step: 'any',
      min: FORM.numberMin, max: FORM.numberMax, placeholder: 'ex: 23',
      'aria-describedby': 'sub_' + q.id + ' err_' + q.id,
    });
    var minus = el('button', { type: 'button', class: 'step', 'aria-label': 'Decrease ' + q.label, text: '−' });
    var plus = el('button', { type: 'button', class: 'step', 'aria-label': 'Increase ' + q.label, text: '+' });
    minus.addEventListener('click', function () { bump(input, -1); });
    plus.addEventListener('click', function () { bump(input, 1); });
    document.getElementById('numbers').appendChild(el('div', { class: 'card number' }, [
      el('label', { class: 'q-label', for: input.id, text: q.label }),
      el('div', { class: 'stepper' }, [minus, input, plus]),
      el('p', { class: 'sub', id: 'sub_' + q.id, text: q.sub }),
      el('p', { class: 'error', id: 'err_' + q.id }),
    ]));
  });

  function bump(input, delta) {
    var v = parseFloat(input.value) || 0;
    v = Math.min(FORM.numberMax, Math.max(FORM.numberMin, v + delta));
    input.value = v;
    update();
  }

  function numberValues() {
    var values = {};
    FORM.numbers.forEach(function (q) {
      var v = parseFloat(document.getElementById('input_' + q.id).value);
      values[q.id] = isNaN(v) ? 0 : v;
    });
    return values;
  }

  // Same messages the original shows for out-of-range numbers.
  function validate() {
    var firstBad = null;
    FORM.numbers.forEach(function (q) {
      var input = document.getElementById('input_' + q.id);
      var v = parseFloat(input.value);
      var msg = '';
      if (input.value !== '' && isNaN(v)) msg = 'This field can only contain numeric values';
      else if (v < FORM.numberMin) msg = 'Input should not be less than the minimum value: ' + FORM.numberMin;
      else if (v > FORM.numberMax) msg = 'Input should not be greater than the maximum value: ' + FORM.numberMax;
      document.getElementById('err_' + q.id).textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !firstBad) firstBad = input;
    });
    return firstBad;
  }

  function totals() {
    var pickerTotal = 0;
    form.querySelectorAll('input[type=checkbox]:checked').forEach(function (c) {
      pickerTotal += Number(c.getAttribute('data-price'));
    });
    return window.LHWS_CALC(pickerTotal, numberValues());
  }

  function update() {
    var t = totals();
    ['retail', 'par', 'cost'].forEach(function (k) {
      document.getElementById('out-' + k).textContent = money(t[k]);
      document.getElementById('bar-' + k).textContent = money(t[k]);
    });
    FORM.pickers.forEach(function (q) {
      var n = form.querySelectorAll('input[name="' + q.name + '"]:checked').length;
      document.getElementById('count-' + q.id).textContent = n ? n + ' selected' : '';
    });
    validate();
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);

  function buildEmail(config) {
    var t = totals();
    var nums = numberValues();
    var data = { _subject: config.emailSubject, _template: 'table', _captcha: 'false' };
    FORM.pickers.forEach(function (q) {
      var picked = [];
      form.querySelectorAll('input[name="' + q.name + '"]:checked').forEach(function (c) { picked.push(c.value); });
      data[q.label] = picked.join('\n');
    });
    FORM.hidden.forEach(function (h) { data[h.label] = h.value; });
    FORM.numbers.forEach(function (q) {
      var raw = document.getElementById('input_' + q.id).value;
      data[q.label] = raw === '' ? '' : String(nums[q.id]);
    });
    data[FORM.results.retail.label] = money(t.retail);
    data[FORM.results.par.label] = money(t.par);
    data[FORM.results.cost.label] = money(t.cost);
    return data;
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (kind || '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate();
    if (bad) {
      setStatus('There is an error on this page. Please correct it before moving on.', 'bad');
      bad.focus();
      return;
    }
    submitBtn.disabled = true;
    setStatus('Sending…');
    // Read the receiving address fresh on every submit, so a page left open (or cached on a
    // phone) never sends to an address that has since been changed in config.json.
    fetch('config.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('could not load the email settings');
        return r.json();
      })
      .then(function (config) {
        if (!config.submitTo || config.submitTo.indexOf('@example.com') !== -1) {
          throw new Error('the receiving address is not set in config.json');
        }
        return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(config.submitTo), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildEmail(config)),
        });
      })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.body.success) === 'false') throw new Error(res.body.message || 'Send failed');
        form.reset();
        update();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStatus('Submitted. The form has been cleared.', 'ok');
      })
      .catch(function (err) {
        setStatus('Could not send: ' + err.message + '. Your entries are still here; try again.', 'bad');
      })
      .then(function () { submitBtn.disabled = false; });
  });

  update();
})();
