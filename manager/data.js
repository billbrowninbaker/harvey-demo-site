/* Sample data for the Manager demo.

   Leases at the Tenth Street Office Complex are full service: rent includes
   power, water, sewer, garbage and heat, so the only money coming in is rent.

   Made up on purpose: every tenant, rent, lease date and repair below. The one
   real item is Suite E's 4,527 sq ft vacancy, from the owners' public Facebook
   post. Dates are built from the day the demo is first opened, so "this month"
   always has something to show. */

window.RCD_MGR_SEED = function (today) {
  "use strict";
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var Y = today.getFullYear(), M = today.getMonth();
  function month(n) { var d = new Date(Y, M + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function day(n, d) {
    var last = new Date(Y, M + n + 1, 0).getDate();
    var x = new Date(Y, M + n, Math.min(d, last));
    return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
  }
  function soon(d) { return day(0, Math.min(d, today.getDate())); } // this month, never after today

  var suites = [
    { id: "sA", suite: "Suite A", sqft: 3600, tenant: "State office (sample)", phone: "(541) 000-0000", rent: 5400, leaseEnd: day(14, 31) },
    { id: "sB", suite: "Suite B", sqft: 1100, tenant: "Sample: Valley Insurance Agency", phone: "(541) 000-0000", rent: 1650, leaseEnd: day(2, 31) },
    { id: "sC", suite: "Suite C", sqft: 900, tenant: "Sample: Summit Tax & Bookkeeping", phone: "(541) 000-0000", rent: 1300, leaseEnd: day(5, 31) },
    { id: "sD", suite: "Suite D", sqft: 1600, tenant: "Sample: Northside Physical Therapy", phone: "(541) 000-0000", rent: 2350, leaseEnd: day(20, 31) },
    { id: "sE", suite: "Suite E", sqft: 4527, tenant: "", phone: "", rent: 0, leaseEnd: "" },
    { id: "sF", suite: "Suite F", sqft: 600, tenant: "Rock Creek Developments office", phone: "", rent: 0, leaseEnd: "", owner: true },
    { id: "sG", suite: "Suite G", sqft: 750, tenant: "Sample: Ridgeline Land Surveying", phone: "(541) 000-0000", rent: 1100, leaseEnd: day(3, 31) },
    { id: "sH", suite: "Suite H", sqft: 650, tenant: "Sample: Bright Path Tutoring", phone: "(541) 000-0000", rent: 950, leaseEnd: day(9, 31) }
  ];

  // paid[month][suiteId] = date paid. Last month: everyone but Bright Path.
  var paid = {};
  paid[month(-1)] = { sA: day(-1, 1), sB: day(-1, 2), sC: day(-1, 4), sD: day(-1, 1), sG: day(-1, 14) };
  paid[month(0)] = { sA: soon(1), sB: soon(2), sD: soon(1) };

  var todo = [
    { id: 1, text: "Parking lot light by the north entrance is out", suite: "", added: soon(3), done: "" },
    { id: 2, text: "Front door closer slams; needs adjusting", suite: "sA", added: soon(5), done: "" },
    { id: 3, text: "Restroom faucet drips", suite: "sB", added: soon(2), done: "" },
    { id: 4, text: "Paint touch-up and carpet cleaning before showings", suite: "sE", added: day(-1, 22), done: "" },
    { id: 5, text: "Treatment rooms not heating; called heating contractor", suite: "sD", added: day(-1, 8), done: day(-1, 9) }
  ];

  return { v: 3, suites: suites, paid: paid, todo: todo, nextId: 6 };
};
