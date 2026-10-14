// Writes form-data.js back out from an edited copy of window.LHWS_FORM. The admin page uses it
// to save new prices; `node tools/check-form-data.js` checks it reproduces form-data.js exactly.

(function (root) {
  function str(s) {
    return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  function num(n) {
    return String(Number(n));
  }

  function renderFormData(F) {
    var c = F.calc;
    var L = [];
    L.push(
      '// Questions, options and prices copied from the JotForm "LHWS PRICE APP - 01.01.2026"',
      '// (https://form.jotform.com/253025919276159). Each option is [label, price];',
      '// null is one of the "—" separators the original uses to group options.',
      '// `value` is set only where JotForm submits a different string than it shows.',
      '// Prices can be changed on admin.html, which rewrites this file (see form-data-writer.js).',
      '',
      'window.LHWS_FORM = {',
      '  title: ' + str(F.title) + ',',
      '',
      '  // Multi-select questions, in the original order. Their prices add straight into RETAIL.',
      '  pickers: ['
    );
    F.pickers.forEach(function (q) {
      L.push(
        '    {',
        '      id: ' + q.id + ', name: ' + str(q.name) + ', label: ' + str(q.label) + ', sub: ' + str(q.sub) + ',',
        '      options: ['
      );
      q.options.forEach(function (o) {
        if (o === null) { L.push('        null,'); return; }
        var parts = [str(o[0]), num(o[1])];
        if (o.length > 2) parts.push(str(o[2]));
        L.push('        [' + parts.join(', ') + '],');
      });
      L.push('      ],', '    },');
    });
    L.push(
      '  ],',
      '',
      '  // Number questions. `rate` is what each unit adds to RETAIL. Limits match the original (0 to 200).',
      '  numbers: ['
    );
    F.numbers.forEach(function (q) {
      L.push('    { id: ' + q.id + ', name: ' + str(q.name) + ', label: ' + str(q.label) +
        ', sub: ' + str(q.sub) + ', rate: ' + num(q.rate) + ' },');
    });
    L.push(
      '  ],',
      '  numberMin: ' + num(F.numberMin) + ',',
      '  numberMax: ' + num(F.numberMax) + ',',
      '',
      '  // Hidden in the original ("always-hidden") but still submitted with its default.',
      '  hidden: [' + F.hidden.map(function (h) {
        return '{ name: ' + str(h.name) + ', label: ' + str(h.label) + ', value: ' + str(h.value) + ' }';
      }).join(', ') + '],',
      '',
      '  results: {'
    );
    ['retail', 'par', 'cost'].forEach(function (k) {
      L.push('    ' + k + ': { label: ' + str(F.results[k].label) + ', sub: ' + str(F.results[k].sub) + ' },');
    });
    L.push(
      '  },',
      '',
      '  // PAR = RETAIL * parRate + adminFee; COST = RETAIL * costRate.',
      '  calc: { parRate: ' + num(c.parRate) + ', adminFee: ' + num(c.adminFee) + ', costRate: ' + num(c.costRate) + ' },',
      '};',
      '',
      '// The three calculations, each rounded to 2 decimal places. With the numbers above:',
      '//   RETAIL = ' + F.pickers.map(function (q) { return '{' + q.id + '}'; }).join('+') +
        F.numbers.map(function (q) { return ' + {' + q.id + '}*' + num(q.rate); }).join(''),
      '//   PAR    = RETAIL*' + num(c.parRate) + ' + ' + num(c.adminFee),
      '//   COST   = RETAIL*' + num(c.costRate),
      'window.LHWS_CALC = function (pickerTotal, numbers) {',
      '  var round2 = function (n) { return Math.round(n * 100) / 100; };',
      '  var F = window.LHWS_FORM;',
      '  var retail = pickerTotal;',
      '  F.numbers.forEach(function (q) { retail += (numbers[q.id] || 0) * q.rate; });',
      '  retail = round2(retail);',
      '  return { retail: retail, par: round2(retail * F.calc.parRate + F.calc.adminFee), cost: round2(retail * F.calc.costRate) };',
      '};',
      ''
    );
    return L.join('\n');
  }

  // Runs a form-data.js source without touching the page and returns its LHWS_FORM and LHWS_CALC.
  function loadFormData(source) {
    var sandbox = {};
    new Function('window', source)(sandbox);
    if (!sandbox.LHWS_FORM || typeof sandbox.LHWS_CALC !== 'function') throw new Error('form-data.js did not define the form');
    return { form: sandbox.LHWS_FORM, calc: sandbox.LHWS_CALC };
  }

  var api = { renderFormData: renderFormData, loadFormData: loadFormData };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LHWS_WRITER = api;
})(this);
