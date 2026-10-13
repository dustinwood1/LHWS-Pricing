(function () {
  "use strict";

  var P = window.LHWS_PRICING;
  var CFG = window.LHWS_CONFIG || {};
  var calculate = window.LHWS_calculate;
  var STORAGE_KEY = "lhws-price-app-v1";

  var $ = function (id) { return document.getElementById(id); };
  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var fmt = function (n) { return money.format(n); };
  var displayLabel = function (opt) { return opt.label || opt.value; };

  // ---------- State ----------
  function emptyState() {
    var s = { products: {}, numbers: {} };
    P.products.forEach(function (p) { s.products[p.id] = []; });
    P.numbers.forEach(function (f) { s.numbers[f.id] = ""; });
    return s;
  }

  var state = load() || emptyState();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      var s = emptyState();
      P.products.forEach(function (p) {
        var valid = [];
        p.groups.forEach(function (g) { g.forEach(function (o) { valid.push(o.value); }); });
        (saved.products && saved.products[p.id] || []).forEach(function (v) {
          if (valid.indexOf(v) !== -1) s.products[p.id].push(v);
        });
      });
      P.numbers.forEach(function (f) {
        var v = saved.numbers && saved.numbers[f.id];
        if (typeof v === "string") s.numbers[f.id] = v;
      });
      return s;
    } catch (e) { return null; }
  }

  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        $("savedNote").textContent = isEmpty() ? "" : "Progress saved on this device.";
      } catch (e) { /* storage unavailable: app still works */ }
    }, 250);
  }

  function isEmpty() { return calculate(state).empty; }

  // ---------- Render product sections ----------
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function renderProducts() {
    var host = $("productSections");
    P.products.forEach(function (prod) {
      var sec = document.createElement("section");
      sec.className = "card product-section";
      sec.id = "sec-" + prod.id;

      var fs = document.createElement("fieldset");
      var lg = document.createElement("legend");
      lg.innerHTML = '<span class="q-label"></span><span class="q-count" aria-live="polite"></span>';
      lg.querySelector(".q-label").textContent = prod.label;
      fs.appendChild(lg);

      if (prod.subLabel) {
        var sub = document.createElement("p");
        sub.className = "sub-label";
        sub.textContent = prod.subLabel;
        fs.appendChild(sub);
      }
      var hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Tap to select. You can pick more than one.";
      fs.appendChild(hint);

      prod.groups.forEach(function (group) {
        var grid = document.createElement("div");
        grid.className = "tile-grid";
        group.forEach(function (opt) {
          var id = "opt-" + prod.id + "-" + slug(opt.value);
          var label = document.createElement("label");
          label.className = "tile";
          label.htmlFor = id;
          label.dataset.search = (displayLabel(opt) + " " + prod.label).toLowerCase();

          var cb = document.createElement("input");
          cb.type = "checkbox";
          cb.id = id;
          cb.value = opt.value;
          cb.dataset.product = prod.id;
          cb.checked = state.products[prod.id].indexOf(opt.value) !== -1;

          var check = document.createElement("span");
          check.className = "tile-check";
          check.setAttribute("aria-hidden", "true");

          var name = document.createElement("span");
          name.className = "tile-name";
          name.textContent = displayLabel(opt);

          var price = document.createElement("span");
          price.className = "tile-price";
          price.textContent = fmt(opt.price);

          label.appendChild(cb);
          label.appendChild(check);
          label.appendChild(name);
          label.appendChild(price);
          grid.appendChild(label);
        });
        fs.appendChild(grid);
      });

      sec.appendChild(fs);
      host.appendChild(sec);
    });

    host.addEventListener("change", function (e) {
      var cb = e.target;
      if (cb.type !== "checkbox") return;
      var list = state.products[cb.dataset.product];
      var i = list.indexOf(cb.value);
      if (cb.checked && i === -1) list.push(cb.value);
      if (!cb.checked && i !== -1) list.splice(i, 1);
      update();
    });
  }

  // ---------- Render number fields ----------
  function renderNumbers() {
    var host = $("numberFields");
    P.numbers.forEach(function (f) {
      var wrap = document.createElement("div");
      wrap.className = "num-field";
      wrap.id = "field-" + f.id;
      var inputId = "num-" + f.id;
      wrap.innerHTML =
        '<label class="q-label" for="' + inputId + '"></label>' +
        '<p class="sub-label" id="' + inputId + '-sub"></p>' +
        '<div class="stepper">' +
          '<button type="button" class="step-btn" data-step="-1" aria-label="Decrease">−</button>' +
          '<input type="number" inputmode="decimal" step="any" placeholder="ex: 23" id="' + inputId + '" ' +
            'min="' + f.min + '" max="' + f.max + '" aria-describedby="' + inputId + '-sub ' + inputId + '-calc ' + inputId + '-err">' +
          '<button type="button" class="step-btn" data-step="1" aria-label="Increase">+</button>' +
        '</div>' +
        '<p class="line-calc" id="' + inputId + '-calc"></p>' +
        '<p class="field-error" id="' + inputId + '-err" hidden></p>';
      wrap.querySelector("label").textContent = f.label.trim();
      wrap.querySelector(".sub-label").textContent = f.subLabel;

      var input = wrap.querySelector("input");
      input.value = state.numbers[f.id];

      input.addEventListener("input", function () {
        state.numbers[f.id] = input.value;
        validateNumber(f, false);
        update();
      });
      input.addEventListener("blur", function () { validateNumber(f, true); });

      wrap.querySelectorAll(".step-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          var cur = parseFloat(input.value);
          if (!isFinite(cur)) cur = 0;
          var next = Math.min(f.max, Math.max(f.min, Math.round(cur) + Number(b.dataset.step)));
          input.value = String(next);
          state.numbers[f.id] = input.value;
          validateNumber(f, true);
          update();
        });
      });

      // "*2x amount trenching" helper
      if (f.id === "additionalMaterial") {
        var helper = document.createElement("button");
        helper.type = "button";
        helper.className = "btn btn-ghost btn-small helper";
        helper.id = "fill2x";
        helper.textContent = "Use 2× trenching";
        helper.addEventListener("click", function () {
          var t = parseFloat(state.numbers.trenching);
          if (!isFinite(t)) { $("num-trenching").focus(); toast("Enter trenching footage first."); return; }
          input.value = String(Math.round(t * 2 * 100) / 100);
          state.numbers[f.id] = input.value;
          validateNumber(f, true);
          update();
        });
        wrap.querySelector(".stepper").after(helper);
      }

      host.appendChild(wrap);
    });
  }

  // Returns an error message, or "" when valid.
  function numberError(f) {
    var input = $("num-" + f.id);
    var raw = input.value;
    if (raw === "") {
      // A non-number typed into a number input reads back as "".
      if (input.validity && input.validity.badInput) return "Please enter a number, like 23 or 12.5.";
      return "";
    }
    var n = parseFloat(raw);
    if (!isFinite(n)) return "Please enter a number, like 23 or 12.5.";
    if (n < f.min) return "Can't be less than " + f.min + ".";
    if (n > f.max) return "Can't be more than " + f.max + ".";
    return "";
  }

  function validateNumber(f, show) {
    var msg = numberError(f);
    var input = $("num-" + f.id);
    var err = $("num-" + f.id + "-err");
    if (msg && show) {
      err.textContent = msg;
      err.hidden = false;
      input.setAttribute("aria-invalid", "true");
    } else if (!msg) {
      err.hidden = true;
      err.textContent = "";
      input.removeAttribute("aria-invalid");
    }
    return !msg;
  }

  function validateAll() {
    var firstBad = null;
    P.numbers.forEach(function (f) {
      if (!validateNumber(f, true) && !firstBad) firstBad = f;
    });
    return firstBad;
  }

  // ---------- Update totals ----------
  function update() {
    var r = calculate(state);

    $("out-retail").textContent = fmt(r.retail);
    $("out-par").textContent = fmt(r.par);
    $("out-cost").textContent = fmt(r.cost);
    $("bar-retail").textContent = fmt(r.retail);
    $("bar-par").textContent = fmt(r.par);
    $("bar-cost").textContent = fmt(r.cost);

    // Per-section counts and nav badges
    P.products.forEach(function (p) {
      var n = state.products[p.id].length;
      var subtotal = 0;
      p.groups.forEach(function (g) { g.forEach(function (o) {
        if (state.products[p.id].indexOf(o.value) !== -1) subtotal += o.price;
      }); });
      var c = document.querySelector("#sec-" + p.id + " .q-count");
      c.textContent = n ? n + " selected · " + fmt(subtotal) : "";
      var chip = document.querySelector('[data-target="sec-' + p.id + '"] .chip-badge');
      if (chip) { chip.textContent = n || ""; chip.hidden = !n; }
    });
    var laborCount = 0;
    P.numbers.forEach(function (f) {
      var q = parseFloat(state.numbers[f.id]);
      var calc = $("num-" + f.id + "-calc");
      if (isFinite(q)) {
        if (q) laborCount++;
        calc.textContent = q + " " + f.unit + " × $" + f.rate + " = " + fmt(q * f.rate);
      } else {
        calc.textContent = "$" + f.rate + " per " + f.unit;
      }
    });
    var laborChip = document.querySelector('[data-target="sec-labor"] .chip-badge');
    if (laborChip) { laborChip.textContent = laborCount || ""; laborChip.hidden = !laborCount; }

    $("breakdown").innerHTML = "";
    $("breakdown").appendChild(buildBreakdown(r));
    save();
  }

  function buildBreakdown(r) {
    var frag = document.createDocumentFragment();
    if (!r.lines.length) {
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Nothing selected yet.";
      frag.appendChild(p);
      return frag;
    }
    var table = document.createElement("table");
    table.className = "breakdown-table";
    var tbody = document.createElement("tbody");
    var lastSection = null;
    r.lines.forEach(function (l) {
      if (l.section !== lastSection) {
        var hr = document.createElement("tr");
        hr.className = "bd-section";
        var th = document.createElement("th");
        th.colSpan = 2;
        th.scope = "rowgroup";
        th.textContent = l.section;
        hr.appendChild(th);
        tbody.appendChild(hr);
        lastSection = l.section;
      }
      var tr = document.createElement("tr");
      var a = document.createElement("td");
      a.textContent = l.label;
      var b = document.createElement("td");
      b.className = "num";
      b.textContent = fmt(l.amount);
      tr.appendChild(a); tr.appendChild(b);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    frag.appendChild(table);
    return frag;
  }

  function buildTotals(r) {
    var dl = document.createElement("dl");
    dl.className = "result-list compact";
    [["retail", r.retail], ["par", r.par], ["cost", r.cost]].forEach(function (pair) {
      var meta = P.results[pair[0]];
      var row = document.createElement("div");
      row.className = "result" + (pair[0] === "retail" ? " result-main" : "");
      var dt = document.createElement("dt");
      dt.textContent = meta.label;
      if (meta.subLabel) {
        var sm = document.createElement("small");
        sm.textContent = meta.subLabel.trim();
        dt.appendChild(sm);
      }
      var dd = document.createElement("dd");
      dd.textContent = fmt(pair[1]);
      row.appendChild(dt); row.appendChild(dd);
      dl.appendChild(row);
    });
    return dl;
  }

  // ---------- Section nav ----------
  function renderNav() {
    var nav = $("sectionNav");
    var items = P.products.map(function (p) { return { id: "sec-" + p.id, label: p.label }; });
    items.push({ id: "sec-labor", label: "Trenching & Labor" });
    items.push({ id: "results", label: "Totals" });
    items.forEach(function (it) {
      var a = document.createElement("a");
      a.href = "#" + it.id;
      a.className = "chip";
      a.dataset.target = it.id;
      a.innerHTML = '<span></span><span class="chip-badge" hidden></span>';
      a.firstChild.textContent = it.label;
      nav.appendChild(a);
    });
  }

  // ---------- Search filter ----------
  function setupSearch() {
    var input = $("search");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      document.querySelectorAll(".product-section").forEach(function (sec) {
        var visible = 0;
        sec.querySelectorAll(".tile").forEach(function (t) {
          var show = !q || t.dataset.search.indexOf(q) !== -1;
          t.hidden = !show;
          if (show) visible++;
        });
        sec.querySelectorAll(".tile-grid").forEach(function (g) {
          g.hidden = !g.querySelector(".tile:not([hidden])");
        });
        sec.hidden = visible === 0;
      });
    });
  }

  // ---------- Review / submit ----------
  function openReview() {
    var bad = validateAll();
    if (bad) {
      var el = $("num-" + bad.id);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
      toast("Please fix the highlighted field.");
      return;
    }
    var r = calculate(state);
    if (r.empty) { toast("Select at least one item or enter a number first."); return; }

    var content = $("reviewContent");
    content.innerHTML = "";
    content.appendChild(buildBreakdown(r));
    content.appendChild(buildTotals(r));
    $("submitError").hidden = true;
    showDialog($("reviewDialog"));
  }

  function buildPayload(r) {
    var data = {
      access_key: CFG.web3formsAccessKey,
      subject: (CFG.emailSubject || "LHWS Price Quote").replace("{retail}", fmt(r.retail)),
      from_name: CFG.emailFromName || "LHWS Price App",
      botcheck: ""
    };
    P.products.forEach(function (p) {
      var chosen = [];
      p.groups.forEach(function (g) { g.forEach(function (o) {
        if (state.products[p.id].indexOf(o.value) !== -1) chosen.push(displayLabel(o) + " (" + fmt(o.price) + ")");
      }); });
      data[p.label] = chosen.length ? chosen.join("\n") : "—";
    });
    data["Extra Charges"] = "No";
    P.numbers.forEach(function (f) {
      data[f.label.trim() + " (" + f.subLabel + ")"] = state.numbers[f.id] === "" ? "—" : state.numbers[f.id];
    });
    data[P.results.retail.label] = fmt(r.retail);
    data[P.results.par.label] = fmt(r.par);
    data[P.results.cost.label] = fmt(r.cost);
    data["Submitted"] = new Date().toLocaleString("en-US");
    return data;
  }

  function submit() {
    var btn = $("submitBtn");
    var errEl = $("submitError");
    errEl.hidden = true;

    if (!CFG.web3formsAccessKey || CFG.web3formsAccessKey.indexOf("YOUR_") === 0) {
      errEl.textContent = "Email isn't set up yet: add your Web3Forms access key in js/config.js.";
      errEl.hidden = false;
      return;
    }
    if (!navigator.onLine) {
      errEl.textContent = "You're offline. Your answers are saved; try again when you have signal.";
      errEl.hidden = false;
      return;
    }

    var r = calculate(state);
    btn.disabled = true;
    btn.textContent = "Please wait...";

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(buildPayload(r))
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.body.success) throw new Error(res.body && res.body.message || "Submission failed");
        closeDialog($("reviewDialog"));
        $("doneText").textContent = "Quote for " + fmt(r.retail) + " retail was emailed. The form has been cleared for the next quote.";
        clearForm();
        showDialog($("doneDialog"));
      })
      .catch(function (e) {
        errEl.textContent = "Couldn't send: " + e.message + ". Your answers are still here; please try again.";
        errEl.hidden = false;
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Submit";
      });
  }

  // ---------- Clear ----------
  function clearForm() {
    state = emptyState();
    document.querySelectorAll('#productSections input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    P.numbers.forEach(function (f) { $("num-" + f.id).value = ""; validateNumber(f, false); });
    $("search").value = "";
    $("search").dispatchEvent(new Event("input"));
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    update();
    $("savedNote").textContent = "";
  }

  function confirmClear() {
    if (isEmpty()) { clearForm(); return; }
    if (window.confirm("Are you sure you want to clear the form")) {
      clearForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast("Form cleared.");
    }
  }

  // ---------- Dialog helpers ----------
  function showDialog(d) {
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }
  function closeDialog(d) {
    if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
  }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- iOS "Add to Home Screen" tip (replaces the JotForm widget) ----------
  function setupInstallTip() {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var standalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
    var dismissed = false;
    try { dismissed = localStorage.getItem("lhws-install-tip") === "1"; } catch (e) {}
    if (isIOS && !standalone && !dismissed) $("installTip").hidden = false;
    $("installTipClose").addEventListener("click", function () {
      $("installTip").hidden = true;
      try { localStorage.setItem("lhws-install-tip", "1"); } catch (e) {}
    });
  }

  // ---------- Wire up ----------
  renderNav();
  renderProducts();
  renderNumbers();
  setupSearch();
  setupInstallTip();
  update();
  if (!isEmpty()) $("savedNote").textContent = "Restored your saved progress.";

  $("priceForm").addEventListener("submit", function (e) { e.preventDefault(); });
  $("reviewBtn").addEventListener("click", openReview);
  $("reviewBarBtn").addEventListener("click", openReview);
  $("totalsToggle").addEventListener("click", function () {
    $("breakdownDetails").open = true;
    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
    $("results").focus({ preventScroll: true });
  });
  $("clearBtn").addEventListener("click", confirmClear);
  $("clearTop").addEventListener("click", confirmClear);
  $("reviewClose").addEventListener("click", function () { closeDialog($("reviewDialog")); });
  $("reviewBack").addEventListener("click", function () { closeDialog($("reviewDialog")); });
  $("submitBtn").addEventListener("click", submit);
  $("doneOk").addEventListener("click", function () {
    closeDialog($("doneDialog"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
