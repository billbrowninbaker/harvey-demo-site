/* Manager demo: one page with rent, suites and repairs.
   Everything is saved in this browser only (localStorage). */
(function () {
  "use strict";
  var KEY = "rcd-manager-simple-v3";
  var SIGNED_IN = "rcd-manager-signed-in";
  var $ = function (id) { return document.getElementById(id); };
  var data, canSave = true;
  var today = new Date();
  var viewMonth = monthKey(today);

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function monthKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function todayStr() { return monthKey(today) + "-" + pad(today.getDate()); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function shortDate(s) { if (!s) return ""; var p = s.split("-"); return +p[1] + "/" + +p[2] + "/" + p[0].slice(2); }
  function monthName(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" }); }
  function shiftMonth(k, n) { var p = k.split("-"); return monthKey(new Date(+p[0], +p[1] - 1 + n, 1)); }
  function daysUntil(s) { return Math.round((new Date(s + "T00:00:00") - new Date(todayStr() + "T00:00:00")) / 864e5); }
  function suiteById(id) { return data.suites.filter(function (x) { return x.id === id; })[0]; }
  function suiteName(id) { var s = suiteById(id); return s ? s.suite : "Common area"; }
  // tenants who owed rent in a month (a tenant entered later has `since`, their first month)
  function renters(m) { return data.suites.filter(function (s) { return s.tenant && s.rent > 0 && (!s.since || s.since <= m); }); }

  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { data = JSON.parse(raw); return; } } catch (e) { canSave = false; }
    data = window.RCD_MGR_SEED(today);
  }
  function save() {
    if (canSave) { try { localStorage.setItem(KEY, JSON.stringify(data)); return; } catch (e) { canSave = false; } }
    $("storeWarn").hidden = false;
  }
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast.timer); toast.timer = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }

  /* ---------- summary ---------- */
  function tile(big, label, warn) { return '<div class="tile' + (warn ? " warn" : "") + '"><b>' + big + "</b><span>" + label + "</span></div>"; }
  function renderSummary() {
    var paid = data.paid[monthKey(today)] || {}, due = 0, got = 0, unpaid = 0;
    renters(monthKey(today)).forEach(function (s) { due += s.rent; if (paid[s.id]) got += s.rent; else unpaid++; });
    var vacant = data.suites.filter(function (s) { return !s.tenant; }).length;
    var open = data.todo.filter(function (t) { return !t.done; }).length;
    $("summary").innerHTML =
      tile(money(got) + " <small>of " + money(due) + "</small>", "Rent collected this month") +
      tile(unpaid, unpaid === 1 ? "Tenant hasn't paid" : "Tenants haven't paid", unpaid > 0) +
      tile(vacant, vacant === 1 ? "Empty suite" : "Empty suites") +
      tile(open, open === 1 ? "Repair to do" : "Repairs to do", open > 0);
  }

  /* ---------- rent ---------- */
  function renderRent() {
    $("rentMonth").textContent = monthName(viewMonth);
    $("nextMonth").disabled = viewMonth >= monthKey(today);
    var paid = data.paid[viewMonth] || {};
    $("rentRows").innerHTML = renters(viewMonth).map(function (s) {
      var when = paid[s.id];
      var status = when
        ? '<span class="pill ok">Paid ' + shortDate(when) + '</span> <button type="button" class="linkbtn" data-unpay="' + s.id + '">undo</button>'
        : '<span class="pill bad">Not paid</span> <button type="button" class="btn xs n" data-pay="' + s.id + '">Mark paid</button>';
      return "<tr><td>" + esc(s.suite) + "</td><td>" + esc(s.tenant) + '</td><td class="num">' + money(s.rent) + "</td><td>" + status + "</td></tr>";
    }).join("");
  }

  /* ---------- suites ---------- */
  function renderSuites() {
    $("suiteRows").innerHTML = data.suites.map(function (s) {
      var tenant = s.tenant
        ? esc(s.tenant) + (s.phone ? '<div class="muted sm">' + esc(s.phone) + "</div>" : "")
        : '<span class="pill gold">Empty</span>';
      var lease = "";
      if (s.leaseEnd) {
        var d = daysUntil(s.leaseEnd);
        lease = shortDate(s.leaseEnd) + (d < 0 ? ' <span class="pill bad">ended</span>' : d <= 90 ? ' <span class="pill gold">' + d + " days</span>" : "");
      }
      return "<tr><td>" + esc(s.suite) + '<div class="muted sm">' + s.sqft.toLocaleString("en-US") + " sq ft</div></td><td>" + tenant +
        '</td><td class="num">' + (s.rent ? money(s.rent) : "") + "</td><td>" + lease +
        '</td><td><button type="button" class="linkbtn" data-edit="' + s.id + '">Edit</button></td></tr>';
    }).join("");
  }
  function openEdit(id) {
    var s = suiteById(id), f = $("editForm");
    f.dataset.id = id;
    $("editTitle").textContent = s.suite + " · " + s.sqft.toLocaleString("en-US") + " sq ft";
    f.tenant.value = s.tenant; f.phone.value = s.phone || ""; f.rent.value = s.rent || ""; f.leaseEnd.value = s.leaseEnd || "";
    $("dlg").showModal();
    f.tenant.focus();
  }
  function saveEdit(e) {
    e.preventDefault();
    var f = e.target, s = suiteById(f.dataset.id), name = f.tenant.value.trim();
    if (name && name !== s.tenant) s.since = monthKey(today);
    s.tenant = name;
    s.phone = s.tenant ? f.phone.value.trim() : "";
    s.rent = s.tenant ? Math.max(0, +f.rent.value || 0) : 0;
    s.leaseEnd = s.tenant ? f.leaseEnd.value : "";
    save(); $("dlg").close(); render(); toast(s.suite + " saved");
  }

  /* ---------- repairs ---------- */
  function renderTodo() {
    var open = data.todo.filter(function (t) { return !t.done; });
    var done = data.todo.filter(function (t) { return t.done; }).sort(function (a, b) { return a.done < b.done ? 1 : -1; }).slice(0, 5);
    function row(t) {
      return '<li class="' + (t.done ? "done" : "") + '"><label><input type="checkbox" data-todo="' + t.id + '"' + (t.done ? " checked" : "") + "> " +
        "<span>" + esc(t.text) + '<span class="muted sm">' + esc(suiteName(t.suite)) + " · added " + shortDate(t.added) +
        (t.done ? " · done " + shortDate(t.done) : "") + "</span></span></label></li>";
    }
    $("todoOpen").innerHTML = open.length ? open.map(row).join("") : '<li class="muted">Nothing to fix right now.</li>';
    $("todoDone").innerHTML = done.map(row).join("");
    $("doneWrap").hidden = !done.length;
  }
  function addTodo(e) {
    e.preventDefault();
    var f = e.target, text = f.text.value.trim();
    if (!text) return;
    data.todo.unshift({ id: data.nextId++, text: text, suite: f.suite.value, added: todayStr(), done: "" });
    f.text.value = ""; save(); render(); toast("Added to the repair list");
  }

  function render() { renderSummary(); renderRent(); renderSuites(); renderTodo(); }

  /* ---------- wiring ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.pay) {
      (data.paid[viewMonth] = data.paid[viewMonth] || {})[b.dataset.pay] = viewMonth === monthKey(today) ? todayStr() : viewMonth + "-01";
      save(); render(); toast("Marked paid");
    } else if (b.dataset.unpay) {
      delete (data.paid[viewMonth] || {})[b.dataset.unpay]; save(); render();
    } else if (b.dataset.edit) openEdit(b.dataset.edit);
  });
  document.addEventListener("change", function (e) {
    var id = e.target.dataset.todo;
    if (!id) return;
    data.todo.forEach(function (t) { if (String(t.id) === id) t.done = e.target.checked ? todayStr() : ""; });
    save(); render();
  });
  $("prevMonth").onclick = function () { viewMonth = shiftMonth(viewMonth, -1); renderRent(); };
  $("nextMonth").onclick = function () { viewMonth = shiftMonth(viewMonth, 1); renderRent(); };
  $("editForm").onsubmit = saveEdit;
  $("cancelEdit").onclick = function () { $("dlg").close(); };
  $("vacateBtn").onclick = function () { var f = $("editForm"); f.tenant.value = f.phone.value = f.rent.value = f.leaseEnd.value = ""; f.tenant.focus(); };
  $("todoForm").onsubmit = addTodo;
  $("resetBtn").onclick = function () {
    if (!confirm("Put the sample data back? Your changes in this demo will be lost.")) return;
    data = window.RCD_MGR_SEED(today); viewMonth = monthKey(today); save(); render(); toast("Sample data restored");
  };

  function signIn(on) {
    try { if (on) sessionStorage.setItem(SIGNED_IN, "1"); else sessionStorage.removeItem(SIGNED_IN); } catch (e) {}
    $("login").hidden = on; $("app").hidden = !on;
    if (on) render();
  }
  $("enterBtn").onclick = function () { signIn(true); };
  $("signOutBtn").onclick = function () { signIn(false); };

  var burger = $("burger"), nav = $("mainNav");
  burger.onclick = function () { burger.setAttribute("aria-expanded", nav.classList.toggle("open")); };

  load();
  $("todoForm").suite.innerHTML = '<option value="">Common area</option>' +
    data.suites.map(function (s) { return '<option value="' + s.id + '">' + esc(s.suite) + "</option>"; }).join("");
  var signedIn = false;
  try { signedIn = sessionStorage.getItem(SIGNED_IN) === "1"; } catch (e) {}
  signIn(signedIn);
})();
