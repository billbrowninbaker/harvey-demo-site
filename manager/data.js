/* Sample data for the Manager demo (the back office).

   How the business works (from the owners' own listing): leases at the Tenth
   Street Office Complex are FULL SERVICE. Rent includes power, water, sewer,
   garbage and heat; the tenant pays only janitorial, phone and data to their own
   providers. So tenants are billed rent (+ late fees, + the odd extra charge such
   as a key replacement), and the building's utility bills are an OWNER EXPENSE.

   Made up on purpose: every tenant, rent, lease date, utility amount, vendor,
   snow day and inquiry below. Tenant contacts are placeholders ((541) 000-0000,
   example.com). The one real item is the 4,527 sq ft vacancy, taken from the
   owners' public Facebook post, with its rent left as "Call for rate".

   Dates are built relative to the day the demo is first opened, so the
   dashboard always has a "this month". */

window.RCD_MGR_SEED = function (today) {
  "use strict";
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var Y = today.getFullYear(), Mo = today.getMonth(); // 0-based
  function ym(n) { var d = new Date(Y, Mo + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function moy(n) { return new Date(Y, Mo + n, 1).getMonth(); } // 0-11 month of year
  function day(n, d) {
    var last = new Date(Y, Mo + n + 1, 0).getDate();
    var x = new Date(Y, Mo + n, Math.min(d, last));
    return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  }
  function lastDay(n) { return day(n, 31); }
  // seeded dates in the current month never land after today
  function upToToday(n, d) { return n === 0 ? day(0, Math.min(d, today.getDate())) : day(n, d); }

  var PH = "(541) 000-0000";

  var company = {
    name: "Rock Creek Developments, LLC",
    address: "3370 Tenth Street, Suite F, Baker City, OR 97814",
    phone: "(541) 523-9048",
    email: "rockcreekdevelopments@gmail.com"
  };

  var property = {
    id: "tsoc",
    name: "Tenth Street Office Complex",
    city: "Baker City, OR 97814",
    included: "power, water, sewer, garbage, heat",
    tenantPays: "janitorial, phone, data"
  };

  // Suites at the complex. Letters, sizes and rents are SAMPLE except Suite E's 4,527 sq ft.
  var units = [
    { id: "sA", suite: "Suite A", sqft: 3600 },
    { id: "sB", suite: "Suite B", sqft: 1100 },
    { id: "sC", suite: "Suite C", sqft: 900 },
    { id: "sD", suite: "Suite D", sqft: 1600 },
    { id: "sE", suite: "Suite E", sqft: 4527, real: true },
    { id: "sF", suite: "Suite F", sqft: 600, ownerUse: "Rock Creek Developments office (onsite management)" },
    { id: "sG", suite: "Suite G", sqft: 750 },
    { id: "sH", suite: "Suite H", sqft: 650 }
  ];

  function contact(name, slug) { return { name: name, phone: PH, email: slug + "@example.com" }; }

  var tenants = [
    { id: "tn-state", name: "State office (sample)", unit: "sA", rent: 5400, deposit: 5400,
      start: "2019-07-01", end: lastDay(14), pay: { method: "ACH", day: 1, ref: "State EFT (sample)" },
      contact: contact("Office manager (sample)", "state-office"), note: "Government tenant; pays by ACH (sample)." },
    { id: "tn-valley", name: "Sample Tenant: Valley Insurance Agency", unit: "sB", rent: 1650, deposit: 1650,
      start: day(-34, 1), end: lastDay(2), pay: { method: "Check", day: 2, ref: "#22" },
      contact: contact("Agency owner (sample)", "valley-insurance") },
    { id: "tn-summit", name: "Sample Tenant: Summit Tax & Bookkeeping", unit: "sC", rent: 1300, deposit: 1300,
      start: day(-19, 1), end: lastDay(5), pay: { method: "Check", day: 4, ref: "#10" },
      contact: contact("Owner (sample)", "summit-tax") },
    { id: "tn-north", name: "Sample Tenant: Northside Physical Therapy", unit: "sD", rent: 2350, deposit: 2350,
      start: day(-16, 1), end: lastDay(20), pay: { method: "Card", day: 1, ref: "Card ending 0000 (sample)" },
      contact: contact("Clinic manager (sample)", "northside-pt") },
    { id: "tn-ridge", name: "Sample Tenant: Ridgeline Land Surveying", unit: "sG", rent: 1100, deposit: 1100,
      start: day(-21, 1), end: lastDay(3), pay: { method: "Check", day: 5, ref: "#5" },
      contact: contact("Owner (sample)", "ridgeline-survey") },
    { id: "tn-bright", name: "Sample Tenant: Bright Path Tutoring", unit: "sH", rent: 950, deposit: 950,
      start: day(-15, 1), end: lastDay(9), pay: { method: "Cash", day: 3, ref: "" },
      contact: contact("Director (sample)", "bright-path") }
  ];

  // Invoice history: every month for the last year is paid on the tenant's usual day, except these.
  var payExceptions = [
    { m: -7, t: "tn-ridge", late: true, d: 15 },
    { m: -2, t: "tn-ridge", late: true, d: 14 },
    { m: -1, t: "tn-bright", unpaid: true, late: true },   // still owes last month, late fee applied
    { m: 0, t: "tn-summit", unpaid: true },
    { m: 0, t: "tn-ridge", unpaid: true },
    { m: 0, t: "tn-bright", unpaid: true }
  ].map(function (x) { return { month: ym(x.m), tenant: x.t, late: !!x.late, unpaid: !!x.unpaid, date: x.d ? day(x.m, x.d) : "" }; });
  var extraCharges = [
    { month: ym(-6), tenant: "tn-north", label: "After-hours lockout call", amt: 75 },
    { month: ym(-1), tenant: "tn-valley", label: "Key replacement (2 keys)", amt: 30 }
  ];

  // The building's own bills (owner expense), keyed by the month the service was used.
  // Seasonal sample amounts by month of year (Jan..Dec).
  var S = {
    power:   [2350, 2200, 1950, 1700, 1650, 2050, 2600, 2700, 2250, 1750, 1950, 2300],
    gas:     [1250, 1100, 850, 520, 260, 140, 120, 120, 180, 420, 780, 1150],
    water:   [190, 185, 195, 215, 250, 300, 340, 330, 280, 230, 200, 190],
    sewer:   [255, 255, 255, 260, 265, 270, 275, 275, 270, 265, 260, 255],
    garbage: [165, 165, 165, 165, 165, 172, 172, 172, 172, 172, 172, 172]
  };
  var wobble = [0.97, 1.02, 0.99, 1.04, 0.98, 1.01, 1.03, 0.96, 1.0, 1.02, 0.99, 1.01];
  var utilities = {};
  for (var n = -12; n <= -2; n++) {
    var mi = moy(n), w = wobble[(n + 12) % 12];
    var rec = { power: +(S.power[mi] * w).toFixed(2), gas: +(S.gas[mi] * w).toFixed(2), water: +(S.water[mi] * w).toFixed(2),
      sewer: S.sewer[mi], garbage: S.garbage[mi], paid: day(n + 1, 12), note: "" };
    if (n === -5) { rec.water = +(rec.water * 4.2).toFixed(2); rec.note = "Leak: running toilet in the Suite D restroom (fixed, see maintenance)"; }
    utilities[ym(n)] = rec;
  }
  // last month's bills arrive this month and have not been entered yet

  var vendors = [
    "In-house (onsite management)",
    "Sample Vendor: Valley Plumbing",
    "Sample Vendor: Elkhorn Heating & Air",
    "Sample Vendor: Main Street Electric",
    "Sample Vendor: Blue Sky Roofing & Gutters",
    "Sample Vendor: Plow service"
  ];

  var maintenance = [
    { id: "MR-1038", received: day(-5, 6), unit: "sD", from: "Sample Tenant: Northside Physical Therapy", category: "Plumbing", priority: "High",
      issue: "Restroom toilet runs constantly (water bill jumped)", status: "Done", vendor: vendors[1], scheduled: day(-5, 8), done: day(-5, 8), cost: 185 },
    { id: "MR-1041", received: day(-2, 12), unit: "common", from: "Onsite management (walk-through)", category: "Grounds", priority: "Normal",
      issue: "Clean gutters on the whole building", status: "Done", vendor: vendors[4], scheduled: day(-2, 19), done: day(-2, 19), cost: 320 },
    { id: "MR-1042", received: day(-1, 8), unit: "sD", from: "Sample Tenant: Northside Physical Therapy", category: "Heating / cooling", priority: "High",
      issue: "Treatment rooms not heating; thermostat shows 61 degrees", status: "Done", vendor: vendors[2], scheduled: day(-1, 9), done: day(-1, 9), cost: 385 },
    { id: "MR-1043", received: day(-1, 22), unit: "sE", from: "Onsite management (turnover)", category: "Turnover", priority: "Normal",
      issue: "Suite E: touch-up paint and carpet cleaning before showings", status: "Scheduled", vendor: vendors[0], scheduled: day(0, 18), done: "", cost: 640 },
    { id: "MR-1044", received: upToToday(0, 2), unit: "sB", from: "Sample Tenant: Valley Insurance Agency", category: "Plumbing", priority: "Normal",
      issue: "Restroom faucet drips all day", status: "Scheduled", vendor: vendors[1], scheduled: day(0, 9), done: "", cost: 150 },
    { id: "MR-1045", received: upToToday(0, 3), unit: "common", from: "Sample Tenant: Summit Tax & Bookkeeping", category: "Electrical", priority: "High",
      issue: "Parking lot light by the north entrance is out; lot is dark by 5 pm", status: "New", vendor: "", scheduled: "", done: "", cost: 0 },
    { id: "MR-1046", received: upToToday(0, 5), unit: "sA", from: "State office (sample)", category: "Doors / locks", priority: "Normal",
      issue: "Front door closer slams; needs adjusting", status: "New", vendor: "", scheduled: "", done: "", cost: 0 }
  ];

  // Snow removal log: onsite management plows and shovels; a plow service helps in big storms.
  var snowPerMonth = { 10: 1, 11: 3, 0: 4, 1: 3, 2: 1 }; // Nov..Mar (month of year -> visits)
  var snow = [], sid = 1;
  for (var k = -12; k <= 0; k++) {
    var visits = snowPerMonth[moy(k)] || 0;
    for (var v = 0; v < visits; v++) {
      var dd = 4 + v * 8;
      var date = day(k, dd);
      if (k === 0 && dd > today.getDate()) continue;
      var big = (v === 1 && visits >= 3);
      snow.push({
        id: "SN-" + (sid++), date: date,
        work: big ? "Plow lot, shovel and de-ice walks" : (v % 2 ? "Shovel and de-ice walks" : "Plow lot, shovel walks"),
        who: big ? vendors[5] : vendors[0],
        inches: big ? 9 : (v % 2 ? 2 : 4),
        cost: big ? 225 : (v % 2 ? 35 : 60)
      });
    }
  }

  // Advertising state per vacant unit (ids: "sE" or a sample listing id from ../properties/listings.js)
  var ads = {
    "sE": { published: true, publishedOn: day(-2, 15), posted: { facebook: true, marketplace: false, craigslist: true } },
    "sample-office-a": { published: true, publishedOn: day(-2, 10), posted: { facebook: true, marketplace: true, craigslist: true } },
    "sample-retail": { published: true, publishedOn: day(-1, 3), posted: { facebook: true, marketplace: false, craigslist: true } },
    "sample-apartment": { published: true, publishedOn: day(-1, 15), posted: { facebook: true, marketplace: true, craigslist: true } },
    "sample-pro-building": { published: false, publishedOn: "", posted: { facebook: false, marketplace: false, craigslist: false } }
  };

  var inquiries = [
    { id: "q1", unit: "sE", date: day(-2, 16), source: "Facebook", name: "Sample inquirer: regional nonprofit", note: "Needs room for 12 staff; asked about the rate", status: "Replied" },
    { id: "q2", unit: "sE", date: day(-1, 9), source: "Website", name: "Sample inquirer: medical billing firm", note: "Toured with Bill", status: "Showing set" },
    { id: "q3", unit: "sE", date: day(-1, 27), source: "Craigslist", name: "Sample inquirer: call center", note: "Asked about data cabling", status: "Replied" },
    { id: "q4", unit: "sE", date: upToToday(0, 3), source: "Facebook", name: "Sample inquirer: engineering office", note: "Wants a tour next week", status: "New" },
    { id: "q5", unit: "sample-office-a", date: day(-2, 14), source: "Facebook", name: "Sample inquirer: insurance agent", note: "Toured; comparing other spaces", status: "Showing set" },
    { id: "q6", unit: "sample-office-a", date: day(-1, 2), source: "Marketplace", name: "Sample inquirer: engineer", note: "Asked about a 1-year term", status: "Replied" },
    { id: "q7", unit: "sample-retail", date: day(-1, 5), source: "Website", name: "Sample inquirer: coffee shop", note: "Asked about buildout", status: "Replied" },
    { id: "q8", unit: "sample-retail", date: upToToday(0, 2), source: "Facebook", name: "Sample inquirer: art gallery", note: "Asked about window lettering", status: "New" },
    { id: "q9", unit: "sample-apartment", date: day(-1, 16), source: "Marketplace", name: "Sample inquirer: nurse relocating", note: "Has a cat", status: "Showing set" },
    { id: "q10", unit: "sample-apartment", date: upToToday(0, 4), source: "Craigslist", name: "Sample inquirer: couple", note: "Wants to apply", status: "New" }
  ];

  return {
    v: 2,
    seededFor: ym(0),
    settings: { lateFeePct: 5, lateAfterDay: 10, lateBasis: "rent", jumpPct: 20, adPhone: PH, adEmail: "leasing@example.com" },
    company: company,
    property: property,
    units: units,
    tenants: tenants,
    utilities: utilities,
    invoices: [],          // built by manager.js from the tenants and the history rules below
    seedHistoryMonths: 12, // invoices for this month and the 12 before it
    payExceptions: payExceptions,
    extraCharges: extraCharges,
    vendors: vendors,
    maintenance: maintenance,
    snow: snow,
    ads: ads,
    inquiries: inquiries
  };
};
