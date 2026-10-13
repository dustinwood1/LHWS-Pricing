// Price list and formulas, copied exactly from the JotForm
// "LHWS PRICE APP - 01.01.2026" (form 253025919276159).
// Each list is split into groups where the original had "—" separators.
// `value` is what the original submitted; `label` is what it displayed.

window.LHWS_PRICING = {
  title: "LHWS PRICE APP - 01.01.2026",

  products: [
    {
      id: "waterFilters",
      label: "Water Filters",
      subLabel: "Flex hoses included",
      groups: [
        [
          { value: "Drill-M (Multiple Holes)", price: 222 },
          { value: "Galvanized Transition", price: 222 },
          { value: "Power Extension (Outlet < 5Ft / 15Ft Max)", price: 25 }
        ],
        [
          { value: "STO Combo 1.0", price: 6086 },
          { value: "STO Combo 1.5", price: 6703 },
          { value: "STO Combo 2.0", price: 7718 }
        ],
        [
          { value: "CTO Combo 1.0", price: 7142 },
          { value: "CTO Combo 1.5", price: 8019 }
        ],
        [
          { value: "Softener  1.0", label: "Softener 1.0", price: 4059 },
          { value: "Softener 1.5", price: 4307 },
          { value: "Softener 2.0", price: 4827 }
        ],
        [
          { value: "Conditioner 1.0", price: 4748 },
          { value: "Conditioner 1.5", price: 5185 }
        ],
        [
          { value: "Catalytic Carbon 1.0", price: 3530 },
          { value: "Catalytic Carbon 1.5", price: 3901 },
          { value: "Catalytic Carbon 2.0", price: 4345 }
        ],
        [
          { value: "IMF (Iron, Manganese and Hydrogen Sulfide)", price: 5122 },
          { value: "IRT (Iron, Hardness, Mang. & Tannin)", price: 10225 }
        ],
        [
          { value: "SIM 1.0", price: 5658 },
          { value: "SIM 1.5", price: 6302 }
        ],
        [
          { value: "SIMTO 1.0", price: 7225 },
          { value: "SIMTO 1.5", price: 8195 }
        ],
        [{ value: "H2S Booster", price: 5179 }],
        [{ value: "Neutralizing Filter", price: 3406 }]
      ]
    },
    {
      id: "ultravioletSystems",
      label: "Ultraviolet Systems",
      subLabel: "6\" Flex included",
      groups: [
        [
          { value: "UV Rack System (8 GPM)", price: 2776 },
          { value: "UV Rack System (15 GPM)", price: 3337 }
        ]
      ]
    },
    {
      id: "reverseOsmosis",
      label: "Reverse Osmosis Systems",
      subLabel: "",
      groups: [
        [
          { value: "(LWTRO) Tankless RO", price: 2018 },
          { value: "Digital Faucet", price: 195 }
        ],
        [
          { value: "(LWRO) Reverse Osmosis System", price: 1482 },
          { value: "(LWUF) Ultrafiltration System", price: 1174 }
        ],
        [
          { value: "Faucet - Chrome", price: 153 },
          { value: "Faucet - Brushed Nickel", price: 175 },
          { value: "Faucet - Black", price: 206 },
          { value: "Faucet - Oil Rubbed Bronze", price: 250 }
        ],
        [
          { value: "DRILLRO - Drilling through Countertop", price: 330 },
          { value: "Remineralization Cartridge", price: 73 },
          { value: "Fridge Hookup", price: 162 },
          { value: "RO Delivery Pump", price: 535 }
        ]
      ]
    },
    {
      id: "outdoorCovers",
      label: "Outdoor Covers",
      subLabel: "",
      groups: [
        [
          { value: "BYPASS", price: 378 },
          { value: "UV", price: 337 },
          { value: "STO", price: 544 },
          { value: "CTO", price: 433 },
          { value: "LWS", price: 489 },
          { value: "LWC / TOC", price: 371 },
          { value: "IMF", price: 446 }
        ]
      ]
    }
  ],

  // Number fields. `rate` is the multiplier from the RETAIL formula.
  // Original limits: min 0, max 200, decimals allowed.
  numbers: [
    { id: "trenching", label: "Trenching", subLabel: "Total Footage", rate: 14, unit: "ft", min: 0, max: 200 },
    { id: "additionalMaterial", label: "Additional Material per Foot", subLabel: "*2x amount trenching", rate: 5, unit: "ft", min: 0, max: 200 },
    { id: "extraLabor", label: "Extra Labor ", subLabel: "*2 hours for haul away of existing system", rate: 103, unit: "hr", min: 0, max: 200 }
  ],

  results: {
    retail: { label: "RETAIL", subLabel: "" },
    par: { label: "PAR (8% commissionable)", subLabel: "*Includes $500 admin fee " },
    cost: { label: "COST", subLabel: "*Account for CC/Finance fees" }
  }
};

// Original JotForm equations (2 decimal places):
//   RETAIL = [{47}+{45}+{46}+{59}+{40}*14+{74}*103+{81}*5]
//   PAR    = [{10}*.65+500]
//   COST   = [{10}*.50]
// JotForm shows 0 for every result until something is entered, so we do too.
window.LHWS_calculate = function (state) {
  var P = window.LHWS_PRICING;
  var round2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  var lines = [];
  var sum = 0;
  P.products.forEach(function (prod) {
    var chosen = state.products[prod.id] || [];
    prod.groups.forEach(function (group) {
      group.forEach(function (opt) {
        if (chosen.indexOf(opt.value) !== -1) {
          sum += opt.price;
          lines.push({ section: prod.label, label: opt.label || opt.value, amount: opt.price });
        }
      });
    });
  });

  var anyNumber = false;
  P.numbers.forEach(function (f) {
    var raw = state.numbers[f.id];
    if (raw !== undefined && raw !== "") anyNumber = true;
    var q = num(raw);
    if (q !== 0) {
      var amt = q * f.rate;
      sum += amt;
      lines.push({ section: f.label.trim(), label: q + " " + f.unit + " × $" + f.rate, amount: amt, qty: q });
    }
  });

  var empty = lines.length === 0 && !anyNumber;
  var retail = round2(sum);
  return {
    lines: lines,
    empty: empty,
    retail: retail,
    par: empty ? 0 : round2(retail * 0.65 + 500),
    cost: empty ? 0 : round2(retail * 0.5)
  };
};
