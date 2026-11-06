/* Manager demo: the back office for Rock Creek Developments.
   Plain JS, no build step, hash routing (#dash, #tenants, #billing/2026-11, #invoice/ID, #pay/ID,
   #utilities, #ads/ID, #maint, #reports/2026-11).
   All data is sample data from data.js. Changes are saved in this browser only (localStorage);
   the page still works when storage is blocked. Nothing is emailed, charged or paid. */
(function () {
  "use strict";

  var KEY = "rcd-manager-demo-v2";
  var SKEY = "rcd-manager-demo-session";
  var LISTINGS = Array.isArray(window.RCD_SAMPLE_LISTINGS) ? window.RCD_SAMPLE_LISTINGS : [];
  var PHF = typeof window.RCD_PH === "function" ? window.RCD_PH : function () { return ""; };
  var NOW = new Date();
  var TODAY = iso(NOW);
  var THIS_M = TODAY.slice(0, 7);
  var S = null;
  var storageOk = true;
  var memSignedIn = false;

  /* ---------------- helpers ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseD(s) { var p = String(s).split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +(p[2] || 1)); }
  function addM(ym, n) { var p = ym.split("-"); var d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function lastDayOf(ym) { var p = ym.split("-"); return iso(new Date(+p[0], +p[1], 0)); }
  function monthLong(ym) { return parseD(ym + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
  function monthShort(ym) { return parseD(ym + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }); }
  function monthOnly(ym) { return parseD(ym + "-01").toLocaleDateString("en-US", { month: "long" }); }
  function monAbbr(ym) { return parseD(ym + "-01").toLocaleDateString("en-US", { month: "short" }); }
  function fmtD(s) { return s ? parseD(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""; }
  function daysUntil(s) { return Math.round((parseD(s) - parseD(TODAY)) / 86400000); }
  function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  function r2(n) { return Math.round((+n || 0) * 100) / 100; }
  function money(n) { return USD.format(r2(n)); }
  function money0(n) { return "$" + Math.round(+n || 0).toLocaleString("en-US"); }
  function num(n) { return (+n || 0).toLocaleString("en-US"); }
  function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 + "%" : "—"; }
  function sum(a, f) { return r2(a.reduce(function (t, x) { return t + (f ? f(x) : x); }, 0)); }
  function stripTags(s) { return String(s).replace(/<[^>]*>/g, ""); }
  function monthsBetween(from, to) { var out = []; for (var m = from; m <= to; m = addM(m, 1)) out.push(m); return out; }

  /* ---------------- storage ---------------- */
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; }
    if (raw) {
      try {
        var d = JSON.parse(raw);
        if (d && d.v === 2 && Array.isArray(d.invoices) && Array.isArray(d.tenants)) { S = d; return; }
      } catch (e) { /* bad data: reseed below */ }
    }
    S = seed();
    save();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; } catch (e) { storageOk = false; }
    var w = $("#storeWarn"); if (w) w.hidden = storageOk;
  }
  function isSignedIn() {
    try { return sessionStorage.getItem(SKEY) === "1" || memSignedIn; } catch (e) { return memSignedIn; }
  }
  function setSignedIn(on) {
    memSignedIn = on;
    try { if (on) sessionStorage.setItem(SKEY, "1"); else sessionStorage.removeItem(SKEY); } catch (e) { /* memory only */ }
  }

  /* ---------------- model ---------------- */
  function unitById(id, st) { return (st || S).units.filter(function (u) { return u.id === id; })[0]; }
  function tenantById(id, st) { return (st || S).tenants.filter(function (t) { return t.id === id; })[0]; }
  function invById(id) { return S.invoices.filter(function (i) { return i.id === id; })[0]; }
  function activeIn(t, m) { return t.start <= lastDayOf(m) && t.end >= m + "-01"; }
  function occupant(unitId, date) {
    date = date || TODAY;
    return S.tenants.filter(function (t) { return t.unit === unitId && t.start <= date && t.end >= date; })[0];
  }
  function buildingSqft() { return sum(S.units, function (u) { return u.sqft; }); }

  function total(inv) { return sum(inv.lines, function (l) { return +l.amt || 0; }); }
  function paidAmt(inv) { return sum(inv.payments, function (p) { return +p.amt || 0; }); }
  function balance(inv) { return r2(total(inv) - paidAmt(inv)); }
  function hasLate(inv) { return inv.lines.some(function (l) { return l.kind === "late"; }); }
  function lateDate(inv) { return inv.month + "-" + pad(+S.settings.lateAfterDay || 10); }
  function status(inv) {
    if (inv.status === "Draft") return "Draft";
    if (balance(inv) <= 0.004) return "Paid";
    if (TODAY > lateDate(inv)) return "Overdue";
    return paidAmt(inv) > 0 ? "Partial" : "Sent";
  }
  function pill(st, label) { return '<span class="st ' + esc(String(st).toLowerCase().split(" ")[0]) + '">' + esc(label || st) + "</span>"; }

  function lateLine(st, inv) {
    var s = st.settings;
    var rent = sum(inv.lines.filter(function (l) { return l.kind === "rent"; }), function (l) { return l.amt; });
    var base = s.lateBasis === "balance" ? r2(sum(inv.lines, function (l) { return l.amt; }) - sum(inv.payments, function (p) { return p.amt; })) : rent;
    return { kind: "late", label: "Late fee: " + s.lateFeePct + "% of " + (s.lateBasis === "balance" ? "the unpaid balance" : "rent") + ", unpaid after the " + ordinal(+s.lateAfterDay), amt: r2(base * s.lateFeePct / 100) };
  }
  function rentLine(st, t, m) {
    var u = unitById(t.unit, st);
    return { kind: "rent", label: "Rent, " + monthLong(m) + " — " + (u ? u.suite : "") + " (full service: utilities included)", amt: +t.rent };
  }
  function newInvId(st, m, t) {
    var u = unitById(t.unit, st);
    var base = "RC-" + m.slice(2, 4) + m.slice(5, 7) + "-" + (u ? u.suite.replace(/^Suite\s*/, "") : "X");
    var id = base, n = 2;
    while (st.invoices.some(function (i) { return i.id === id; })) id = base + "-" + (n++);
    return id;
  }
  // Create a Draft invoice for every tenant with an active lease in month m; refresh the rent on existing drafts.
  function generate(st, m) {
    var res = { made: 0, refreshed: 0, kept: 0 };
    st.tenants.forEach(function (t) {
      if (!activeIn(t, m)) return;
      var inv = st.invoices.filter(function (i) { return i.month === m && i.tenant === t.id; })[0];
      if (inv) {
        if (inv.status === "Draft") {
          var k = inv.lines.findIndex(function (l) { return l.kind === "rent"; });
          if (k >= 0) inv.lines[k] = rentLine(st, t, m); else inv.lines.unshift(rentLine(st, t, m));
          res.refreshed++;
        } else res.kept++;
        return;
      }
      st.invoices.push({ id: newInvId(st, m, t), month: m, tenant: t.id, unit: t.unit, status: "Draft", created: TODAY, sentOn: "",
        due: m + "-01", lines: [rentLine(st, t, m)], payments: [] });
      res.made++;
    });
    return res;
  }

  function seed() {
    var d = window.RCD_MGR_SEED(NOW);
    var months = monthsBetween(addM(THIS_M, -d.seedHistoryMonths), THIS_M);
    months.forEach(function (m, k) {
      generate(d, m);
      d.invoices.forEach(function (inv) {
        if (inv.month !== m) return;
        var t = tenantById(inv.tenant, d);
        inv.status = "Sent";
        inv.sentOn = addM(m, -1) + "-25";
        inv.created = inv.sentOn;
        d.extraCharges.forEach(function (x) { if (x.month === m && x.tenant === inv.tenant) inv.lines.push({ kind: "other", label: x.label, amt: x.amt }); });
        var ex = d.payExceptions.filter(function (x) { return x.month === m && x.tenant === inv.tenant; })[0];
        if (ex && ex.late) inv.lines.push(lateLine(d, inv));
        if (ex && ex.unpaid) return;
        var date = ex && ex.date ? ex.date : m + "-" + pad(t.pay.day);
        if (date > TODAY) date = TODAY;
        inv.payments.push({ date: date, method: t.pay.method, amt: total(inv), ref: t.pay.method === "Check" ? t.pay.ref + (100 + k) : t.pay.ref });
      });
    });
    delete d.payExceptions; delete d.extraCharges; delete d.seedHistoryMonths;
    return d;
  }

  /* utilities (owner expense) */
  var UCATS = [["power", "Power"], ["gas", "Gas (heat)"], ["water", "Water"], ["sewer", "Sewer"], ["garbage", "Garbage"]];
  function uTotal(rec) { return rec ? sum(UCATS, function (c) { return +rec[c[0]] || 0; }) : 0; }
  function rentCollectedFor(m) { return sum(S.invoices.filter(function (i) { return i.month === m; }), paidAmt); }
  function latestUtilMonth() { var ks = Object.keys(S.utilities).sort(); return ks[ks.length - 1]; }
  function jumpInfo(m) {
    var rec = S.utilities[m]; if (!rec) return null;
    var prev = [1, 2, 3].map(function (k) { return S.utilities[addM(m, -k)]; });
    if (prev.some(function (p) { return !p; })) return null;
    var avg = sum(prev, uTotal) / 3, tot = uTotal(rec);
    var up = avg ? (tot - avg) / avg * 100 : 0;
    if (up <= (+S.settings.jumpPct || 20)) return null;
    var best = null;
    UCATS.forEach(function (c) {
      var a = sum(prev, function (p) { return +p[c[0]] || 0; }) / 3, delta = (+rec[c[0]] || 0) - a;
      if (!best || delta > best.delta) best = { cat: c[1], delta: delta };
    });
    return { up: Math.round(up), avg: avg, driver: best };
  }
  function utilPaidIn(m) { return sum(Object.keys(S.utilities).filter(function (k) { return (S.utilities[k].paid || "").slice(0, 7) === m; }), function (k) { return uTotal(S.utilities[k]); }); }

  /* income / expenses (cash basis) */
  function incomeFor(m) {
    var r = { rent: 0, late: 0, other: 0 };
    S.invoices.forEach(function (inv) {
      var tot = total(inv); if (!tot) return;
      inv.payments.forEach(function (p) {
        if ((p.date || "").slice(0, 7) !== m) return;
        inv.lines.forEach(function (l) { r[l.kind] = (r[l.kind] || 0) + p.amt * l.amt / tot; });
      });
    });
    r.rent = r2(r.rent); r.late = r2(r.late); r.other = r2(r.other);
    r.total = r2(r.rent + r.late + r.other);
    return r;
  }
  function expensesFor(m) {
    var e = {
      utilities: utilPaidIn(m),
      snow: sum(S.snow.filter(function (x) { return x.date.slice(0, 7) === m; }), function (x) { return +x.cost || 0; }),
      maint: sum(S.maintenance.filter(function (x) { return x.status === "Done" && (x.done || "").slice(0, 7) === m; }), function (x) { return +x.cost || 0; })
    };
    e.total = r2(e.utilities + e.snow + e.maint);
    return e;
  }

  /* vacancies (for advertising) */
  function vacancies() {
    var out = [];
    S.units.forEach(function (u) {
      if (u.ownerUse || occupant(u.id)) return;
      out.push({ id: u.id, group: "tsoc", unit: u, name: u.suite + (u.real ? ": 4,527 sq ft office space" : ": office suite"), sqft: u.sqft, now: true, where: "Tenth Street Office Complex" });
    });
    LISTINGS.forEach(function (l) {
      if (l.status !== "available" && l.status !== "coming") return;
      out.push({ id: l.id, group: "listing", listing: l, name: l.name, sqft: l.sqft, now: l.status === "available", where: l.area, available: l.availableDate });
    });
    return out;
  }
  function adState(id) {
    if (!S.ads[id]) S.ads[id] = { published: false, publishedOn: "", posted: { facebook: false, marketplace: false, craigslist: false } };
    if (!S.ads[id].draft) S.ads[id].draft = {};
    return S.ads[id];
  }
  function photoSrc(src) { return typeof src === "string" && src.indexOf("ph:") === 0 ? PHF(src.slice(3)) : src; }
  function adDefaults(v) {
    var st = S.settings, contact = "Call " + st.adPhone + " or email " + st.adEmail;
    if (v.group === "tsoc") {
      var u = v.unit;
      if (u.real) return {
        headline: "4,527 sq ft office space for lease, Tenth Street Office Complex, Baker City",
        rent: "Call for rate", size: "4,527 sq ft", available: "Available now",
        description: "This 4,527 sq ft office space at the Tenth Street Office Complex is available. We take care of all utilities except janitorial, phone and data. Onsite management takes care of your needs, including snow removal. Call and let Bill show you through the space.",
        features: "Utilities included except janitorial, phone and data\nOnsite management\nSnow removal included\nEstablished neighbors, including a state office\nTour with Bill",
        contact: contact, photo: "../img/work1.jpg"
      };
      return {
        headline: num(u.sqft) + " sq ft office suite for lease, Tenth Street Office Complex, Baker City",
        rent: "Call for rate", size: num(u.sqft) + " sq ft", available: "Available now",
        description: u.suite + " at the Tenth Street Office Complex is available. Full-service lease: we take care of all utilities except janitorial, phone and data, and onsite management handles maintenance and snow removal.",
        features: "Utilities included except janitorial, phone and data\nOnsite management\nSnow removal included",
        contact: contact, photo: "ph:office"
      };
    }
    var l = v.listing;
    return {
      headline: l.name + " for lease: " + num(l.sqft) + " sq ft, " + l.area,
      rent: "$" + num(l.rent) + "/month", size: num(l.sqft) + " sq ft",
      available: l.status === "available" ? "Available now" : "Available " + fmtD(l.availableDate),
      description: l.description,
      features: (l.highlights || []).concat(l.utilities ? ["Utilities: " + l.utilities] : []).join("\n"),
      contact: contact, photo: (l.photos && l.photos[0] && l.photos[0].src) || "ph:office"
    };
  }
  function adDraft(v) {
    var d = adDefaults(v), o = adState(v.id).draft;
    Object.keys(o).forEach(function (k) { if (o[k] != null) d[k] = o[k]; });
    return d;
  }
  function adTexts(d) {
    var feats = String(d.features || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    var facts = [d.size, d.rent, d.available].filter(Boolean).join(" · ");
    return {
      fb: "NOW LEASING: " + d.headline + "\n\n" + d.description + "\n\n" + feats.map(function (f) { return "- " + f; }).join("\n") +
        "\n\n" + facts + "\n" + d.contact + "\nPhotos and details on our website (Properties page).",
      mktTitle: d.headline.length > 99 ? d.headline.slice(0, 98) + "…" : d.headline,
      mktDesc: d.description + "\n\n" + feats.map(function (f) { return "- " + f; }).join("\n") + "\n\n" + d.available + ". " + d.contact,
      clTitle: (/\$/.test(d.rent) ? d.rent.replace(/\/month/, "") + " / " : "") + d.size.replace(/ sq ft/, "ft2") + " - " + d.headline + " (Baker City)",
      clBody: d.description + "\n\n" + feats.map(function (f) { return "* " + f; }).join("\n") + "\n\n" + facts + "\n\n" + d.contact + "\n\nRock Creek Developments, LLC"
    };
  }

  /* ---------------- UI plumbing ---------------- */
  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 4200);
  }
  var dlgHandler = null, dlgReturn = null;
  function openDlg(html, onSubmit) {
    var d = $("#dlg");
    dlgReturn = document.activeElement;
    $("#dlgBody").innerHTML = html;
    dlgHandler = onSubmit || null;
    try { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); } catch (e) { d.setAttribute("open", ""); }
    var f = $("#dlgBody input, #dlgBody select, #dlgBody textarea, #dlgBody button.btn.n, #dlgBody button");
    if (f) f.focus();
  }
  function closeDlg() {
    var d = $("#dlg");
    try { if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); } catch (e) { d.removeAttribute("open"); }
  }
  function onDlgClosed() {
    dlgHandler = null;
    if (dlgReturn && document.body.contains(dlgReturn)) { try { dlgReturn.focus(); } catch (e) { /* ignore */ } }
    else { var h = $("#view h1"); if (h) h.focus({ preventScroll: true }); }
  }
  function dlgFrame(title, inner, okLabel, opts) {
    opts = opts || {};
    return '<form class="dlg-in" data-dlgform novalidate><h2 id="dlgTitle">' + title + "</h2>" + inner +
      '<p class="ferr" id="dlgErr" role="alert"></p><div class="dlg-btns">' +
      (opts.noCancel ? "" : '<button type="button" class="btn o sm" data-act="dlgClose">' + (opts.cancel || "Cancel") + "</button>") +
      (okLabel ? '<button type="submit" class="btn n sm">' + okLabel + "</button>" : "") + "</div></form>";
  }
  function confirmDlg(title, msg, okLabel, fn) {
    openDlg(dlgFrame(title, "<p>" + msg + "</p>", okLabel), function () { fn(); return true; });
  }

  function table(cols, rows, foot, cls) {
    var h = '<table class="rt ' + (cls || "") + '"><thead><tr>' + cols.map(function (c) {
      return '<th scope="col" class="' + (c.c || "") + '">' + c.h + "</th>";
    }).join("") + "</tr></thead><tbody>";
    rows.forEach(function (r) {
      var cells = r.cells || r;
      h += "<tr" + (r.cls ? ' class="' + r.cls + '"' : "") + ">" + cells.map(function (v, i) {
        var c = cols[i] || {};
        return '<td data-label="' + esc(stripTags(c.h || "")) + '" class="' + (c.c || "") + (i === 0 && c.first ? " first" : "") + '">' + (v == null ? "" : v) + "</td>";
      }).join("") + "</tr>";
    });
    h += "</tbody>";
    if (foot) h += "<tfoot><tr>" + foot.map(function (v, i) {
      var c = cols[i] || {};
      return '<td data-label="' + (v === "" || i === 0 ? "" : esc(stripTags(c.h || ""))) + '" class="' + (c.c || "") + '">' + v + "</td>";
    }).join("") + "</tr></tfoot>";
    return h + "</table>";
  }
  function vhead(k, title, sub, actions) {
    return '<div class="vhead"><div><div class="k">' + k + '</div><h1 tabindex="-1">' + title + "</h1>" +
      (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>" + (actions ? '<div class="vact no-print">' + actions + "</div>" : "") + "</div>";
  }
  function stat(lbl, big, body, link, cls) {
    return '<div class="stat ' + (cls || "") + '"><div class="lbl">' + lbl + '</div><div class="big">' + big + "</div>" + (body || "") +
      (link ? '<a class="go" href="' + link[0] + '">' + link[1] + "</a>" : "") + "</div>";
  }
  function monthSelect(id, months, sel, label) {
    return '<span class="inline-sel"><label for="' + id + '">' + (label || "Month") + '</label><select id="' + id + '" data-chg="' + id + '">' +
      months.map(function (m) { return '<option value="' + m + '"' + (m === sel ? " selected" : "") + ">" + monthLong(m) + "</option>"; }).join("") + "</select></span>";
  }
  function logo(size, color) {
    color = color || "#1c2f45";
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="25.5" fill="none" stroke="' + color + '" stroke-width="1.8"/><path d="M9 36 L20 21 L25 27 L32 15 L45 36 Z" fill="' + color + '"/></svg>';
  }

  /* ---------------- views ---------------- */

  function vDash() {
    var m = THIS_M;
    var invs = S.invoices.filter(function (i) { return i.month === m && i.status !== "Draft"; });
    var billed = sum(invs, total), collected = sum(invs, paidAmt);
    var paidN = invs.filter(function (i) { return status(i) === "Paid"; }).length;
    var overdue = S.invoices.filter(function (i) { return status(i) === "Overdue"; });
    var unpaidNow = invs.filter(function (i) { var s = status(i); return s === "Sent" || s === "Partial"; });
    var lastM = addM(THIS_M, -1), lastEntered = !!S.utilities[lastM];
    var lu = latestUtilMonth(), urec = S.utilities[lu], ut = uTotal(urec), jump = lu ? jumpInfo(lu) : null;
    var vac = vacancies(), vacNow = vac.filter(function (v) { return v.now; }).length;
    var advertised = vac.filter(function (v) { return S.ads[v.id] && S.ads[v.id].published; }).length;
    var newInq = S.inquiries.filter(function (q) { return q.status === "New"; }).length;
    var open = S.maintenance.filter(function (x) { return x.status !== "Done"; });
    var newReq = open.filter(function (x) { return x.status === "New"; }).length;
    var season = snowSeason();
    var renew = S.tenants.filter(function (t) { var d = daysUntil(t.end); return d >= 0 && d <= 120; }).sort(function (a, b) { return a.end < b.end ? -1 : 1; });
    var nextM = addM(THIS_M, 1), nextMade = S.invoices.some(function (i) { return i.month === nextM; });
    var w = Math.min(100, billed ? collected / billed * 100 : 0);

    var cards =
      stat("Rent collected · " + monthOnly(m), money0(collected) + " <small>of " + money0(billed) + "</small>",
        '<div class="bar" role="img" aria-label="' + Math.round(w) + '% collected"><i style="width:' + w.toFixed(1) + '%"></i></div><p>' + paidN + " of " + invs.length + " invoices paid in full. " +
        (unpaidNow.length ? unpaidNow.length + " still open; late fees start after the " + ordinal(+S.settings.lateAfterDay) + "." : "") + "</p>", ["#billing/" + m, "Open billing"]) +
      stat("Overdue", overdue.length + " <small>" + (overdue.length === 1 ? "invoice" : "invoices") + "</small>",
        "<p>" + (overdue.length ? money(sum(overdue, balance)) + " past due: " + overdue.map(function (i) { return esc(shortName(tenantById(i.tenant))); }).join(", ") : "Nobody is past due.") + "</p>",
        ["#billing/" + (overdue[0] ? overdue[0].month : m), "See overdue"], overdue.length ? "warn" : "good") +
      stat("Utilities (owner expense)", lu ? money0(ut) + " <small>" + monAbbr(lu) + "</small>" : "—",
        "<p>" + (lu ? "$" + (ut / buildingSqft()).toFixed(3) + " per sq ft · " + pct(ut, rentCollectedFor(lu)) + " of that month's rent collected." : "") +
        (jump ? " <b>Up " + jump.up + "% on the 3-month average.</b>" : "") +
        (lastEntered ? "" : " <b>" + monthOnly(lastM) + " bills not entered yet.</b>") + "</p>", ["#utilities", "Open utilities"], (!lastEntered || jump) ? "warn" : "") +
      stat("Vacancies", vacNow + " <small>open now, " + (vac.length - vacNow) + " coming</small>",
        "<p>" + advertised + " of " + vac.length + " advertised on the website · " + newInq + " new " + (newInq === 1 ? "inquiry" : "inquiries") + ".</p>", ["#ads", "Open advertising"]) +
      stat("Maintenance", open.length + " <small>open</small>",
        "<p>" + newReq + " new, " + (open.length - newReq) + " scheduled. Snow removal this season: " + season.visits + " visits, " + money0(season.cost) + ".</p>", ["#maint", "Open maintenance"], newReq ? "warn" : "") +
      stat("Lease renewals", renew.length + " <small>in the next 120 days</small>",
        "<p>" + (renew.length ? renew.slice(0, 3).map(function (t) { return esc(shortName(t)) + " (" + fmtD(t.end) + ")"; }).join(", ") : "None coming up.") + "</p>", ["#tenants", "Open tenants"]);

    var todo = [];
    overdue.forEach(function (i) {
      var t = tenantById(i.tenant);
      todo.push(['<span class="tx"><b>' + esc(t ? t.name : "") + "</b>: " + monthOnly(i.month) + " invoice " + esc(i.id) + ", " + money(balance(i)) + " past due" + (hasLate(i) ? " (late fee added)" : "") + "</span>",
        '<a class="btn o xs" href="#invoice/' + esc(i.id) + '">View invoice</a><button type="button" class="btn n xs" data-act="markPaid" data-id="' + esc(i.id) + '">Mark paid</button>']);
    });
    if (unpaidNow.length) todo.push(['<span class="tx">' + unpaidNow.length + " " + (unpaidNow.length === 1 ? "tenant hasn't" : "tenants haven't") + " paid " + monthOnly(m) + " rent yet (" + unpaidNow.map(function (i) { return esc(shortName(tenantById(i.tenant))); }).join(", ") + ").</span>", '<a class="btn o xs" href="#billing/' + m + '">Billing</a>']);
    if (!lastEntered) todo.push(['<span class="tx">Enter ' + monthOnly(lastM) + "'s utility bills (power, gas, water, sewer, garbage).</span>", '<a class="btn o xs" href="#utilities/' + lastM + '">Enter bills</a>']);
    if (jump) todo.push(['<span class="tx">' + monthOnly(lu) + " utilities jumped " + jump.up + "% over the 3-month average, mostly " + esc(jump.driver.cat.toLowerCase()) + ".</span>", '<a class="btn o xs" href="#utilities/' + lu + '">Look</a>']);
    if (!nextMade) todo.push(['<span class="tx">' + monthLong(nextM) + " invoices haven't been generated yet.</span>", '<a class="btn o xs" href="#billing/' + nextM + '">Generate</a>']);
    if (newReq) todo.push(['<span class="tx">' + newReq + " new maintenance " + (newReq === 1 ? "request needs" : "requests need") + " a vendor or a date.</span>", '<a class="btn o xs" href="#maint/new">Assign</a>']);
    if (newInq) todo.push(['<span class="tx">' + newInq + " new " + (newInq === 1 ? "inquiry" : "inquiries") + " on vacancy ads to answer.</span>", '<a class="btn o xs" href="#ads">Inquiries</a>']);
    vac.filter(function (v) { return !(S.ads[v.id] && S.ads[v.id].published); }).forEach(function (v) {
      todo.push(['<span class="tx">' + esc(v.name) + " is not advertised yet.</span>", '<a class="btn o xs" href="#ads/' + esc(v.id) + '">Draft an ad</a>']);
    });
    renew.filter(function (t) { return daysUntil(t.end) <= 90; }).forEach(function (t) {
      todo.push(['<span class="tx">Lease ends ' + fmtD(t.end) + ": " + esc(t.name) + " (" + daysUntil(t.end) + " days). Renew or advertise.</span>", '<a class="btn o xs" href="#tenants/' + esc(t.id) + '">Lease</a>']);
    });

    return vhead("Dashboard", "Good day, Bill and Lorrie", "Here's " + monthLong(m) + " at the Tenth Street Office Complex, as of " + fmtD(TODAY) + ". All numbers are sample data.") +
      '<div class="cards3">' + cards + "</div>" +
      '<h2 class="sec">Needs attention</h2>' +
      (todo.length ? '<ul class="todo">' + todo.map(function (x) { return "<li>" + x[0] + '<span class="vact">' + x[1] + "</span></li>"; }).join("") + "</ul>" : '<p class="callout blue">Nothing needs attention. Nice.</p>');
  }
  function shortName(t) { return t ? t.name.replace(/^Sample Tenant:\s*/, "") : ""; }
  function snowSeason() {
    var y = NOW.getFullYear(), start = (NOW.getMonth() >= 6 ? y : y - 1) + "-07-01";
    var list = S.snow.filter(function (x) { return x.date >= start; });
    return { start: start, visits: list.length, cost: sum(list, function (x) { return +x.cost || 0; }), list: list };
  }

  /* ---- tenants ---- */
  var INCLUDED_NOTE = '<div class="callout blue"><b>Full-service leases.</b> Utilities included: power, water, sewer, garbage, heat. Tenant pays: janitorial, phone, data (to their own providers). Onsite management, including snow removal.</div>';
  function leaseCell(t) {
    var d = daysUntil(t.end), tag = "";
    if (t.end < TODAY) tag = " " + pill("closed", "Ended");
    else if (t.start > TODAY) tag = " " + pill("coming", "Starts " + fmtD(t.start));
    else if (d <= 120) tag = " " + pill("coming", "Ends in " + d + " days");
    return '<span class="nowrap">' + fmtD(t.start) + " –</span> " + '<span class="nowrap">' + fmtD(t.end) + "</span>" + tag;
  }
  function vTenants(arg) {
    if (arg === "new") return vTenantForm(null);
    if (arg) { var t = tenantById(arg); if (t) return vTenantDetail(t); }
    var cols = [{ h: "Suite", first: true }, { h: "Tenant" }, { h: "Sq ft", c: "num" }, { h: "Rent / mo", c: "num" }, { h: "$ / sq ft / yr", c: "num" },
      { h: "Lease" }, { h: "Deposit", c: "num" }, { h: "Contact" }, { h: "", c: "acts-c" }];
    var rows = [], leased = 0, roll = 0;
    S.units.forEach(function (u) {
      var ts = S.tenants.filter(function (t) { return t.unit === u.id; }).sort(function (a, b) { return a.start < b.start ? 1 : -1; });
      var cur = occupant(u.id);
      if (u.ownerUse) rows.push({ cells: ['<span class="tname">' + esc(u.suite) + "</span>", esc(u.ownerUse), num(u.sqft), "—", "—", '<span class="sm">Owner use</span>', "—", '<span class="sm">(541) 523-9048</span>', ""] });
      else if (!cur) rows.push({ cls: "vacant", cells: ['<span class="tname">' + esc(u.suite) + "</span>", "<b>Vacant</b>" + (u.real ? " (4,527 sq ft, the real listing)" : ""), num(u.sqft), "Call for rate", "—", pill("coming", "Vacant"), "—", "—",
        '<span class="acts"><a class="btn o xs" href="#ads/' + u.id + '">Advertise</a><a class="btn n xs" href="#tenants/new">Add tenant</a></span>'] });
      ts.forEach(function (t) {
        if (cur === t) { leased += u.sqft; roll += +t.rent; }
        else if (t.end >= TODAY && t.start <= TODAY) return;
        rows.push({ cells: ['<span class="tname">' + esc(u.suite) + "</span>", '<a class="lnk" href="#tenants/' + esc(t.id) + '">' + esc(t.name) + "</a>", num(u.sqft), money0(t.rent),
          "$" + (t.rent * 12 / u.sqft).toFixed(2), leaseCell(t), money0(t.deposit),
          '<span class="sm">' + esc(t.contact.name) + "<br>" + esc(t.contact.phone) + "<br>" + esc(t.contact.email) + "</span>",
          '<span class="acts"><a class="btn o xs" href="#tenants/' + esc(t.id) + '">Open</a></span>'] });
      });
    });
    var total = buildingSqft();
    return vhead("Tenants & leases", "Rent roll", "Tenth Street Office Complex · " + num(total) + " sq ft · " + pct(leased, total) + " leased by area.",
      '<a class="btn n sm" href="#tenants/new">+ Add tenant</a>') + INCLUDED_NOTE +
      table(cols, rows, ["Total", "", num(total), money0(roll), "", "", "", "", ""]) +
      '<p class="note">Tenant names and contacts are samples; phone numbers are placeholders. Suite letters and sizes are samples except the 4,527 sq ft vacancy.</p>';
  }
  function vTenantDetail(t) {
    var u = unitById(t.unit);
    var invs = S.invoices.filter(function (i) { return i.tenant === t.id; }).sort(function (a, b) { return a.month < b.month ? 1 : -1; });
    var owed = sum(invs.filter(function (i) { return i.status !== "Draft"; }), balance);
    var rows = invs.slice(0, 13).map(function (i) {
      var s = status(i);
      return ['<a class="lnk" href="#invoice/' + esc(i.id) + '">' + esc(i.id) + "</a>", monthLong(i.month), money(total(i)), money(paidAmt(i)), pill(s, s === "Sent" ? "Sent (not due yet)" : s)];
    });
    return vhead("Tenants & leases · " + esc(u ? u.suite : ""), esc(t.name), esc(t.note || ""),
      '<a class="btn o sm" href="#tenants">← Rent roll</a>') +
      '<div class="cards4">' +
      stat("Rent", money0(t.rent) + " <small>/ mo</small>", "<p>$" + (t.rent * 12 / (u ? u.sqft : 1)).toFixed(2) + " per sq ft per year</p>") +
      stat("Lease", fmtD(t.end), "<p>Started " + fmtD(t.start) + (t.end >= TODAY ? ". " + daysUntil(t.end) + " days left." : ". Ended.") + "</p>") +
      stat("Deposit held", money0(t.deposit), "") +
      stat("Balance owed", money(owed), "", null, owed > 0 ? "warn" : "good") + "</div>" +
      INCLUDED_NOTE +
      '<h2 class="sec">Invoices</h2>' + (rows.length ? table([{ h: "Invoice", first: true }, { h: "Month" }, { h: "Amount", c: "num" }, { h: "Paid", c: "num" }, { h: "Status" }], rows) : "<p>No invoices yet.</p>") +
      '<h2 class="sec">Edit lease &amp; contact</h2>' + tenantFormHTML(t);
  }
  function vTenantForm() {
    var free = S.units.filter(function (u) { return !u.ownerUse && !occupant(u.id); });
    return vhead("Tenants & leases", "Add a tenant", "Sign a sample lease into a vacant suite. It shows up on the rent roll and on the next invoice run.", '<a class="btn o sm" href="#tenants">← Rent roll</a>') +
      (free.length ? tenantFormHTML(null, free) : '<p class="callout">Every suite is leased right now. Set a lease end date in the past to free one up.</p>');
  }
  function tenantFormHTML(t, free) {
    var isNew = !t;
    t = t || { name: "Sample Tenant: ", rent: "", deposit: "", start: lastDayOf(THIS_M).slice(0, 8) + "01", end: "", contact: { name: "", phone: "(541) 000-0000", email: "name@example.com" }, note: "" };
    if (isNew) { t.start = addM(THIS_M, 1) + "-01"; t.end = lastDayOf(addM(THIS_M, 36)); }
    function f(id, label, val, type, extra) {
      return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="' + (type || "text") + '" value="' + esc(val) + '"' + (extra || "") + "></div>";
    }
    return '<form class="panel" data-form="tenant" data-id="' + (isNew ? "" : esc(t.id)) + '" novalidate><div class="fgrid">' +
      (isNew ? '<div class="field"><label for="unit">Suite</label><select id="unit" name="unit">' + free.map(function (u) { return '<option value="' + u.id + '">' + esc(u.suite) + " · " + num(u.sqft) + " sq ft</option>"; }).join("") + "</select></div>" : "") +
      '<div class="field wide"><label for="name">Tenant name</label><input id="name" name="name" required value="' + esc(t.name) + '"></div>' +
      f("rent", "Rent per month ($)", t.rent, "number", ' min="0" step="1" required') +
      f("deposit", "Deposit ($)", t.deposit, "number", ' min="0" step="1"') +
      f("start", "Lease start", t.start, "date", " required") +
      f("end", "Lease end", t.end, "date", " required") +
      f("cname", "Contact person", t.contact.name) +
      f("cphone", "Phone", t.contact.phone, "tel") +
      f("cemail", "Email", t.contact.email, "email") +
      '<div class="field wide"><label for="note">Notes</label><input id="note" name="note" value="' + esc(t.note || "") + '"></div></div>' +
      '<p class="note">Lease terms: full service. Utilities included: power, water, sewer, garbage, heat. Tenant pays: janitorial, phone, data.</p>' +
      '<p class="ferr" id="tErr" role="alert"></p><div class="formbar"><button type="submit" class="btn n sm">' + (isNew ? "Add tenant" : "Save changes") + "</button></div></form>";
  }

  /* ---- billing ---- */
  function billingMonths() {
    var first = S.invoices.reduce(function (a, i) { return i.month < a ? i.month : a; }, THIS_M);
    return monthsBetween(first, addM(THIS_M, 2)).reverse();
  }
  function vBilling(arg) {
    var m = /^\d{4}-\d{2}$/.test(arg || "") ? arg : THIS_M;
    var invs = S.invoices.filter(function (i) { return i.month === m; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var drafts = invs.filter(function (i) { return i.status === "Draft"; });
    var live = invs.filter(function (i) { return i.status !== "Draft"; });
    var od = live.filter(function (i) { return status(i) === "Overdue"; });
    var needLate = od.filter(function (i) { return !hasLate(i); });
    var activeN = S.tenants.filter(function (t) { return activeIn(t, m); }).length;
    var missing = activeN - invs.length;
    var genLabel = !invs.length ? "Generate " + monthOnly(m) + " invoices" : missing > 0 ? "Add missing invoices" : drafts.length ? "Refresh drafts" : "";
    var acts = monthSelect("billMonth", billingMonths(), m) +
      (genLabel ? '<button type="button" class="btn n sm" data-act="generate" data-m="' + m + '">' + genLabel + "</button>" : "") +
      (drafts.length ? '<button type="button" class="btn t sm" data-act="sendDrafts" data-m="' + m + '">Send ' + drafts.length + " draft" + (drafts.length > 1 ? "s" : "") + "</button>" : "") +
      (needLate.length ? '<button type="button" class="btn o sm bad" data-act="lateAll" data-m="' + m + '">Add late fees (' + needLate.length + ")</button>" : "");
    var cols = [{ h: "Invoice", first: true }, { h: "Tenant" }, { h: "Amount", c: "num" }, { h: "Paid", c: "num" }, { h: "Balance", c: "num" }, { h: "Status" }, { h: "", c: "" }];
    var rows = invs.map(function (i) {
      var t = tenantById(i.tenant), u = unitById(i.unit), s = status(i), b = [];
      b.push('<a class="btn o xs" href="#invoice/' + esc(i.id) + '">View / print</a>');
      if (s === "Draft") {
        b.push('<button type="button" class="btn n xs" data-act="sendOne" data-id="' + esc(i.id) + '">Send</button>');
        b.push('<button type="button" class="btn o xs" data-act="addCharge" data-id="' + esc(i.id) + '">+ Charge</button>');
        b.push('<button type="button" class="btn o xs bad" data-act="delDraft" data-id="' + esc(i.id) + '">Delete</button>');
      } else if (s !== "Paid") {
        b.push('<button type="button" class="btn n xs" data-act="markPaid" data-id="' + esc(i.id) + '">Mark paid</button>');
        b.push('<button type="button" class="btn o xs" data-act="addCharge" data-id="' + esc(i.id) + '">+ Charge</button>');
        if (s === "Overdue" && !hasLate(i)) b.push('<button type="button" class="btn o xs bad" data-act="lateOne" data-id="' + esc(i.id) + '">+ Late fee</button>');
        b.push('<a class="btn o xs" href="#pay/' + esc(i.id) + '">Pay page</a>');
      }
      var extra = i.lines.filter(function (l) { return l.kind !== "rent"; }).map(function (l) { return esc(l.kind === "late" ? "late fee" : l.label); }).join(", ");
      return { cls: s === "Overdue" ? "flagged" : "", cells: ['<span class="tname">' + esc(i.id) + "</span>",
        esc(t ? t.name : "") + '<br><span class="sm">' + esc(u ? u.suite : "") + (extra ? " · incl. " + extra : "") + "</span>",
        money(total(i)), money(paidAmt(i)), money(balance(i)),
        pill(s, s === "Sent" ? "Sent" : s) + (i.payments.length ? '<br><span class="sm">' + esc(i.payments.map(function (p) { return p.method + " " + fmtD(p.date); }).join("; ")) + "</span>" : ""),
        '<span class="acts">' + b.join("") + "</span>"] };
    });
    var billed = sum(live, total), coll = sum(live, paidAmt);
    return vhead("Billing", "Invoices: " + monthLong(m),
      "Leases are full service, so an invoice is rent, plus a late fee when it applies, plus any one-off charge (a key replacement, a lockout call). Utility bills are an owner expense, tracked on <a class=\"lnk\" href=\"#utilities\">Utilities</a>.", acts) +
      '<div class="cards4">' + stat("Billed", money0(billed), "<p>" + live.length + " sent" + (drafts.length ? ", " + drafts.length + " draft" : "") + "</p>") +
      stat("Collected", money0(coll), "<p>" + pct(coll, billed) + " of billed</p>", null, "good") +
      stat("Outstanding", money0(billed - coll), "<p>" + live.filter(function (i) { return balance(i) > 0; }).length + " open</p>") +
      stat("Overdue", od.length, "<p>Late after the " + ordinal(+S.settings.lateAfterDay) + "</p>", null, od.length ? "warn" : "") + "</div>" +
      (invs.length ? (missing > 0 ? '<p class="callout">' + missing + " tenant" + (missing > 1 ? "s have" : " has") + " no " + monthOnly(m) + ' invoice yet. Press "Add missing invoices".</p>' : "") +
        (drafts.length ? '<p class="callout">Drafts are not sent. Check them, add any one-off charges, then press <b>Send</b>. In the live version Send emails each tenant a link to their pay page; the demo sends nothing.</p>' : "") +
        table(cols, rows, ["Total", "", money(sum(invs, total)), money(sum(invs, paidAmt)), money(sum(invs, balance)), "", ""])
        : '<div class="callout blue"><b>No ' + monthLong(m) + " invoices yet.</b> " + activeN + " tenants have a lease that month. Press <b>Generate " + monthOnly(m) + " invoices</b> to make a draft for each one: rent, plus any one-off charges you add. Nothing goes out until you press Send.</div>") +
      '<details class="panel" style="margin-top:20px"' + (S.ui && S.ui.settingsOpen ? " open" : "") + ' id="setPanel"><summary>Late fee settings</summary>' +
      '<form data-form="settings" novalidate><div class="fgrid">' +
      '<div class="field"><label for="lateFeePct">Late fee (%)</label><input id="lateFeePct" name="lateFeePct" type="number" min="0" max="25" step="0.5" value="' + esc(S.settings.lateFeePct) + '"></div>' +
      '<div class="field"><label for="lateAfterDay">Late after day</label><input id="lateAfterDay" name="lateAfterDay" type="number" min="1" max="28" step="1" value="' + esc(S.settings.lateAfterDay) + '"></div>' +
      '<div class="field"><label for="lateBasis">Percent of</label><select id="lateBasis" name="lateBasis"><option value="rent"' + (S.settings.lateBasis === "rent" ? " selected" : "") + '>Monthly rent</option><option value="balance"' + (S.settings.lateBasis === "balance" ? " selected" : "") + ">Unpaid balance</option></select></div></div>" +
      '<p class="note">Example: 5% of rent, added when an invoice is still unpaid after the 10th. Late fees are only added when you press "+ Late fee" (or "Add late fees"); match this to the lease language.</p>' +
      '<div class="formbar"><button type="submit" class="btn n sm">Save settings</button></div></form></details>';
  }

  function invoiceSheet(inv) {
    var t = tenantById(inv.tenant), u = unitById(inv.unit), s = status(inv), C = S.company;
    var lines = inv.lines.map(function (l) { return "<tr><td>" + esc(l.label) + '</td><td class="num">' + money(l.amt) + "</td></tr>"; }).join("");
    var pays = inv.payments.map(function (p) { return "<tr><td>Payment received " + fmtD(p.date) + " · " + esc(p.method) + (p.ref ? " · " + esc(p.ref) : "") + '</td><td class="num">−' + money(p.amt) + "</td></tr>"; }).join("");
    return '<article class="invoice-sheet" aria-label="Invoice ' + esc(inv.id) + '">' +
      '<div class="inv-top"><div class="inv-co">' + logo(46) + "<div><b>" + esc(C.name) + "</b><span>" + esc(C.address) + "</span><span>" + esc(C.phone) + " · " + esc(C.email) + "</span></div></div>" +
      '<div class="inv-title"><h2>INVOICE</h2><div>' + esc(inv.id) + "</div><div>" + pill(s, s === "Sent" ? "Sent · due " + fmtD(inv.due) : s) + '</div><span class="sample-stamp">SAMPLE · DEMO DATA</span></div></div>' +
      '<div class="inv-meta"><div><h3>Bill to</h3><p><b>' + esc(t ? t.name : "") + "</b></p><p>" + esc(u ? u.suite : "") + ", " + esc(S.property.name) + "</p><p>Baker City, OR 97814</p>" +
      (t ? "<p>" + esc(t.contact.name) + " · " + esc(t.contact.email) + "</p>" : "") + "</div>" +
      "<div><h3>Details</h3><p>Period: " + monthLong(inv.month) + "</p><p>Issued: " + fmtD(inv.sentOn || inv.created) + "</p><p>Due: " + fmtD(inv.due) + "</p><p>Late after: " + fmtD(lateDate(inv)) + "</p></div></div>" +
      '<table class="inv"><thead><tr><th>Description</th><th class="num">Amount</th></tr></thead><tbody>' + lines + pays + "</tbody>" +
      '<tfoot><tr><td>Invoice total</td><td class="num">' + money(total(inv)) + "</td></tr>" +
      (inv.payments.length ? '<tr><td>Payments</td><td class="num">−' + money(paidAmt(inv)) + "</td></tr>" : "") +
      '<tr class="due"><td>Balance due</td><td class="num">' + money(Math.max(0, balance(inv))) + "</td></tr></tfoot></table>" +
      '<div class="inv-foot"><p><b>Full-service lease:</b> rent includes power, water, sewer, garbage and heat. Janitorial, phone and data are the tenant\'s own accounts.</p>' +
      "<p>A late fee of " + esc(S.settings.lateFeePct) + "% of " + (S.settings.lateBasis === "balance" ? "the unpaid balance" : "rent") + " applies if unpaid after the " + ordinal(+S.settings.lateAfterDay) + ". " +
      "Pay online at the link in your invoice email (card or bank transfer), or by check to " + esc(C.name) + ", " + esc(C.address) + ".</p>" +
      "<p>Sample invoice from a demo. Not a bill.</p></div></article>";
  }
  function vInvoice(id) {
    var inv = invById(id);
    if (!inv) return vhead("Billing", "Invoice not found", "It may have been deleted, or the demo data was reset.", '<a class="btn o sm" href="#billing">← Billing</a>');
    var s = status(inv);
    return '<div class="no-print">' + vhead("Billing · " + monthLong(inv.month), "Invoice " + esc(inv.id), "Printable invoice. Use Print (or Ctrl+P) for a clean one-page copy or PDF.",
      '<a class="btn o sm" href="#billing/' + inv.month + '">← ' + monthOnly(inv.month) + " invoices</a>" +
      '<button type="button" class="btn n sm" data-act="print">Print</button>' +
      (s === "Draft" ? '<button type="button" class="btn t sm" data-act="sendOne" data-id="' + esc(inv.id) + '">Send</button>' : "") +
      (s !== "Paid" && s !== "Draft" ? '<button type="button" class="btn t sm" data-act="markPaid" data-id="' + esc(inv.id) + '">Mark paid</button><a class="btn o sm" href="#pay/' + esc(inv.id) + '">Tenant pay page</a>' : "") +
      (s !== "Paid" ? '<button type="button" class="btn o sm" data-act="addCharge" data-id="' + esc(inv.id) + '">+ Charge</button>' : "")) + "</div>" +
      invoiceSheet(inv);
  }

  /* ---- tenant pay page preview ---- */
  function vPay(arg) {
    var list = S.invoices.filter(function (i) { return i.status !== "Draft"; });
    var open = list.filter(function (i) { return balance(i) > 0; }).sort(function (a, b) { return a.month < b.month ? -1 : 1; });
    var paid = list.filter(function (i) { return balance(i) <= 0; }).sort(function (a, b) { return a.month < b.month ? 1 : -1; }).slice(0, 8);
    var inv = invById(arg) || open[0] || paid[0];
    if (!inv) return vhead("Tenant payments", "Tenant pay page", "Send some invoices first.");
    var t = tenantById(inv.tenant), u = unitById(inv.unit), bal = balance(inv), s = status(inv);
    function opt(i) { var tt = tenantById(i.tenant); return '<option value="' + esc(i.id) + '"' + (i === inv ? " selected" : "") + ">" + esc(i.id) + " · " + esc(shortName(tt)) + " · " + (balance(i) > 0 ? money(balance(i)) + " due" : "paid") + "</option>"; }
    var sel = '<span class="inline-sel"><label for="payInv">Preview invoice</label><select id="payInv" data-chg="payInv"><optgroup label="Open">' + open.map(opt).join("") + '</optgroup><optgroup label="Recently paid">' + paid.map(opt).join("") + "</optgroup></select></span>";
    var lines = inv.lines.map(function (l) { return "<tr><td>" + esc(l.kind === "rent" ? "Rent, " + monthLong(inv.month) : l.label) + '</td><td class="num">' + money(l.amt) + "</td></tr>"; }).join("") +
      inv.payments.map(function (p) { return "<tr><td>Paid " + fmtD(p.date) + " (" + esc(p.method) + ')</td><td class="num">−' + money(p.amt) + "</td></tr>"; }).join("");
    var page = '<div class="browser" aria-label="Preview of the tenant pay page"><div class="addr"><i></i><i></i><i></i><span>https://pay.example.com/rock-creek/' + esc(inv.id) + "</span></div>" +
      '<div class="payp"><div class="co">' + logo(30) + "Rock Creek Developments</div>" +
      "<div>Hello, <b>" + esc(t ? t.name : "") + "</b> · " + esc(u ? u.suite : "") + ", " + esc(S.property.name) + "</div>" +
      (bal <= 0 ? '<div class="due"><div class="paid-note"><b>Paid in full.</b> Thank you! ' + esc(monthLong(inv.month)) + " is settled" + (inv.payments.length ? " (last payment " + fmtD(inv.payments[inv.payments.length - 1].date) + ")" : "") + ".</div></div>"
        : '<div class="due"><p>' + (s === "Overdue" ? "<b>Past due</b>" : "Amount due") + '</p><div class="amt">' + money(bal) + "</div><p>Invoice " + esc(inv.id) + " · due " + fmtD(inv.due) +
          (s === "Overdue" ? "" : " · a late fee applies after " + fmtD(lateDate(inv))) + "</p></div>") +
      '<table aria-label="Breakdown">' + lines + '<tr><td><b>Balance</b></td><td class="num"><b>' + money(Math.max(0, bal)) + "</b></td></tr></table>" +
      (bal > 0 ? '<div class="paybtns"><button type="button" class="btn n full" data-act="payDemo" data-how="Card" data-id="' + esc(inv.id) + '">Pay ' + money(bal) + " by card</button>" +
        '<button type="button" class="btn o full" data-act="payDemo" data-how="ACH" data-id="' + esc(inv.id) + '">Pay from bank account (ACH)</button></div>' : "") +
      '<p class="fine">Your card or bank details go to our payment processor, never to Rock Creek. Rent includes power, water, sewer, garbage and heat. Questions? Call ' + esc(S.company.phone) + ".</p></div></div>";
    return vhead("Tenant payments", "Tenant pay page (preview)", "What a tenant sees when they open the link in their invoice email.", sel) +
      '<div class="pay-grid"><div>' + page + "</div><div>" +
      '<div class="callout"><b>Demo only: no payment is taken.</b> In the real version the Pay buttons hand off to a payment processor, for example Stripe (card and ACH) or the bank\'s own ACH service. The processor collects the card or bank details on its own secure page and deposits to the company account; this site never sees or stores them. When a payment clears, the invoice is marked paid automatically.</div>' +
      '<div class="panel"><h4>Manager side</h4><p class="small">Checks and cash still get recorded by hand.</p><div class="vact">' +
      '<a class="btn o sm" href="#invoice/' + esc(inv.id) + '">Open invoice</a>' + (bal > 0 ? '<button type="button" class="btn n sm" data-act="markPaid" data-id="' + esc(inv.id) + '">Mark paid</button>' : "") + "</div></div></div></div>";
  }

  /* ---- utilities (owner expense) ---- */
  function utilChart(months) {
    var W = 720, H = 240, pl = 8, pr = 8, pt = 26, pb = 30, n = months.length;
    var vals = months.map(function (m) { return uTotal(S.utilities[m]); });
    var max = Math.max.apply(null, vals.concat([1])) * 1.1;
    var bw = (W - pl - pr) / n, out = "";
    months.forEach(function (m, i) {
      var v = vals[i], x = pl + i * bw + bw * 0.16, w = bw * 0.68, h = v / max * (H - pt - pb), y = H - pb - h;
      var flag = jumpInfo(m);
      if (v) out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (flag ? "#9b2c1f" : "#1c2f45") + '"/>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="12" fill="#1f2b36">$' + (v / 1000).toFixed(1) + "k</text>";
      else out += '<rect x="' + x.toFixed(1) + '" y="' + (H - pb - 40) + '" width="' + w.toFixed(1) + '" height="40" rx="2" fill="none" stroke="#9a5a30" stroke-dasharray="4 3"/>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - pb - 46) + '" text-anchor="middle" font-size="11" fill="#7d4524">not in</text>';
      out += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="#56616a">' + monAbbr(m) + "</text>";
    });
    out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (H - pb) + '" y2="' + (H - pb) + '" stroke="#b9ab95"/>';
    return '<div class="chart"><div class="legend2"><span><i style="background:#1c2f45"></i>Total utilities</span><span><i style="background:#9b2c1f"></i>Jumped more than ' + esc(S.settings.jumpPct) + '% over the 3-month average</span></div>' +
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Bar chart of total building utilities for the last 12 months; the same numbers are in the table below." font-family="Segoe UI, Arial, sans-serif">' + out + "</svg></div>";
  }
  function vUtil(arg) {
    var months = monthsBetween(addM(THIS_M, -12), addM(THIS_M, -1));
    var lastM = addM(THIS_M, -1);
    var sel = /^\d{4}-\d{2}$/.test(arg || "") ? arg : (S.utilities[lastM] ? lastM : lastM);
    var rec = S.utilities[sel] || {};
    var sq = buildingSqft();
    var entered = months.filter(function (m) { return S.utilities[m]; });
    var tot12 = sum(entered, function (m) { return uTotal(S.utilities[m]); });
    var rent12 = sum(entered, rentCollectedFor);
    var rows = months.slice().reverse().map(function (m) {
      var r = S.utilities[m], j = jumpInfo(m);
      if (!r) return { cls: "vacant", cells: ['<span class="tname">' + monthLong(m) + "</span>", "—", "—", "—", "—", "—", "<b>Not entered</b>", "—", "—", '<a class="btn n xs" href="#utilities/' + m + '">Enter bills</a>'] };
      var t = uTotal(r);
      return { cls: j ? "flagged" : "", cells: ['<span class="tname">' + monthLong(m) + "</span>", money0(r.power), money0(r.gas), money0(r.water), money0(r.sewer), money0(r.garbage), "<b>" + money0(t) + "</b>",
        "$" + (t / sq).toFixed(3), pct(t, rentCollectedFor(m)),
        (j ? pill("jump", "Up " + j.up + "%") + '<br><span class="sm">mostly ' + esc(j.driver.cat.toLowerCase()) + " (+" + money0(j.driver.delta) + ")</span>" : "") +
        (r.note ? '<br><span class="sm">' + esc(r.note) + "</span>" : "") +
        ' <a class="btn o xs" href="#utilities/' + m + '">Edit</a>'] };
    });
    var cols = [{ h: "Usage month", first: true }, { h: "Power", c: "num" }, { h: "Gas", c: "num" }, { h: "Water", c: "num" }, { h: "Sewer", c: "num" }, { h: "Garbage", c: "num" }, { h: "Total", c: "num" }, { h: "$ / sq ft", c: "num" }, { h: "% of rent", c: "num" }, { h: "Flag", c: "" }];
    var form = '<form class="panel" data-form="util" data-m="' + sel + '" novalidate><h4>Bills for ' + monthLong(sel) + (S.utilities[sel] ? "" : " <small class=\"muted\">(not entered yet)</small>") + "</h4>" +
      '<p class="small">Type the amounts from each bill. These are the owners\' costs; tenants are not billed for them.</p><div class="fgrid">' +
      UCATS.map(function (c) { return '<div class="field"><label for="u_' + c[0] + '">' + c[1] + ' ($)</label><input id="u_' + c[0] + '" name="' + c[0] + '" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(rec[c[0]] != null ? rec[c[0]] : "") + '" data-live="util"></div>'; }).join("") +
      '<div class="field"><label for="u_paid">Date paid</label><input id="u_paid" name="paid" type="date" value="' + esc(rec.paid || TODAY) + '"></div>' +
      '<div class="field wide"><label for="u_note">Note</label><input id="u_note" name="note" value="' + esc(rec.note || "") + '" placeholder="e.g. rate increase, leak found"></div></div>' +
      '<p class="sans">Total: <b id="uTot">' + money(uTotal(rec)) + "</b> · <span id=\"uSq\">$" + (uTotal(rec) / sq).toFixed(3) + "</span> per sq ft</p>" +
      '<p class="ferr" id="uErr" role="alert"></p><div class="formbar"><button type="submit" class="btn n sm">Save ' + monthOnly(sel) + " bills</button>" +
      monthSelect("utilMonth", months.slice().reverse(), sel, "Other month") + "</div></form>";

    // information view: what each suite costs us
    var infoM = S.utilities[sel] ? sel : latestUtilMonth();
    var ut = uTotal(S.utilities[infoM]);
    var irows = S.units.map(function (u) {
      var occ = occupant(u.id, lastDayOf(infoM)) || null, share = u.sqft / sq, cost = ut * share;
      var who = u.ownerUse ? esc(u.ownerUse) : occ ? esc(occ.name) : "<b>Vacant</b>";
      var rent = occ ? +occ.rent : 0;
      return { cls: !occ && !u.ownerUse ? "vacant" : "", cells: ['<span class="tname">' + esc(u.suite) + "</span>", who, num(u.sqft), (share * 100).toFixed(1) + "%", money(cost),
        rent ? money0(rent) : "—", rent ? pct(cost, rent) : (u.ownerUse ? "owner office" : "carrying cost"), rent ? money0(rent - cost) : "−" + money0(cost)] };
    });
    var vacantCost = sum(S.units.filter(function (u) { return !u.ownerUse && !occupant(u.id, lastDayOf(infoM)); }), function (u) { return ut * u.sqft / sq; });

    return vhead("Owner expense", "Utilities", "Leases are full service: rent includes power, water, sewer, garbage and heat. These are the building's own bills, paid by the owners. Tenants are not billed for them.") +
      '<div class="cards4">' +
      stat("Last 12 months", money0(tot12), "<p>" + entered.length + " of 12 months entered</p>") +
      stat("Average month", money0(entered.length ? tot12 / entered.length : 0), "") +
      stat("Per sq ft per year", "$" + (entered.length ? (tot12 / entered.length * 12 / sq).toFixed(2) : "0"), "<p>" + num(sq) + " sq ft building</p>") +
      stat("Share of rent collected", pct(tot12, rent12), "<p>of " + money0(rent12) + " collected for those months</p>") + "</div>" +
      utilChart(months) + form +
      '<h2 class="sec">Last 12 months</h2>' + table(cols, rows, ["12 months", money0(sum(entered, function (m) { return S.utilities[m].power; })), money0(sum(entered, function (m) { return S.utilities[m].gas; })),
        money0(sum(entered, function (m) { return S.utilities[m].water; })), money0(sum(entered, function (m) { return S.utilities[m].sewer; })), money0(sum(entered, function (m) { return S.utilities[m].garbage; })),
        money0(tot12), "", pct(tot12, rent12), ""]) +
      '<p class="note">A month is flagged when its total is more than ' + esc(S.settings.jumpPct) + "% over the average of the 3 months before it. Expect a flag when the heat comes on in the fall; anything else is worth a look (a leak, a meter misread, a rate change).</p>" +
      '<h2 class="sec"><span class="k">Information only</span>What each suite costs us in utilities · ' + monthLong(infoM) + "</h2>" +
      '<p class="callout blue">The building\'s ' + money(ut) + " split by square footage. Tenants are <b>not</b> charged this; it shows whether each lease's rent still covers its share, and what an empty suite costs to carry (" + money0(vacantCost) + " this month).</p>" +
      table([{ h: "Suite", first: true }, { h: "Occupant" }, { h: "Sq ft", c: "num" }, { h: "Share", c: "num" }, { h: "Utilities", c: "num" }, { h: "Rent", c: "num" }, { h: "Utilities / rent", c: "num" }, { h: "Rent after utilities", c: "num" }],
        irows, ["Building", "", num(sq), "100%", money(ut), "", "", ""]);
  }

  /* ---- advertising ---- */
  function vAds(arg) {
    var vac = vacancies();
    if (!vac.length) return vhead("Advertising", "Vacancy ads", "Nothing is vacant right now.");
    var v = vac.filter(function (x) { return x.id === arg; })[0] || vac[0];
    var a = adState(v.id), d = adDraft(v);
    var inq = S.inquiries.filter(function (q) { return q.unit === v.id; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; });
    function item(x) {
      var ax = S.ads[x.id], n = S.inquiries.filter(function (q) { return q.unit === x.id; }).length;
      return '<a class="vitem' + (x === v ? " on" : "") + '" href="#ads/' + esc(x.id) + '"' + (x === v ? ' aria-current="true"' : "") + "><b>" + esc(x.name) + "</b><span>" + esc(x.where) + " · " + num(x.sqft) + " sq ft</span>" +
        '<span class="row">' + (x.now ? pill("paid", "Vacant now") : pill("coming", "Coming " + fmtD(x.available))) + (ax && ax.published ? pill("sent", "On website") : pill("draft", "Not advertised")) + pill("draft", n + " inquiries") + "</span></a>";
    }
    var tsoc = vac.filter(function (x) { return x.group === "tsoc"; }), other = vac.filter(function (x) { return x.group === "listing"; });
    function fld(id, label, val, wide) { return '<div class="field' + (wide ? " wide" : "") + '"><label for="ad_' + id + '">' + label + '</label><input id="ad_' + id + '" name="' + id + '" value="' + esc(val) + '" data-live="ad"></div>'; }
    var bySrc = {};
    inq.forEach(function (q) { bySrc[q.source] = (bySrc[q.source] || 0) + 1; });
    var STAT = ["New", "Replied", "Showing set", "Closed"];
    var inqRows = inq.map(function (q) {
      return ['<span class="tname">' + fmtD(q.date) + "</span>", esc(q.source), esc(q.name), esc(q.note),
        '<select aria-label="Status for ' + esc(q.name) + '" data-chg="inqStatus" data-id="' + esc(q.id) + '">' + STAT.map(function (s) { return "<option" + (s === q.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>"];
    });
    return vhead("Advertising", "Vacancy ads", "Pick a vacancy; the tool drafts the ad and formats it for Facebook, Marketplace, Craigslist and the website. Copy, paste where it goes, then tick it off.") +
      '<div class="ads-grid"><div class="vlist" aria-label="Vacancies"><h3>Tenth Street Office Complex</h3>' + (tsoc.length ? tsoc.map(item).join("") : '<p class="small">All suites leased.</p>') +
      "<h3>Other sample listings (Properties page)</h3>" + other.map(item).join("") + "</div>" +
      "<div>" +
      '<div class="panel"><div class="vhead" style="margin-bottom:6px"><div><div class="k">' + (v.group === "tsoc" ? (v.unit.real ? "The real listing (rent unknown, so: Call for rate)" : "Tenth Street Office Complex") : "Sample listing") + '</div><h4 style="margin:4px 0 0">' + esc(v.name) + "</h4></div>" +
      '<label class="switch"><input type="checkbox" data-chg="adPublish" data-id="' + esc(v.id) + '"' + (a.published ? " checked" : "") + ">Publish to website listing</label></div>" +
      '<p class="small" id="pubNote">' + (a.published ? "On the website since " + fmtD(a.publishedOn) + "." : "Not on the website.") + " (Demo: this marks it as advertised here. The live version would switch the listing on the Properties page.)</p>" +
      '<form data-form="ad" data-id="' + esc(v.id) + '" novalidate><div class="fgrid">' +
      fld("headline", "Headline", d.headline, true) + fld("rent", "Rent", d.rent) + fld("size", "Size", d.size) + fld("available", "Available", d.available) +
      '<div class="field wide"><label for="ad_description">Description</label><textarea id="ad_description" name="description" rows="4" data-live="ad">' + esc(d.description) + "</textarea></div>" +
      '<div class="field wide"><label for="ad_features">Features (one per line)</label><textarea id="ad_features" name="features" rows="4" data-live="ad">' + esc(d.features) + "</textarea></div>" +
      fld("contact", "Contact line", d.contact, true) + "</div>" +
      '<div class="formbar"><button type="button" class="btn o sm" data-act="adReset" data-id="' + esc(v.id) + '">Reset to drafted wording</button>' +
      '<span class="checks" role="group" aria-label="Posted on"><span class="sans small" style="margin:0">Posted on:</span>' +
      [["facebook", "Facebook"], ["marketplace", "Marketplace"], ["craigslist", "Craigslist"]].map(function (c) {
        return '<label><input type="checkbox" data-chg="adPosted" data-id="' + esc(v.id) + '" data-ch="' + c[0] + '"' + (a.posted && a.posted[c[0]] ? " checked" : "") + ">" + c[1] + "</label>";
      }).join("") + "</span></div></form></div>" +
      '<h2 class="sec">Previews</h2><div class="previews" id="previews">' + previewsHTML(v, d) + "</div>" +
      '<h2 class="sec">Inquiries for this ad <span class="sm muted sans" style="font-size:14px">' + (inq.length ? Object.keys(bySrc).map(function (k) { return k + " " + bySrc[k]; }).join(" · ") : "") + "</span></h2>" +
      (inq.length ? table([{ h: "Date", first: true }, { h: "Source" }, { h: "From" }, { h: "Note" }, { h: "Status" }], inqRows) : '<p class="small">No inquiries yet.</p>') +
      '<form class="panel" style="margin-top:14px" data-form="inq" data-id="' + esc(v.id) + '" novalidate><h4>Log an inquiry</h4><div class="fgrid">' +
      '<div class="field"><label for="q_src">Came from</label><select id="q_src" name="source">' + ["Facebook", "Marketplace", "Craigslist", "Website", "Phone call", "Walk-in"].map(function (s) { return "<option>" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="q_name">Who</label><input id="q_name" name="name" value="Sample inquirer: " required></div>' +
      '<div class="field wide"><label for="q_note">Note</label><input id="q_note" name="note" placeholder="What they asked"></div></div>' +
      '<p class="ferr" id="qErr" role="alert"></p><div class="formbar"><button type="submit" class="btn n sm">Add inquiry</button></div></form>' +
      "</div></div>";
  }
  function phImg(src, alt) { return src ? '<div class="ph-wrap"><img src="' + esc(src) + '" alt="' + esc(alt) + '"><span class="flag">SAMPLE PHOTO</span></div>' : ""; }
  function previewsHTML(v, d) {
    var tx = adTexts(d), img = photoSrc(d.photo);
    var feats = String(d.features || "").split("\n").filter(function (s) { return s.trim(); });
    function card(key, title, body) {
      return '<section class="pv" aria-label="' + title + ' preview"><div class="pv-h">' + title + '<button type="button" class="btn o xs" data-act="copy" data-which="' + key + '" data-id="' + esc(v.id) + '">Copy</button></div><div class="pv-b">' + body + "</div></section>";
    }
    var web = v.group === "listing" ? '<a class="lnk" href="../properties/#p/' + encodeURIComponent(v.id) + '">Open this listing on the Properties page</a>' : '<span class="small">Would appear on the Properties page as a new listing.</span>';
    return card("fb", "Facebook post",
        '<div class="fb-who"><span class="fb-av">' + logo(26, "#fff") + "</span><span><b>Rock Creek Developments</b><span>Just now · Public</span></span></div>" +
        '<div class="pre">' + esc(tx.fb) + "</div>" + phImg(img, "Sample photo for the ad") + '<div class="fb-acts"><span>Like</span><span>Comment</span><span>Share</span></div>') +
      card("mkt", "Facebook Marketplace",
        phImg(img, "") + "<b>" + esc(tx.mktTitle) + '</b><div class="mkt-price">' + esc(d.rent) + "</div>" +
        '<dl class="mkt-dl"><dt>Category</dt><dd>Property rentals · Commercial</dd><dt>Location</dt><dd>Baker City, OR</dd><dt>Size</dt><dd>' + esc(d.size) + "</dd><dt>Available</dt><dd>" + esc(d.available) + "</dd></dl>" +
        '<div class="pre">' + esc(tx.mktDesc) + "</div>") +
      card("cl", "Craigslist (office &amp; commercial)",
        '<div class="cl"><div class="cl-t">' + esc(tx.clTitle) + '</div><div class="pre">' + esc(tx.clBody) + "</div></div>") +
      card("web", "Company website listing",
        '<div class="web-card">' + phImg(img, "") + '<div class="tx"><span class="k">' + (v.group === "tsoc" ? "Office" : esc(v.listing.type)) + "</span><h4>" + esc(d.headline) + '</h4><div class="small">' + esc(v.where) + "</div>" +
        '<div class="nums"><b>' + esc(d.rent) + "</b><span>" + esc(d.size) + "</span><span>" + esc(d.available) + "</span></div>" +
        '<ul class="small" style="margin:8px 0 0;padding-left:18px">' + feats.slice(0, 4).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div></div><p style=\"margin:8px 0 0\">" + web + "</p>");
  }

  /* ---- maintenance + snow ---- */
  var CATS = ["Plumbing", "Heating / cooling", "Electrical", "Doors / locks", "Roof / gutters", "Grounds", "Snow removal", "Janitorial (common areas)", "Turnover", "Other"];
  function whereLabel(id) { if (id === "common") return "Common area"; var u = unitById(id); return u ? u.suite : id; }
  function vMaint(arg) {
    var f = ["open", "new", "scheduled", "done", "all"].indexOf(arg) >= 0 ? arg : "open";
    var list = S.maintenance.filter(function (x) {
      return f === "all" || (f === "open" && x.status !== "Done") || x.status.toLowerCase() === f;
    }).sort(function (a, b) { return a.received < b.received ? 1 : -1; });
    var tabs = [["open", "Open"], ["new", "New"], ["scheduled", "Scheduled"], ["done", "Done"], ["all", "All"]].map(function (t) {
      return '<a href="#maint/' + t[0] + '" class="' + (t[0] === f ? "on" : "") + '"' + (t[0] === f ? ' aria-current="true"' : "") + ">" + t[1] + " (" + S.maintenance.filter(function (x) { return t[0] === "all" || (t[0] === "open" ? x.status !== "Done" : x.status.toLowerCase() === t[0]); }).length + ")</a>";
    }).join("");
    var rows = list.map(function (x) {
      return { cls: x.status === "New" ? "flagged" : "", cells: ['<span class="tname">' + esc(x.id) + '</span><br><span class="sm">' + fmtD(x.received) + "</span>",
        esc(whereLabel(x.unit)) + '<br><span class="sm">' + esc(x.from) + "</span>",
        esc(x.issue) + '<br><span class="sm">' + esc(x.category) + (x.priority === "High" ? " · " : "") + "</span>" + (x.priority === "High" ? pill("high", "High") : ""),
        '<select aria-label="Status of ' + esc(x.id) + '" data-chg="mStatus" data-id="' + esc(x.id) + '">' + ["New", "Scheduled", "Done"].map(function (s) { return "<option" + (s === x.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>",
        '<select aria-label="Vendor for ' + esc(x.id) + '" data-chg="mVendor" data-id="' + esc(x.id) + '"><option value="">Assign…</option>' + S.vendors.map(function (v) { return "<option" + (v === x.vendor ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select>",
        '<input type="date" aria-label="Scheduled date for ' + esc(x.id) + '" data-chg="mDate" data-id="' + esc(x.id) + '" value="' + esc(x.scheduled) + '">' + (x.done ? '<br><span class="sm">Done ' + fmtD(x.done) + "</span>" : ""),
        '<input class="cost" type="number" min="0" step="1" aria-label="Cost for ' + esc(x.id) + '" data-chg="mCost" data-id="' + esc(x.id) + '" value="' + esc(x.cost || "") + '" placeholder="$">'] };
    });
    var season = snowSeason(), last12 = S.snow.filter(function (x) { return x.date >= addM(THIS_M, -11) + "-01"; });
    var snowRows = S.snow.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 25).map(function (x) {
      return ['<span class="tname">' + fmtD(x.date) + "</span>", esc(x.work), esc(x.who), (x.inches ? x.inches + " in" : "—"), money(x.cost),
        '<button type="button" class="btn o xs bad" data-act="delSnow" data-id="' + esc(x.id) + '" aria-label="Delete snow entry ' + fmtD(x.date) + '">Delete</button>'];
    });
    var units = '<option value="common">Common area</option>' + S.units.map(function (u) { return '<option value="' + u.id + '">' + esc(u.suite) + (occupant(u.id) ? " · " + esc(shortName(occupant(u.id))) : "") + "</option>"; }).join("");
    return vhead("Onsite management", "Maintenance", "Tenant requests and the owners' own work orders, plus the snow removal log. Onsite management handles most of it; a vendor gets assigned when it needs one.",
      '<a class="btn n sm" href="#maint/' + f + '" data-act="openNew">+ New request</a><a class="btn o sm" href="#snow" data-act="toSnow">Snow log</a>') +
      '<details class="panel" id="newReq"' + (S.ui && S.ui.newReqOpen ? " open" : "") + '><summary>New request</summary><form data-form="maint" novalidate><div class="fgrid">' +
      '<div class="field"><label for="m_unit">Where</label><select id="m_unit" name="unit">' + units + "</select></div>" +
      '<div class="field"><label for="m_from">Reported by</label><input id="m_from" name="from" value="Onsite management"></div>' +
      '<div class="field"><label for="m_cat">Category</label><select id="m_cat" name="category">' + CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="m_pri">Priority</label><select id="m_pri" name="priority"><option>Normal</option><option>High</option><option>Low</option></select></div>' +
      '<div class="field wide"><label for="m_issue">What needs doing</label><input id="m_issue" name="issue" required placeholder="e.g. Suite C heater is noisy"></div></div>' +
      '<p class="note">On the live site, the Contact page\'s "maintenance request" option would land here as a New request.</p>' +
      '<p class="ferr" id="mErr" role="alert"></p><div class="formbar"><button type="submit" class="btn n sm">Add request</button></div></form></details>' +
      '<div class="tabs" role="navigation" aria-label="Filter requests" style="margin-top:16px">' + tabs + "</div>" +
      (rows.length ? table([{ h: "Request", first: true }, { h: "Where" }, { h: "Issue" }, { h: "Status" }, { h: "Vendor" }, { h: "Scheduled" }, { h: "Cost", c: "num" }], rows) : '<p class="callout blue">No requests in this list.</p>') +
      '<p class="note">Changes save as you make them. Setting a request to Done stamps today\'s date and counts its cost in Reports.</p>' +
      '<h2 class="sec" id="snow" tabindex="-1"><span class="k">Recurring</span>Snow removal log</h2>' +
      '<div class="cards4">' + stat("This season", season.visits + " <small>visits</small>", "<p>Since " + fmtD(season.start) + "</p>") + stat("Season cost", money0(season.cost), "") +
      stat("Last 12 months", money0(sum(last12, function (x) { return +x.cost || 0; })), "<p>" + last12.length + " visits</p>") +
      stat("Snowfall logged", sum(season.list, function (x) { return +x.inches || 0; }) + " <small>in this season</small>", "") + "</div>" +
      '<form class="panel" data-form="snow" novalidate><h4>Log a plow or shovel visit</h4><div class="fgrid">' +
      '<div class="field"><label for="s_date">Date</label><input id="s_date" name="date" type="date" value="' + TODAY + '" required></div>' +
      '<div class="field"><label for="s_work">Work</label><select id="s_work" name="work"><option>Plow lot, shovel walks</option><option>Shovel and de-ice walks</option><option>Plow lot, shovel and de-ice walks</option><option>De-ice only</option><option>Haul snow off the lot</option></select></div>' +
      '<div class="field"><label for="s_who">Who</label><select id="s_who" name="who">' + S.vendors.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="s_in">Snow (inches)</label><input id="s_in" name="inches" type="number" min="0" step="0.5" value="3"></div>' +
      '<div class="field"><label for="s_cost">Cost ($)</label><input id="s_cost" name="cost" type="number" min="0" step="1" value="60" required></div></div>' +
      '<p class="note">In-house visits: count fuel, de-icer and time. Vendor visits: the invoice amount.</p>' +
      '<p class="ferr" id="sErr" role="alert"></p><div class="formbar"><button type="submit" class="btn n sm">Log visit</button></div></form>' +
      '<div style="margin-top:14px">' + (snowRows.length ? table([{ h: "Date", first: true }, { h: "Work" }, { h: "Who" }, { h: "Snow", c: "num" }, { h: "Cost", c: "num" }, { h: "", c: "" }], snowRows) : "<p>No snow logged yet.</p>") + "</div>";
  }

  /* ---- internet & network (PROPOSED add-on, Bill's idea 11/6) ---- */
  function vNetwork() {
    var devices = { sA: null, sB: 14, sC: 6, sD: 11, sE: null, sF: 5, sG: 7, sH: 4 };
    var speed = { sB: "938 / 921", sC: "941 / 930", sD: "936 / 918", sF: "940 / 925", sG: "52 / 48", sH: "939 / 927" };
    var rows = S.units.map(function (u, i) {
      var t = occupant(u.id), state = t && /State office/.test(t.name), vacant = !t && !u.ownerUse;
      var who = state ? esc(t.name) : t ? esc(shortName(t)) : u.ownerUse ? "Rock Creek office" : "Vacant";
      var net = state ? "Own state network (not on the building network)" : vacant ? "Ready on move-in day" : "Private network " + (10 + i) + " · Wi-Fi “RC-" + u.suite.replace("Suite ", "") + "”";
      var st = state ? pill("closed", "Not connected") : vacant ? pill("draft", "Standby") : u.id === "sG" ? pill("overdue", "Slow — check") : pill("paid", "Online");
      return ['<span class="tname">' + esc(u.suite) + "</span>", who, esc(net), devices[u.id] == null ? "—" : String(devices[u.id]), speed[u.id] ? esc(speed[u.id]) + " Mbps" : "—", st];
    });
    var connected = S.units.filter(function (u) { var t = occupant(u.id); return (t && !/State office/.test(t.name)) || u.ownerUse; }).length;
    var outages = [
      ["Oct 14", "22 min", "Provider line down (area outage)", "Provider; Kriisko notified tenants by text"],
      ["Sep 3", "6 min", "Firewall update (scheduled, after hours)", "Kriisko"],
      ["Aug 19", "1 hr 40 min", "Power blip, switch rebooted", "Onsite management + Kriisko"]
    ];
    var extras = [
      ["Nightly backups", "Each suite's computers backed up to the building's secure server", "3 tenants"],
      ["Shared file storage", "Private storage per tenant on the secure server, reachable from the office and home", "2 tenants"],
      ["Private AI", "An AI assistant that runs on the building's server, so documents never leave the building", "1 tenant (trial)"]
    ];
    return vhead("Proposed add-on", "Internet & network", "Fast business internet in every suite, included in rent, with each suite on its own private network. Managed by Kriisko Studios / Baker County AI. PROPOSED: not a current Rock Creek service; provider, speeds and prices are samples.") +
      '<p class="callout blue">The pitch: you already include utilities. Add the best internet in Baker City as one of them, so a new tenant is online the day they move in.</p>' +
      '<div class="cards4">' + stat("Building line", "1 Gbps <small>fiber (sample)</small>", "<p>Business line from the best local provider; plan must allow sharing</p>") +
      stat("Suites connected", connected + " <small>of " + S.units.length + "</small>", "<p>State office stays on its own network</p>") +
      stat("Provider bill", "$450 <small>/mo (sample)</small>", "<p>Owner expense, like the other utilities</p>") +
      stat("Needs attention", "1", "<p>Suite G running slow</p>", null, "warn") + "</div>" +
      '<h2 class="sec">Suites</h2>' +
      table([{ h: "Suite", first: true }, { h: "Who" }, { h: "Network" }, { h: "Devices", c: "num" }, { h: "Speed test (down / up)" }, { h: "Status" }], rows) +
      '<p class="note">Every suite is on its own private network, so tenants can\'t see each other\'s computers or files. Kriisko watches the network and fixes problems; onsite management can see this page.</p>' +
      '<h2 class="sec">Outages</h2>' +
      table([{ h: "Date", first: true }, { h: "How long" }, { h: "Cause" }, { h: "Handled by" }], outages) +
      '<h2 class="sec">Extras tenants can add (secure server)</h2>' +
      table([{ h: "Extra", first: true }, { h: "What it is" }, { h: "Using it (sample)" }], extras) +
      '<p class="note">Prices for the network service and extras are Kriisko\'s to set. No uptime or security guarantees are promised here; terms would be in a written care agreement.</p>';
  }

  /* ---- reports ---- */
  function vReports(arg) {
    var months = monthsBetween(addM(THIS_M, -11), THIS_M);
    var m = /^\d{4}-\d{2}$/.test(arg || "") ? arg : THIS_M;
    var inc = incomeFor(m), ex = expensesFor(m), net = r2(inc.total - ex.total);
    var line = function (label, v, neg) { return '<tr><td>' + label + '</td><td class="num">' + (neg ? "−" : "") + money(v) + "</td></tr>"; };
    var rows = months.slice().reverse().map(function (mm) {
      var i = incomeFor(mm), e = expensesFor(mm);
      return ['<a class="lnk" href="#reports/' + mm + '">' + monthLong(mm) + "</a>", money0(i.rent), money0(i.late), money0(i.other), "<b>" + money0(i.total) + "</b>", money0(e.utilities), money0(e.snow), money0(e.maint), "<b>" + money0(e.total) + "</b>", "<b>" + money0(i.total - e.total) + "</b>"];
    });
    var T = months.reduce(function (a, mm) { var i = incomeFor(mm), e = expensesFor(mm); a.i += i.total; a.r += i.rent; a.l += i.late; a.o += i.other; a.u += e.utilities; a.s += e.snow; a.m += e.maint; a.e += e.total; return a; }, { i: 0, r: 0, l: 0, o: 0, u: 0, s: 0, m: 0, e: 0 });
    return vhead("Reports", "Month summary: " + monthLong(m), "Cash basis: income counts the day a payment arrived; expenses count when a utility bill was paid, snow was cleared, or a job was marked Done.",
      monthSelect("repMonth", months.slice().reverse(), m) + '<button type="button" class="btn n sm" data-act="csvMonth" data-m="' + m + '">Export month CSV</button><button type="button" class="btn o sm" data-act="csv12">Export 12 months CSV</button><button type="button" class="btn o sm" data-act="print">Print</button>') +
      '<div class="cards4">' + stat("Income", money0(inc.total), "", null, "good") + stat("Expenses", money0(ex.total), "") +
      stat("Net", money0(net), "<p>" + pct(net, inc.total) + " of income</p>", null, net >= 0 ? "good" : "warn") +
      stat("Utilities / income", pct(ex.utilities, inc.total), "<p>full-service cost</p>") + "</div>" +
      '<div class="cards2"><div class="panel"><h4>Income</h4><table class="inv">' +
      line("Rent", inc.rent) + line("Late fees", inc.late) + line("Other charges (keys, lockouts…)", inc.other) +
      '<tfoot><tr class="due"><td>Total income</td><td class="num">' + money(inc.total) + "</td></tr></tfoot></table></div>" +
      '<div class="panel"><h4>Expenses</h4><table class="inv">' + line("Utilities (building bills paid)", ex.utilities) + line("Snow removal", ex.snow) + line("Maintenance (jobs done)", ex.maint) +
      '<tfoot><tr class="due"><td>Total expenses</td><td class="num">' + money(ex.total) + "</td></tr></tfoot></table></div></div>" +
      '<p class="sans" style="font-size:18px;margin:14px 0 0">Net for ' + monthLong(m) + ": <b>" + money(net) + "</b></p>" +
      '<h2 class="sec">Last 12 months</h2>' +
      table([{ h: "Month", first: true }, { h: "Rent", c: "num" }, { h: "Late fees", c: "num" }, { h: "Other", c: "num" }, { h: "Income", c: "num" }, { h: "Utilities", c: "num" }, { h: "Snow", c: "num" }, { h: "Maint.", c: "num" }, { h: "Expenses", c: "num" }, { h: "Net", c: "num" }],
        rows, ["12 months", money0(T.r), money0(T.l), money0(T.o), money0(T.i), money0(T.u), money0(T.s), money0(T.m), money0(T.e), money0(T.i - T.e)]) +
      '<p class="note">Not counted here: property taxes, insurance, loan payments and capital work. A real version would pull those from the books (or export to the accountant).</p>';
  }
  function csvEsc(v) { var s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function download(name, rows) {
    var text = rows.map(function (r) { return r.map(csvEsc).join(","); }).join("\r\n");
    try {
      var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast("Downloaded " + name + " (sample data).");
    } catch (e) { toast("This browser blocked the download."); }
  }

  /* ---------------- router ---------------- */
  var ROUTES = { dash: vDash, tenants: vTenants, billing: vBilling, invoice: vInvoice, pay: vPay, utilities: vUtil, ads: vAds, maint: vMaint, network: vNetwork, reports: vReports };
  var NAVKEY = { invoice: "billing" };
  var firstRender = true;
  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    var parts = h.split("/");
    return { r: parts[0], arg: parts.slice(1).join("/") };
  }
  function route() {
    var p = parseHash();
    closeBurger();
    if (p.r === "snow") { location.replace("#maint"); setTimeout(function () { var s = $("#snow"); if (s) { s.scrollIntoView(); s.focus({ preventScroll: true }); } }, 30); return; }
    if (!isSignedIn()) { showLogin(); return; }
    var fn = ROUTES[p.r];
    if (!fn) { if (p.r !== "dash") { location.replace("#dash"); if (p.r) return; } fn = vDash; p.r = "dash"; }
    $("#login").hidden = true; $("#app").hidden = false;
    var view = $("#view");
    try { view.innerHTML = fn(p.arg); }
    catch (e) { view.innerHTML = vhead("Error", "Something went wrong", "Try Reset demo data in the bar above.") ; if (window.console) console.error(e); }
    var nk = NAVKEY[p.r] || p.r;
    $$("#mnav a").forEach(function (a) {
      var on = a.getAttribute("data-r") === nk;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    navCounts();
    document.title = stripTags((view.querySelector("h1") || {}).textContent || "Manager") + " · Manager (Demo) — Rock Creek Developments";
    window.scrollTo(0, 0);
    if (!firstRender) { var h1 = view.querySelector("h1"); if (h1) h1.focus({ preventScroll: true }); }
    firstRender = false;
  }
  function navCounts() {
    var c = {
      billing: S.invoices.filter(function (i) { return status(i) === "Overdue"; }).length,
      utilities: S.utilities[addM(THIS_M, -1)] ? 0 : 1,
      ads: S.inquiries.filter(function (q) { return q.status === "New"; }).length,
      maint: S.maintenance.filter(function (x) { return x.status === "New"; }).length
    };
    var labels = { billing: "overdue", utilities: "bills to enter", ads: "new inquiries", maint: "new requests" };
    $$("#mnav a").forEach(function (a) {
      var k = a.getAttribute("data-r"), old = a.querySelector(".cnt");
      if (old) old.remove();
      if (c[k]) { var s = document.createElement("span"); s.className = "cnt"; s.textContent = c[k]; s.setAttribute("aria-label", c[k] + " " + labels[k]); a.appendChild(s); }
    });
  }
  function showLogin() {
    $("#app").hidden = true; $("#login").hidden = false;
    document.title = "Manager sign-in (Demo) — Rock Creek Developments";
  }
  function closeBurger() { var n = $("#mainNav"); if (n) n.classList.remove("open"); var b = $("#burger"); if (b) b.setAttribute("aria-expanded", "false"); }
  function rerender() { var y = window.scrollY; var a = document.activeElement && document.activeElement.id; route(); window.scrollTo(0, y); if (a && document.getElementById(a)) document.getElementById(a).focus({ preventScroll: true }); }

  /* ---------------- actions ---------------- */
  function payDialog(inv) {
    var t = tenantById(inv.tenant);
    openDlg(dlgFrame("Record a payment",
      "<p>" + esc(t ? t.name : "") + " · " + esc(inv.id) + " · balance " + money(balance(inv)) + "</p>" +
      '<div class="fgrid"><div class="field"><label for="p_amt">Amount ($)</label><input id="p_amt" name="amt" type="number" min="0.01" step="0.01" value="' + balance(inv).toFixed(2) + '" required></div>' +
      '<div class="field"><label for="p_date">Date received</label><input id="p_date" name="date" type="date" value="' + TODAY + '" required></div>' +
      '<div class="field"><label for="p_m">Method</label><select id="p_m" name="method"><option>Check</option><option>Cash</option><option>ACH</option><option>Card</option></select></div>' +
      '<div class="field"><label for="p_ref">Check # / note</label><input id="p_ref" name="ref" placeholder="optional"></div></div>' +
      '<p class="note">Records the payment in the demo only. A smaller amount leaves the rest open.</p>', "Record payment"),
      function (f) {
        var amt = r2(parseFloat(f.elements.amt.value));
        if (!(amt > 0)) return "Enter an amount above zero.";
        if (!f.elements.date.value) return "Pick the date it was received.";
        inv.payments.push({ date: f.elements.date.value, method: f.elements.method.value, amt: amt, ref: f.elements.ref.value.trim() });
        save(); rerender();
        toast(balance(inv) <= 0 ? inv.id + " marked paid (" + f.elements.method.value + ")." : "Payment recorded; " + money(balance(inv)) + " still open.");
        return true;
      });
  }
  function chargeDialog(inv) {
    var presets = [["Key replacement", 15], ["Lockout call", 75], ["Returned check fee", 35], ["Extra trash pickup", 40]];
    openDlg(dlgFrame("Add a one-off charge",
      "<p>Adds a line to " + esc(inv.id) + ". Rent already covers utilities, so this is for extras only.</p>" +
      '<div class="presets">' + presets.map(function (p) { return '<button type="button" class="btn o xs" data-act="preset" data-l="' + esc(p[0]) + '" data-a="' + p[1] + '">' + esc(p[0]) + " $" + p[1] + "</button>"; }).join("") + "</div>" +
      '<div class="fgrid"><div class="field wide"><label for="c_l">Description</label><input id="c_l" name="label" required placeholder="e.g. Key replacement (2 keys)"></div>' +
      '<div class="field"><label for="c_a">Amount ($)</label><input id="c_a" name="amt" type="number" min="0.01" step="0.01" required></div></div>', "Add charge"),
      function (f) {
        var amt = r2(parseFloat(f.elements.amt.value)), label = f.elements.label.value.trim();
        if (!label) return "Describe the charge.";
        if (!(amt > 0)) return "Enter an amount above zero.";
        inv.lines.push({ kind: "other", label: label, amt: amt });
        save(); rerender(); toast("Added " + label + " (" + money(amt) + ") to " + inv.id + ".");
        return true;
      });
  }
  var ACT = {
    dlgClose: function () { closeDlg(); },
    print: function () { try { window.print(); } catch (e) { toast("Printing is blocked here."); } },
    preset: function (el) { var f = $("#dlgBody form"); f.elements.label.value = el.getAttribute("data-l"); f.elements.amt.value = el.getAttribute("data-a"); f.elements.amt.focus(); },
    generate: function (el) {
      var m = el.getAttribute("data-m"), r = generate(S, m); save(); rerender();
      if (r.made) toast("Created " + r.made + " draft invoice" + (r.made > 1 ? "s" : "") + " for " + monthLong(m) + ". Review them, then press Send.");
      else if (r.refreshed) toast("Drafts refreshed with current rents.");
      else toast("Every tenant already has a " + monthLong(m) + " invoice.");
    },
    sendDrafts: function (el) {
      var m = el.getAttribute("data-m"), n = 0;
      S.invoices.forEach(function (i) { if (i.month === m && i.status === "Draft") { i.status = "Sent"; i.sentOn = TODAY; n++; } });
      save(); rerender(); toast(n + " invoice" + (n > 1 ? "s" : "") + " marked Sent. In the live version each tenant gets an email with a pay link; the demo sent nothing.");
    },
    sendOne: function (el) {
      var i = invById(el.getAttribute("data-id")); if (!i) return;
      i.status = "Sent"; i.sentOn = TODAY; save(); rerender(); toast(i.id + " marked Sent. (Demo: no email was sent.)");
    },
    delDraft: function (el) {
      var id = el.getAttribute("data-id");
      confirmDlg("Delete draft?", "Delete draft invoice " + esc(id) + "? You can generate it again.", "Delete", function () {
        S.invoices = S.invoices.filter(function (i) { return i.id !== id; }); save(); rerender(); toast("Draft deleted.");
      });
    },
    markPaid: function (el) { var i = invById(el.getAttribute("data-id")); if (i) payDialog(i); },
    addCharge: function (el) { var i = invById(el.getAttribute("data-id")); if (i) chargeDialog(i); },
    lateOne: function (el) {
      var i = invById(el.getAttribute("data-id")); if (!i || hasLate(i)) return;
      var l = lateLine(S, i); i.lines.push(l); save(); rerender(); toast("Late fee of " + money(l.amt) + " added to " + i.id + ".");
    },
    lateAll: function (el) {
      var m = el.getAttribute("data-m"), n = 0, amt = 0;
      S.invoices.forEach(function (i) { if (i.month === m && status(i) === "Overdue" && !hasLate(i)) { var l = lateLine(S, i); i.lines.push(l); n++; amt += l.amt; } });
      save(); rerender(); toast("Added " + n + " late fee" + (n > 1 ? "s" : "") + " (" + money(amt) + ").");
    },
    payDemo: function (el) {
      var i = invById(el.getAttribute("data-id")), how = el.getAttribute("data-how"); if (!i) return;
      openDlg(dlgFrame("Demo: no payment taken",
        "<p>This is where the tenant would go to the payment processor's secure " + (how === "ACH" ? "bank-transfer (ACH)" : "card") + " checkout, for example Stripe or the bank's ACH service. Nothing was charged and no card or bank details were asked for.</p>" +
        "<p>To show the rest of the flow, you can pretend the payment went through: the invoice is marked paid the way the processor would mark it.</p>",
        "Pretend it went through", { cancel: "Close" }),
        function () {
          i.payments.push({ date: TODAY, method: how, amt: balance(i), ref: "Demo payment (" + (how === "ACH" ? "bank" : "card") + ", not real)" });
          save(); rerender(); toast(i.id + " marked paid by the (pretend) processor.");
          return true;
        });
    },
    adReset: function (el) {
      var id = el.getAttribute("data-id"); adState(id).draft = {}; save(); rerender(); toast("Ad text reset to the drafted wording.");
    },
    copy: function (el) {
      var v = vacancies().filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (!v) return;
      var d = adDraft(v), tx = adTexts(d), which = el.getAttribute("data-which");
      var text = which === "fb" ? tx.fb : which === "mkt" ? tx.mktTitle + "\n" + d.rent + "\n\n" + tx.mktDesc : which === "cl" ? tx.clTitle + "\n\n" + tx.clBody :
        d.headline + "\n" + [d.rent, d.size, d.available].join(" · ") + "\n\n" + d.description + "\n\n" + d.features;
      copyText(text, el);
    },
    delSnow: function (el) {
      var id = el.getAttribute("data-id");
      confirmDlg("Delete entry?", "Remove this snow removal entry?", "Delete", function () { S.snow = S.snow.filter(function (x) { return x.id !== id; }); save(); rerender(); toast("Entry removed."); });
    },
    openNew: function (el, e) { e.preventDefault(); var d = $("#newReq"); if (d) { d.open = true; S.ui = S.ui || {}; var f = $("#m_issue"); if (f) f.focus(); } },
    toSnow: function (el, e) { e.preventDefault(); var s = $("#snow"); if (s) { s.scrollIntoView({ behavior: "smooth" }); s.focus({ preventScroll: true }); } },
    csvMonth: function (el) {
      var m = el.getAttribute("data-m"), i = incomeFor(m), e = expensesFor(m);
      var rows = [["Rock Creek Developments, LLC: month summary (SAMPLE DATA)", monthLong(m)], ["Section", "Category", "Amount"],
        ["Income", "Rent", i.rent], ["Income", "Late fees", i.late], ["Income", "Other charges", i.other], ["Income", "Total income", i.total],
        ["Expense", "Utilities", e.utilities], ["Expense", "Snow removal", e.snow], ["Expense", "Maintenance", e.maint], ["Expense", "Total expenses", e.total],
        ["Net", "Net", r2(i.total - e.total)], [], ["Payments received", "", ""], ["Date", "Invoice", "Tenant", "Method", "Reference", "Amount"]];
      S.invoices.forEach(function (inv) { inv.payments.forEach(function (p) { if (p.date.slice(0, 7) === m) { var t = tenantById(inv.tenant); rows.push([p.date, inv.id, t ? t.name : "", p.method, p.ref, p.amt]); } }); });
      download("rock-creek-summary-" + m + "-SAMPLE.csv", rows);
    },
    csv12: function () {
      var rows = [["Month", "Rent", "Late fees", "Other", "Income", "Utilities", "Snow removal", "Maintenance", "Expenses", "Net"]];
      monthsBetween(addM(THIS_M, -11), THIS_M).forEach(function (m) { var i = incomeFor(m), e = expensesFor(m); rows.push([m, i.rent, i.late, i.other, i.total, e.utilities, e.snow, e.maint, e.total, r2(i.total - e.total)]); });
      rows.push([], ["SAMPLE DATA from the Rock Creek Developments manager demo"]);
      download("rock-creek-12-months-SAMPLE.csv", rows);
    }
  };
  function copyText(text, el) {
    function ok() { toast("Copied. Paste it into the post."); if (el) { var o = el.textContent; el.textContent = "Copied"; setTimeout(function () { el.textContent = o; }, 1500); } }
    function fallback() {
      try {
        var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.left = "-9999px";
        document.body.appendChild(ta); ta.select(); var done = document.execCommand("copy"); ta.remove();
        if (done) ok(); else toast("Copy was blocked; select the text and copy it by hand.");
      } catch (e) { toast("Copy was blocked; select the text and copy it by hand."); }
    }
    try {
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  var CHG = {
    billMonth: function (el) { location.hash = "#billing/" + el.value; },
    repMonth: function (el) { location.hash = "#reports/" + el.value; },
    utilMonth: function (el) { location.hash = "#utilities/" + el.value; },
    payInv: function (el) { location.hash = "#pay/" + el.value; },
    inqStatus: function (el) { var q = S.inquiries.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (q) { q.status = el.value; save(); navCounts(); toast("Inquiry marked " + el.value + "."); } },
    adPublish: function (el) {
      var a = adState(el.getAttribute("data-id")); a.published = el.checked; a.publishedOn = el.checked ? TODAY : "";
      save(); navCounts();
      var n = $("#pubNote"); if (n) n.textContent = (a.published ? "On the website since " + fmtD(a.publishedOn) + "." : "Not on the website.") + " (Demo: this marks it as advertised here. The live version would switch the listing on the Properties page.)";
      toast(el.checked ? "Marked as advertised on the website listing (demo)." : "Taken off the website listing (demo).");
    },
    adPosted: function (el) { var a = adState(el.getAttribute("data-id")); a.posted = a.posted || {}; a.posted[el.getAttribute("data-ch")] = el.checked; save(); },
    mStatus: function (el) {
      var x = mById(el.getAttribute("data-id")); if (!x) return;
      x.status = el.value; if (x.status === "Done" && !x.done) x.done = TODAY; if (x.status !== "Done") x.done = "";
      save(); rerender(); toast(x.id + " is now " + x.status + ".");
    },
    mVendor: function (el) { var x = mById(el.getAttribute("data-id")); if (!x) return; x.vendor = el.value; if (x.vendor && x.status === "New") x.status = "Scheduled"; save(); rerender(); toast(x.vendor ? x.id + " assigned to " + x.vendor + "." : "Vendor cleared."); },
    mDate: function (el) { var x = mById(el.getAttribute("data-id")); if (!x) return; x.scheduled = el.value; save(); },
    mCost: function (el) { var x = mById(el.getAttribute("data-id")); if (!x) return; var v = parseFloat(el.value); x.cost = v >= 0 ? r2(v) : 0; save(); toast("Cost saved."); }
  };
  function mById(id) { return S.maintenance.filter(function (x) { return x.id === id; })[0]; }

  var FORMS = {
    tenant: function (f) {
      var id = f.getAttribute("data-id"), err = $("#tErr");
      var name = f.elements.name.value.trim(), rent = parseFloat(f.elements.rent.value), dep = parseFloat(f.elements.deposit.value) || 0, start = f.elements.start.value, end = f.elements.end.value;
      if (!name) { err.textContent = "Enter the tenant's name."; f.elements.name.focus(); return; }
      if (!(rent > 0)) { err.textContent = "Enter the monthly rent."; f.elements.rent.focus(); return; }
      if (!start || !end || end < start) { err.textContent = "Check the lease dates: the end must be after the start."; f.elements.end.focus(); return; }
      var data = { name: name, rent: r2(rent), deposit: r2(dep), start: start, end: end, note: f.elements.note.value.trim(),
        contact: { name: f.elements.cname.value.trim(), phone: f.elements.cphone.value.trim(), email: f.elements.cemail.value.trim() } };
      if (id) {
        var t = tenantById(id); Object.keys(data).forEach(function (k) { t[k] = data[k]; });
        save(); rerender(); toast("Lease saved. Future invoices use the new rent; refresh any drafts on the Billing page.");
      } else {
        var unit = f.elements.unit.value;
        if (S.tenants.some(function (t) { return t.unit === unit && t.end >= start && t.start <= end; })) { err.textContent = "That suite already has a lease covering those dates."; return; }
        data.id = "tn-" + Date.now().toString(36); data.unit = unit; data.pay = { method: "Check", day: 1, ref: "" };
        S.tenants.push(data); save(); location.hash = "#tenants/" + data.id; toast("Tenant added. Generate invoices for " + monthLong(start.slice(0, 7)) + " when you're ready.");
      }
    },
    settings: function (f) {
      var p = parseFloat(f.elements.lateFeePct.value), d = parseInt(f.elements.lateAfterDay.value, 10);
      if (!(p >= 0 && p <= 25) || !(d >= 1 && d <= 28)) { toast("Late fee must be 0-25% and the day 1-28."); return; }
      S.settings.lateFeePct = p; S.settings.lateAfterDay = d; S.settings.lateBasis = f.elements.lateBasis.value;
      S.ui = S.ui || {}; S.ui.settingsOpen = true; save(); rerender(); toast("Late fee settings saved.");
    },
    util: function (f) {
      var m = f.getAttribute("data-m"), rec = {}, err = $("#uErr"), any = false;
      for (var i = 0; i < UCATS.length; i++) {
        var raw = f.elements[UCATS[i][0]].value, v = raw === "" ? 0 : parseFloat(raw);
        if (!(v >= 0)) { err.textContent = UCATS[i][1] + " must be a number."; f.elements[UCATS[i][0]].focus(); return; }
        if (raw !== "") any = true;
        rec[UCATS[i][0]] = r2(v);
      }
      if (!any) { err.textContent = "Enter at least one bill."; f.elements.power.focus(); return; }
      rec.paid = f.elements.paid.value || TODAY; rec.note = f.elements.note.value.trim();
      S.utilities[m] = rec; save(); rerender();
      var j = jumpInfo(m);
      toast(monthLong(m) + " bills saved: " + money(uTotal(rec)) + "." + (j ? " Flag: up " + j.up + "% on the 3-month average." : ""));
    },
    ad: function () { /* live-saved; Enter does nothing */ },
    inq: function (f) {
      var name = f.elements.name.value.trim();
      if (!name || name === "Sample inquirer:") { $("#qErr").textContent = "Say who it was (a sample label is fine)."; f.elements.name.focus(); return; }
      S.inquiries.push({ id: "q" + Date.now().toString(36), unit: f.getAttribute("data-id"), date: TODAY, source: f.elements.source.value, name: name, note: f.elements.note.value.trim(), status: "New" });
      save(); rerender(); toast("Inquiry logged.");
    },
    maint: function (f) {
      var issue = f.elements.issue.value.trim();
      if (!issue) { $("#mErr").textContent = "Describe what needs doing."; f.elements.issue.focus(); return; }
      var n = S.maintenance.reduce(function (a, x) { var k = parseInt(String(x.id).replace(/\D/g, ""), 10); return k > a ? k : a; }, 1000) + 1;
      S.maintenance.push({ id: "MR-" + n, received: TODAY, unit: f.elements.unit.value, from: f.elements.from.value.trim() || "Onsite management", category: f.elements.category.value, priority: f.elements.priority.value,
        issue: issue, status: "New", vendor: "", scheduled: "", done: "", cost: 0 });
      S.ui = S.ui || {}; S.ui.newReqOpen = false;
      save(); location.hash = "#maint/new"; rerender(); toast("Request MR-" + n + " added.");
    },
    snow: function (f) {
      var cost = parseFloat(f.elements.cost.value), date = f.elements.date.value;
      if (!date) { $("#sErr").textContent = "Pick a date."; return; }
      if (!(cost >= 0)) { $("#sErr").textContent = "Enter the cost (0 is fine)."; f.elements.cost.focus(); return; }
      S.snow.push({ id: "SN-" + Date.now().toString(36), date: date, work: f.elements.work.value, who: f.elements.who.value, inches: parseFloat(f.elements.inches.value) || 0, cost: r2(cost) });
      save(); rerender(); toast("Snow removal logged for " + fmtD(date) + ".");
      setTimeout(function () { var s = $("#snow"); if (s) s.scrollIntoView(); }, 0);
    }
  };

  /* ---------------- wiring ---------------- */
  function liveAd(el) {
    var f = el.form, id = f.getAttribute("data-id"), a = adState(id);
    a.draft[el.name] = el.value;
    save();
    var v = vacancies().filter(function (x) { return x.id === id; })[0];
    if (v) $("#previews").innerHTML = previewsHTML(v, adDraft(v));
  }
  function liveUtil(el) {
    var f = el.form, t = 0;
    UCATS.forEach(function (c) { t += parseFloat(f.elements[c[0]].value) || 0; });
    $("#uTot").textContent = money(t); $("#uSq").textContent = "$" + (t / buildingSqft()).toFixed(3);
  }

  function init() {
    load();
    $("#storeWarn").hidden = storageOk;
    $("#enterBtn").addEventListener("click", function () {
      setSignedIn(true);
      var p = parseHash();
      if (!p.r || p.r === "login" || !ROUTES[p.r]) location.hash = "#dash"; else route();
      var h = $("#view h1"); if (h) h.focus({ preventScroll: true });
    });
    $("#signOutBtn").addEventListener("click", function () { setSignedIn(false); showLogin(); location.hash = "#login"; $("#enterBtn").focus(); toast("Signed out of the demo."); });
    $("#resetBtn").addEventListener("click", function () {
      confirmDlg("Reset demo data?", "This puts back the original sample tenants, invoices, bills, ads and requests, and throws away changes made in this browser.", "Reset", function () {
        try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
        S = seed(); save(); route(); toast("Demo data reset.");
      });
    });
    var burger = $("#burger");
    burger.addEventListener("click", function () { var n = $("#mainNav"); var open = n.classList.toggle("open"); burger.setAttribute("aria-expanded", open ? "true" : "false"); });

    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!el) return;
      var fn = ACT[el.getAttribute("data-act")];
      if (fn) fn(el, e);
    });
    document.addEventListener("change", function (e) {
      var el = e.target, k = el.getAttribute && el.getAttribute("data-chg");
      if (k && CHG[k]) CHG[k](el, e);
    });
    document.addEventListener("input", function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-live");
      if (k === "ad") liveAd(e.target);
      else if (k === "util") liveUtil(e.target);
    });
    document.addEventListener("submit", function (e) {
      var f = e.target;
      if (f.hasAttribute("data-dlgform")) {
        e.preventDefault();
        if (!dlgHandler) { closeDlg(); return; }
        var r = dlgHandler(f);
        if (r === true) closeDlg(); else if (typeof r === "string") $("#dlgErr").textContent = r;
        return;
      }
      var k = f.getAttribute("data-form");
      if (k && FORMS[k]) { e.preventDefault(); var er = f.querySelector(".ferr"); if (er) er.textContent = ""; FORMS[k](f); }
    });
    document.addEventListener("toggle", function (e) {
      if (e.target.id === "setPanel") { S.ui = S.ui || {}; S.ui.settingsOpen = e.target.open; }
      if (e.target.id === "newReq") { S.ui = S.ui || {}; S.ui.newReqOpen = e.target.open; }
    }, true);
    $("#dlg").addEventListener("close", onDlgClosed);
    $("#dlg").addEventListener("click", function (e) { if (e.target === this) closeDlg(); }); // click on the backdrop
    window.addEventListener("hashchange", route);
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
