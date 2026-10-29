/* Properties demo: listings + map, detail pages (#p/<id>), and a browser-only admin (#admin).
   No network calls except Leaflet (loaded in index.html) and OpenStreetMap tiles. */
(function () {
  "use strict";

  var KEY = "rcd-properties-demo-v1";
  var SAMPLES = window.RCD_SAMPLE_LISTINGS || [];
  var PH = window.RCD_PH || function () { return ""; };
  var HAS_L = typeof window.L !== "undefined" && !!window.L.map;
  var CENTER = [44.7749, -117.8344];
  var TYPES = ["Office", "Retail", "Warehouse/Industrial", "Residential"];
  var STATUSES = ["available", "coming", "leased"];
  var PIN_COLOR = { available: "#2f7a3a", coming: "#c98a1b", leased: "#7c8590" };
  var TEXT_FIELDS = ["name", "type", "suite", "area", "status", "availableDate", "leaseType", "camNote", "deposit", "minTerm", "utilities",
    "description", "zoning", "parking", "ada", "restrooms", "hvac", "power", "internet", "ceiling", "loading", "signage", "i84", "nearby",
    "beds", "baths", "pets", "appliances", "laundry", "videoUrl", "tourUrl"];
  var NUM_FIELDS = ["sqft", "rent", "camPsf", "lat", "lng"];
  var SAMPLE_PHOTOS = [
    { src: "../img/work1.jpg", caption: "Building exterior" },
    { src: "../img/work2.jpg", caption: "House exterior" },
    { src: "../img/work3.jpg", caption: "Covered porch" },
    { src: "../img/hero.jpg", caption: "The Elkhorn Mountains" },
    { src: "ph:office", caption: "Office interior" },
    { src: "ph:interior", caption: "Room interior" },
    { src: "ph:storefront", caption: "Storefront" },
    { src: "ph:warehouse", caption: "Warehouse exterior" },
    { src: "ph:warehouse-int", caption: "Warehouse interior" },
    { src: "ph:apartment", caption: "Apartment building" },
    { src: "ph:kitchen", caption: "Kitchen" }
  ];

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function money2(n) { return "$" + n.toFixed(2); }
  function sqft(n) { return Math.round(n).toLocaleString("en-US") + " sq ft"; }
  function isoOk(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function fmtDate(iso) {
    if (!isoOk(iso)) return "";
    var a = iso.split("-");
    return new Date(+a[0], +a[1] - 1, +a[2]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function todayIso() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function slug(s) { return String(s || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "listing"; }
  function safeSrc(s) {
    return typeof s === "string" && (
      /^data:image\/[a-z0-9.+-]+[;,]/i.test(s) ||
      /^ph:[a-z-]+$/.test(s) ||
      /^\.\.\/img\/[\w.-]+\.(jpe?g|png|webp|gif)$/i.test(s));
  }
  function safeUrl(s) { return typeof s === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(s.trim()) ? s.trim() : ""; }
  var phCache = {};
  function imgSrc(src) {
    if (typeof src === "string" && src.indexOf("ph:") === 0) return phCache[src] || (phCache[src] = PH(src.slice(3)));
    return src;
  }
  function isRes(p) { return p.type === "Residential"; }
  function statusLabel(p) {
    if (p.status === "available") return "Available now";
    if (p.status === "coming") return p.availableDate ? "Available " + fmtDate(p.availableDate) : "Coming soon";
    return "Leased";
  }
  function badge(p) { return '<span class="badge ' + p.status + '">' + esc(statusLabel(p)) + "</span>"; }
  function psfYear(p) { return p.sqft > 0 ? p.rent * 12 / p.sqft : null; }
  function cover(p) { return p.photos[0] || { src: "ph:interior", caption: "No photo yet", sample: true }; }
  function flagText(ph) { return ph.sample ? "SAMPLE PHOTO" : "UPLOADED PHOTO"; }
  function dirUrl(p) { return "https://www.google.com/maps/dir/?api=1&destination=" + p.lat.toFixed(5) + "," + p.lng.toFixed(5); }
  function shareUrl(p) { return location.href.split("#")[0] + "#p/" + encodeURIComponent(p.id); }
  function byId(id) { for (var i = 0; i < props.length; i++) if (props[i].id === id) return props[i]; return null; }

  var toastT;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("on"); }, 3600);
  }

  /* ---------- data + storage ---------- */
  function normalize(raw) {
    var p = {};
    raw = raw && typeof raw === "object" ? raw : {};
    TEXT_FIELDS.forEach(function (k) { p[k] = raw[k] == null ? "" : String(raw[k]).slice(0, 4000); });
    NUM_FIELDS.forEach(function (k) { p[k] = num(raw[k], 0); });
    p.id = slug(raw.id || raw.name);
    if (TYPES.indexOf(p.type) < 0) p.type = "Office";
    if (STATUSES.indexOf(p.status) < 0) p.status = "available";
    if (!isoOk(p.availableDate)) p.availableDate = "";
    p.name = p.name.trim() || "Untitled listing";
    p.sqft = Math.max(0, p.sqft); p.rent = Math.max(0, p.rent); p.camPsf = Math.max(0, p.camPsf);
    if (!(p.lat >= -90 && p.lat <= 90 && p.lat !== 0)) p.lat = CENTER[0];
    if (!(p.lng >= -180 && p.lng <= 180 && p.lng !== 0)) p.lng = CENTER[1];
    p.videoUrl = safeUrl(p.videoUrl); p.tourUrl = safeUrl(p.tourUrl);
    var hl = raw.highlights;
    if (typeof hl === "string") hl = hl.split(/\n/);
    p.highlights = (Array.isArray(hl) ? hl : []).map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 30);
    p.photos = (Array.isArray(raw.photos) ? raw.photos : []).filter(function (ph) { return ph && safeSrc(ph.src); })
      .map(function (ph) { return { src: ph.src, caption: String(ph.caption || "").slice(0, 200), sample: !!ph.sample }; }).slice(0, 40);
    p.floorplan = safeSrc(raw.floorplan) ? raw.floorplan : "";
    return p;
  }
  function uniqueIds(list) {
    var seen = {};
    list.forEach(function (p) {
      var base = p.id, n = 2;
      while (seen[p.id]) p.id = base + "-" + n++;
      seen[p.id] = true;
    });
    return list;
  }
  var storageOk = true;
  function load() {
    try {
      var s = localStorage.getItem(KEY);
      if (s) {
        var a = JSON.parse(s);
        if (Array.isArray(a)) return uniqueIds(a.map(normalize));
      }
    } catch (e) { storageOk = false; }
    return uniqueIds(clone(SAMPLES).map(normalize));
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(props)); storageOk = true; return true; }
    catch (e) { storageOk = false; return false; }
  }
  function clearStore() { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked: nothing to clear */ } }
  var props = load();

  /* ---------- filters ---------- */
  var F = { q: "", type: "all", avail: "any", size: "any", sort: "avail" };
  function matches(p) {
    if (F.type !== "all" && p.type !== F.type) return false;
    if (F.avail === "now" && p.status !== "available") return false;
    if (F.avail === "open" && p.status === "leased") return false;
    if (F.avail === "coming" && p.status !== "coming") return false;
    if (F.avail === "leased" && p.status !== "leased") return false;
    if (F.size !== "any") {
      var r = F.size.split("-"), lo = num(r[0], 0), hi = r[1] === "" ? Infinity : num(r[1], Infinity);
      if (p.sqft < lo || p.sqft > hi) return false;
    }
    if (F.q) {
      var hay = [p.name, p.type, p.suite, p.area, p.description, p.nearby, p.leaseType, p.highlights.join(" "), statusLabel(p)].join(" ").toLowerCase();
      var words = F.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return false;
    }
    return true;
  }
  function availRank(p) {
    if (p.status === "available") return 0;
    if (p.status === "coming") return p.availableDate ? 1 + new Date(p.availableDate).getTime() / 1e13 : 2;
    return 3;
  }
  function sorted(list) {
    var by = {
      "avail": function (a, b) { return availRank(a) - availRank(b) || a.name.localeCompare(b.name); },
      "size-asc": function (a, b) { return a.sqft - b.sqft; },
      "size-desc": function (a, b) { return b.sqft - a.sqft; },
      "rent-asc": function (a, b) { return a.rent - b.rent; },
      "rent-desc": function (a, b) { return b.rent - a.rent; }
    }[F.sort];
    return list.slice().sort(by);
  }

  /* ---------- big map ---------- */
  var map = null, layer = null, markers = {}, needFit = true, selected = null;
  function pinIcon(status) {
    return L.divIcon({
      className: "pin-wrap",
      html: '<svg class="pin" viewBox="0 0 30 42" aria-hidden="true"><path class="body" d="M15 1C7.3 1 1 7.2 1 14.9 1 25.4 15 41 15 41s14-15.6 14-26.1C29 7.2 22.7 1 15 1Z" fill="' +
        PIN_COLOR[status] + '" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>',
      iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40]
    });
  }
  function tiles(m) {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(m);
  }
  function mapOff(el, msg) {
    el.innerHTML = '<div class="map-off">' + esc(msg || "The map could not load (no connection to the map service). The listings still work.") + "</div>";
  }
  function initMap() {
    if (map) { map.invalidateSize(); return; }
    if (!HAS_L) { mapOff($("#map")); return; }
    map = L.map("map", { zoomControl: true, scrollWheelZoom: true }).setView(CENTER, 14);
    tiles(map);
    layer = L.layerGroup().addTo(map);
  }
  function popupEl(p) {
    var d = document.createElement("div");
    d.className = "pop";
    d.innerHTML = '<span class="stag">SAMPLE LISTING</span> ' + badge(p) + "<h4>" + esc(p.name) + "</h4>" +
      '<div class="pr">' + esc(p.type) + " · " + sqft(p.sqft) + " · " + money(p.rent) + "/mo</div>" +
      '<a class="btn n" href="#p/' + encodeURIComponent(p.id) + '">View details →</a>';
    return d;
  }
  function drawMarkers(vis) {
    if (!map) return;
    layer.clearLayers();
    markers = {};
    vis.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(p.status), title: p.name + " (" + statusLabel(p) + ")", keyboard: true, riseOnHover: true });
      m.bindPopup(popupEl(p), { autoPanPadding: [30, 30] });
      m.on("click", function () { select(p.id, { fromPin: true }); });
      m.addTo(layer);
      markers[p.id] = m;
    });
    markSel();
  }
  function fit(vis) {
    if (!map || !vis.length) return;
    map.stop();
    if (vis.length === 1) { map.setView([vis[0].lat, vis[0].lng], 15, { animate: false }); return; }
    map.fitBounds(L.latLngBounds(vis.map(function (p) { return [p.lat, p.lng]; })), { padding: [40, 40], maxZoom: 15, animate: false });
  }
  function markSel() {
    Object.keys(markers).forEach(function (k) {
      var el = markers[k].getElement();
      if (el) el.classList.toggle("sel", k === selected);
    });
  }
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top >= 60 && r.bottom <= (window.innerHeight || 800);
  }
  function select(id, o) {
    o = o || {};
    selected = id;
    $$(".pcard").forEach(function (c) { c.classList.toggle("sel", c.dataset.id === id); });
    markSel();
    var m = markers[id];
    if (o.fly && m && map) {
      var box = $("#mapBox");
      if (!inView(box)) box.scrollIntoView({ behavior: "smooth", block: "start" });
      var ll = m.getLatLng(), z = Math.max(map.getZoom(), 15);
      if (map.getCenter().distanceTo(ll) < 5 && map.getZoom() === z) m.openPopup();
      else {
        map.closePopup();
        map.once("moveend", function () { if (selected === id) m.openPopup(); });
        map.flyTo(ll, z, { duration: 0.7 });
      }
    }
    if (o.fromPin) {
      var card = $('.pcard[data-id="' + cssEsc(id) + '"]');
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }

  /* ---------- listings view ---------- */
  function cardHtml(p) {
    var c = cover(p), y = psfYear(p);
    return '<article class="pcard' + (p.id === selected ? " sel" : "") + '" data-id="' + esc(p.id) + '" tabindex="0" aria-label="' + esc(p.name + ", " + statusLabel(p) + ". Press Enter to show on the map.") + '">' +
      '<div class="ph"><img src="' + esc(imgSrc(c.src)) + '" alt="" loading="lazy"><span class="flag">' + flagText(c) + '</span><span class="stag">SAMPLE LISTING</span>' + badge(p) + "</div>" +
      '<div class="tx"><div class="k">' + esc(p.type === "Warehouse/Industrial" ? "Warehouse / Industrial" : p.type) + (p.suite ? " · " + esc(p.suite) : "") + "</div>" +
      '<h3><a href="#p/' + encodeURIComponent(p.id) + '">' + esc(p.name) + "</a></h3>" +
      '<div class="area">' + esc(p.area) + "</div>" +
      '<div class="nums"><span><b>' + money(p.rent) + "</b>/mo</span><span>" + sqft(p.sqft) + "</span>" +
      (isRes(p) ? (p.beds ? "<span>" + esc(p.beds) + " bd · " + esc(p.baths || "?") + " ba</span>" : "") : (y ? "<span>" + money2(y) + "/sf/yr</span>" : "")) + "</div>" +
      '<div class="foot"><span class="onmap">' + (HAS_L ? "Click to show on map" : "") + '</span><a class="btn n" href="#p/' + encodeURIComponent(p.id) + '">View details</a></div>' +
      "</div></article>";
  }
  function renderList() {
    var vis = sorted(props.filter(matches));
    $("#cards").innerHTML = vis.map(cardHtml).join("");
    $("#empty").hidden = vis.length > 0;
    var avail = props.filter(function (p) { return p.status === "available"; }).length;
    $("#count").textContent = "Showing " + vis.length + " of " + props.length + " properties · " + avail + " available now";
    var filtered = F.q || F.type !== "all" || F.avail !== "any" || F.size !== "any";
    $("#clearF").hidden = !filtered;
    drawMarkers(vis);
    if (needFit) { fit(vis); needFit = false; }
    $$(".pcard").forEach(function (c) {
      var id = c.dataset.id;
      c.addEventListener("mouseenter", function () { hov(id, true); });
      c.addEventListener("mouseleave", function () { hov(id, false); });
    });
  }
  function hov(id, on) {
    var m = markers[id], el = m && m.getElement();
    if (el) { el.classList.toggle("hov", on); m.setZIndexOffset(on ? 1000 : 0); }
  }
  function filtersChanged() { needFit = true; renderList(); }

  var qT;
  $("#fq").addEventListener("input", function (e) { clearTimeout(qT); qT = setTimeout(function () { F.q = e.target.value.trim(); filtersChanged(); }, 180); });
  $("#fa").addEventListener("change", function (e) { F.avail = e.target.value; filtersChanged(); });
  $("#fs").addEventListener("change", function (e) { F.size = e.target.value; filtersChanged(); });
  $("#fo").addEventListener("change", function (e) { F.sort = e.target.value; renderList(); });
  $$(".chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      F.type = b.dataset.type;
      $$(".chips button").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      filtersChanged();
    });
  });
  function clearFilters() {
    F.q = ""; F.type = "all"; F.avail = "any"; F.size = "any";
    $("#fq").value = ""; $("#fa").value = "any"; $("#fs").value = "any";
    $$(".chips button").forEach(function (x) { var on = x.dataset.type === "all"; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
    filtersChanged();
  }
  $("#clearF").addEventListener("click", clearFilters);
  $("#clearF2").addEventListener("click", clearFilters);
  $("#cards").addEventListener("click", function (e) {
    if (e.target.closest("a")) return;
    var c = e.target.closest(".pcard");
    if (c) select(c.dataset.id, { fly: true });
  });
  $("#cards").addEventListener("keydown", function (e) {
    var c = e.target;
    if (!c.classList || !c.classList.contains("pcard")) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(c.dataset.id, { fly: true }); }
  });

  /* ---------- detail view ---------- */
  var mini = null, miniMarker = null, curDetail = null;
  function row(label, val) { return val === "" || val == null ? "" : "<div><dt>" + esc(label) + "</dt><dd>" + val + "</dd></div>"; }
  function rowT(label, val) { return row(label, val ? esc(val) : ""); }
  var LEASE_HELP = {
    "NNN": "NNN (triple net): base rent plus the tenant's share of property taxes, building insurance and common-area maintenance (CAM).",
    "Gross": "Gross: one rent amount; the landlord pays property taxes, insurance and maintenance.",
    "Modified gross": "Modified gross: in between. Some building costs are in the rent and some are split; see the CAM line.",
    "Residential lease": "Standard residential rental agreement under Oregon landlord-tenant law."
  };
  function slotIcon(kind) {
    var d = { video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>', tour: '<path d="M12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>', plan: '<rect x="3" y="3" width="18" height="18"/><path d="M3 12h8V3M11 21v-5h10"/>' }[kind];
    return '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1c2f45" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }
  function renderDetail(id) {
    var p = byId(id);
    curDetail = p;
    var body = $("#detailBody"), main = $("#detailMain"), grid = $(".dgrid");
    if (!p) {
      document.title = "Listing not found — Properties (Demo)";
      $("#crumbName").textContent = "Not found";
      body.innerHTML = '<div class="empty" style="margin:30px 0"><p>That listing isn\'t here. It may have been removed, or it was added in a different browser.</p><a class="btn n sm" href="#">See all properties</a></div>';
      main.innerHTML = "";
      grid.hidden = true;
      return;
    }
    grid.hidden = false;
    document.title = p.name + " — Properties (Demo)";
    $("#crumbName").textContent = p.name;
    var y = psfYear(p), res = isRes(p), typeName = p.type === "Warehouse/Industrial" ? "Warehouse / Industrial" : p.type;
    var ph = p.photos.length ? p.photos : [cover(p)];

    var gal;
    if (ph.length === 1) {
      gal = '<div class="gallery" style="grid-template-columns:1fr">' + gBtn(ph[0], 0, "gmain", ph.length) + "</div>";
    } else {
      gal = '<div class="gallery">' + gBtn(ph[0], 0, "gmain", ph.length) + '<div class="gside">' +
        gBtn(ph[1], 1, "gthumb") + (ph[2] ? gBtn(ph[2], 2, "gthumb", 0, ph.length > 3 ? "+" + (ph.length - 3) + " more" : "") : "") + "</div></div>";
    }
    var avail = p.status === "available" ? "Now" : p.status === "coming" ? (p.availableDate ? fmtDate(p.availableDate) : "Coming soon") : "Leased";
    body.innerHTML =
      '<div class="dtitle"><div>' +
      '<div class="tagrow"><span class="stag">SAMPLE LISTING</span>' + badge(p) + '<span class="k">' + esc(typeName) + "</span></div>" +
      "<h1>" + esc(p.name) + "</h1>" +
      '<div class="sub">' + esc([p.suite, p.area, "Baker City, Oregon"].filter(Boolean).join(" · ")) + "</div></div>" +
      '<div class="dactions"><a class="btn o sm" href="#">← All properties</a>' +
      '<button type="button" class="btn o sm" data-act="share">Share link</button>' +
      '<button type="button" class="btn o sm" data-act="print">Print flyer</button>' +
      '<a class="btn n sm" href="' + esc(dirUrl(p)) + '" target="_blank" rel="noopener">Get directions ↗</a></div>' +
      '<div class="sharebox" id="shareBox" hidden><label for="shareUrl" class="vh">Link to this listing</label><input id="shareUrl" readonly value="' + esc(shareUrl(p)) + '"><button type="button" class="btn o sm" data-act="copy">Copy</button></div>' +
      "</div>" + gal +
      '<div class="keyfacts">' +
      '<div class="kf"><b>' + money(p.rent) + "</b><span>per month" + (p.camPsf > 0 ? " + CAM" : "") + "</span></div>" +
      (res ? '<div class="kf"><b>' + esc((p.beds || "?") + " bd / " + (p.baths || "?") + " ba") + "</b><span>bedrooms / baths</span></div>"
        : '<div class="kf"><b>' + (y ? money2(y) : "—") + "</b><span>per sq ft / year" + (y ? " (" + money2(y / 12) + "/mo)" : "") + "</span></div>") +
      '<div class="kf"><b>' + Math.round(p.sqft).toLocaleString("en-US") + "</b><span>square feet</span></div>" +
      '<div class="kf"><b>' + esc(avail) + "</b><span>available</span></div></div>";

    // main column
    var html = "";
    html += '<section class="dsec"><h2>About this ' + (res ? "home" : "space") + "</h2>" +
      (p.status === "leased" ? '<div class="leased-note">This ' + (res ? "home" : "space") + " is leased right now. Use the form to ask to hear when it, or one like it, opens up.</div>" : "") +
      (p.description ? "<p>" + esc(p.description).replace(/\n+/g, "</p><p>") + "</p>" : "") +
      (p.highlights.length ? '<ul class="ticks">' + p.highlights.map(function (h) { return '<li><span class="ck">✓</span>' + esc(h) + "</li>"; }).join("") + "</ul>" : "") +
      "</section>";

    var cam = "";
    if (p.camPsf > 0) cam = money2(p.camPsf) + " / sq ft / month, about " + money(p.camPsf * p.sqft) + "/mo" + (p.camNote ? ". " + esc(p.camNote) : "");
    else if (p.camNote) cam = esc(p.camNote);
    else if (!res) cam = "None listed";
    html += '<section class="dsec"><h2>Rent &amp; lease terms</h2><dl class="specs">' +
      row("Rent", money(p.rent) + " / month") +
      (res ? "" : row("Rent per sq ft", y ? money2(y) + " / year (" + money2(y / 12) + " / month)" : "")) +
      rowT("Lease type", p.leaseType) +
      (res ? "" : row("CAM / common area", cam)) +
      (p.camPsf > 0 ? row("Est. monthly total", "<b>" + money(p.rent + p.camPsf * p.sqft) + "</b> (rent + CAM, before utilities)") : "") +
      rowT("Deposit", p.deposit) +
      rowT("Minimum term", p.minTerm) +
      rowT("Available", statusLabel(p)) +
      rowT("Utilities", p.utilities) +
      "</dl>" + (LEASE_HELP[p.leaseType] ? '<p class="explain">' + esc(LEASE_HELP[p.leaseType]) + "</p>" : "") + "</section>";

    if (res) {
      html += '<section class="dsec"><h2>The home</h2><dl class="specs">' +
        rowT("Bedrooms", p.beds) + rowT("Bathrooms", p.baths) + rowT("Square feet", sqft(p.sqft)) + rowT("Unit", p.suite) +
        rowT("Pets", p.pets) + rowT("Appliances", p.appliances) + rowT("Laundry", p.laundry) + rowT("Heating / cooling", p.hvac) +
        rowT("Parking", p.parking) + rowT("Internet", p.internet) + rowT("Accessibility", p.ada) + "</dl></section>";
    } else {
      html += '<section class="dsec"><h2>The space &amp; building</h2><dl class="specs">' +
        rowT("Suite / unit", p.suite) + rowT("Square feet", sqft(p.sqft)) + rowT("Ceiling height", p.ceiling) +
        rowT("Restrooms", p.restrooms) + rowT("Heating / cooling", p.hvac) + rowT("Power", p.power) +
        rowT("Internet / fiber", p.internet) + rowT("ADA access", p.ada) + rowT("Loading / doors", p.loading) +
        rowT("Parking", p.parking) + rowT("Signage", p.signage) + "</dl></section>";
    }
    html += '<section class="dsec"><h2>Location &amp; access</h2><dl class="specs">' +
      rowT("Area", /baker city/i.test(p.area) ? p.area : p.area + ", Baker City") + rowT("Zoning", p.zoning) + rowT("To I-84", p.i84) + rowT("Nearby", p.nearby) +
      "</dl><p class=\"explain\">Sample listings show a general area only. The real listing would give the address once a showing is set.</p></section>";

    html += '<section class="dsec tours-sec"><h2>Tours &amp; floor plan</h2><div class="slots">' +
      '<div class="slot">' + slotIcon("video") + "<b>Video tour goes here</b>" +
      (p.videoUrl ? '<a class="btn o sm" href="' + esc(p.videoUrl) + '" target="_blank" rel="noopener">Open video tour ↗</a>' : "<span>A walk-through video of the space</span>") + "</div>" +
      '<div class="slot">' + slotIcon("tour") + "<b>3D tour goes here</b>" +
      (p.tourUrl ? '<a class="btn o sm" href="' + esc(p.tourUrl) + '" target="_blank" rel="noopener">Open 3D tour ↗</a>' : "<span>A click-through 3D model</span>") + "</div>" +
      (p.floorplan ? '<button type="button" class="slot has-img" data-fp="1" aria-label="Open the floor plan"><img src="' + esc(imgSrc(p.floorplan)) + '" alt="Floor plan"></button>'
        : '<div class="slot">' + slotIcon("plan") + "<b>Floor plan goes here</b><span>A drawing with room sizes</span></div>") +
      "</div></section>";
    html += '<p class="print-url print-only">Listing link: ' + esc(shareUrl(p)) + "<br>Sample listing on a demo website. Not a real offer; contact details are placeholders.</p>";
    main.innerHTML = html;

    // aside
    $("#askName").textContent = p.name;
    $("#askPanel h4").textContent = p.status === "leased" ? "Ask about this " + (res ? "home" : "space") : "Schedule a showing";
    $$(".biz-only").forEach(function (el) { el.hidden = res; });
    var want = p.status === "leased" ? "question" : "showing";
    $$('#askForm input[name="want"]').forEach(function (r) { r.checked = r.value === want; });
    $$(".showing-only").forEach(function (el) { el.hidden = want !== "showing"; });
    $("#askSent").classList.remove("on");
    $("#askErr").textContent = "";
    $("#aDate").min = $("#aMove").min = todayIso();
    $("#miniArea").textContent = p.area + ", Baker City, Oregon";
    $("#dirLink").href = dirUrl(p);
    initMini(p);
  }
  function gBtn(ph, i, cls, total, more) {
    return '<button type="button" class="' + cls + '" data-i="' + i + '" aria-label="Open photo ' + (i + 1) + ": " + esc(ph.caption || "photo") + '">' +
      '<img src="' + esc(imgSrc(ph.src)) + '" alt="' + esc(ph.caption || "") + '"><span class="flag">' + flagText(ph) + "</span>" +
      (more ? '<span class="gmore">' + esc(more) + "</span>" : "") +
      (total > 1 ? '<span class="gcount">' + total + " photos · view all</span>" : "") + "</button>";
  }
  function initMini(p) {
    var el = $("#miniMap");
    if (!HAS_L) { mapOff(el); return; }
    if (!mini) {
      mini = L.map(el, { scrollWheelZoom: false, zoomControl: true });
      tiles(mini);
      miniMarker = L.marker([p.lat, p.lng], { icon: pinIcon(p.status), keyboard: false }).addTo(mini);
    }
    mini.invalidateSize();
    mini.setView([p.lat, p.lng], 15);
    miniMarker.setLatLng([p.lat, p.lng]).setIcon(pinIcon(p.status));
  }

  $("#detailBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-i],[data-act]");
    if (!b || !curDetail) return;
    if (b.dataset.i != null) { openLb(curDetail.photos.length ? curDetail.photos : [cover(curDetail)], +b.dataset.i, b); return; }
    var act = b.dataset.act;
    if (act === "print") window.print();
    if (act === "share" || act === "copy") {
      var box = $("#shareBox"), inp = $("#shareUrl");
      box.hidden = false;
      inp.focus(); inp.select();
      var done = function () { toast("Link copied. Paste it anywhere to share this listing."); };
      var fail = function () { toast("Press Ctrl+C (or Cmd+C) to copy the link."); };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(done, fail);
        else if (document.execCommand && document.execCommand("copy")) done(); else fail();
      } catch (err) { fail(); }
    }
  });
  $("#detailMain").addEventListener("click", function (e) {
    var b = e.target.closest("[data-fp]");
    if (b && curDetail && curDetail.floorplan) openLb([{ src: curDetail.floorplan, caption: "Floor plan", sample: false }], 0, b);
  });

  // ask form (sends nothing)
  $$('#askForm input[name="want"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var showing = $('#askForm input[name="want"]:checked').value === "showing";
      $$(".showing-only").forEach(function (el) { el.hidden = !showing; });
    });
  });
  $("#askForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, err = $("#askErr");
    var fe = f.elements, name = fe["name"].value.trim(), email = fe.email.value.trim(), phone = fe.phone.value.trim();
    if (!name) { err.textContent = "Please add your name."; fe["name"].focus(); return; }
    if (!email && !phone) { err.textContent = "Please add a phone number or an email so we can reach you."; fe.phone.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "That email doesn't look right."; fe.email.focus(); return; }
    err.textContent = "";
    var want = $('#askForm input[name="want"]:checked').value;
    var box = $("#askSent");
    box.textContent = "Thanks, " + name.split(" ")[0] + "! In the live site, your " + (want === "showing" ? "showing request" : "question") +
      ' about "' + (curDetail ? curDetail.name : "this space") + '" would go to the leasing office. This is a demo, so nothing was sent.';
    box.classList.add("on");
    f.reset();
    $$(".showing-only").forEach(function (el) { el.hidden = false; });
  });

  /* ---------- lightbox ---------- */
  var lb = { list: [], i: 0, back: null };
  function openLb(list, i, from) {
    lb.list = list; lb.i = i; lb.back = from || document.activeElement;
    $("#lb").hidden = false;
    document.body.style.overflow = "hidden";
    showLb();
    $("#lbClose").focus();
  }
  function showLb() {
    var ph = lb.list[lb.i];
    $("#lbImg").src = imgSrc(ph.src);
    $("#lbImg").alt = ph.caption || "";
    $("#lbFlag").textContent = ph.caption === "Floor plan" && !ph.sample ? "FLOOR PLAN" : flagText(ph);
    $("#lbCap").innerHTML = "<span>" + (lb.i + 1) + " of " + lb.list.length + " · " + (ph.sample ? "sample photo" : "uploaded in this browser") + "</span>" + esc(ph.caption || "");
    var multi = lb.list.length > 1;
    $("#lbPrev").hidden = $("#lbNext").hidden = !multi;
  }
  function stepLb(d) { lb.i = (lb.i + d + lb.list.length) % lb.list.length; showLb(); }
  function closeLb() {
    $("#lb").hidden = true;
    document.body.style.overflow = "";
    if (lb.back && lb.back.focus) lb.back.focus();
  }
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", function () { stepLb(-1); });
  $("#lbNext").addEventListener("click", function () { stepLb(1); });
  $("#lb").addEventListener("click", function (e) { if (e.target === this || e.target.tagName === "FIGURE") closeLb(); });

  /* ---------- in-page confirm ---------- */
  var modalDone = null;
  function confirmBox(msg, okLabel) {
    return new Promise(function (resolve) {
      var back = document.activeElement;
      $("#modalMsg").textContent = msg;
      $("#modalOk").textContent = okLabel || "OK";
      $("#modal").hidden = false;
      $("#modalCancel").focus();
      modalDone = function (v) {
        $("#modal").hidden = true;
        modalDone = null;
        if (back && back.focus && document.contains(back)) back.focus();
        resolve(v);
      };
    });
  }
  $("#modalOk").addEventListener("click", function () { if (modalDone) modalDone(true); });
  $("#modalCancel").addEventListener("click", function () { if (modalDone) modalDone(false); });
  $("#modal").addEventListener("click", function (e) { if (e.target === this && modalDone) modalDone(false); });

  function trapTab(e, root) {
    var f = $$("button:not([hidden]),a[href],input,select", root).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", function (e) {
    if (!$("#modal").hidden) {
      if (e.key === "Escape") modalDone && modalDone(false);
      if (e.key === "Tab") trapTab(e, $("#modal"));
      return;
    }
    if (!$("#lb").hidden) {
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") stepLb(-1);
      else if (e.key === "ArrowRight") stepLb(1);
      else if (e.key === "Tab") trapTab(e, $("#lb"));
    }
  });

  /* ---------- admin: list ---------- */
  function renderAdmin() {
    $("#storeNote").textContent = storageOk ? props.length + " listings in this browser." :
      "This browser is blocking storage (or it is full), so changes last only until you reload the page.";
    var list = sorted.call(null, props);
    $("#adminList").innerHTML = list.length ? list.map(function (p) {
      var id = esc(p.id);
      return '<div class="arow" data-id="' + id + '"><img src="' + esc(imgSrc(cover(p).src)) + '" alt="">' +
        "<div><h4>" + esc(p.name) + '</h4><div class="meta">' + esc(p.type) + " · " + sqft(p.sqft) + " · " + money(p.rent) + "/mo · " + badge(p) + "</div></div>" +
        '<div class="ctl"><label class="vh" for="st-' + id + '">Availability for ' + esc(p.name) + "</label>" +
        '<select id="st-' + id + '" data-act="status"><option value="available"' + (p.status === "available" ? " selected" : "") + ">Available now</option>" +
        '<option value="coming"' + (p.status === "coming" ? " selected" : "") + ">Coming soon</option>" +
        '<option value="leased"' + (p.status === "leased" ? " selected" : "") + ">Leased</option></select>" +
        '<label class="vh" for="dt-' + id + '">Available date for ' + esc(p.name) + "</label>" +
        '<input type="date" id="dt-' + id + '" data-act="date" value="' + esc(p.availableDate) + '"' + (p.status === "coming" ? "" : " hidden") + ">" +
        '<a class="btn o sm" href="#p/' + encodeURIComponent(p.id) + '">View</a>' +
        '<a class="btn n sm" href="#admin/edit/' + encodeURIComponent(p.id) + '">Edit</a>' +
        '<button type="button" class="btn o sm danger" data-act="del">Delete</button></div></div>';
    }).join("") : '<div class="empty"><p>No listings. Add one, import a file, or reset to the samples.</p></div>';
  }
  function saved(msg) {
    var ok = save();
    toast(ok ? msg + " (Demo: saved in this browser only.)" : msg + " This browser blocked saving or is full, so it lasts until you reload.");
    needFit = true;
  }
  $("#adminList").addEventListener("change", function (e) {
    var r = e.target.closest(".arow"), p = r && byId(r.dataset.id);
    if (!p) return;
    if (e.target.dataset.act === "status") {
      p.status = e.target.value;
      var d = r.querySelector('[data-act="date"]');
      d.hidden = p.status !== "coming";
      if (p.status === "coming" && !p.availableDate) d.focus();
    } else if (e.target.dataset.act === "date") {
      p.availableDate = isoOk(e.target.value) ? e.target.value : "";
    } else return;
    r.querySelector(".badge").outerHTML = badge(p);
    saved('"' + p.name + '" is now ' + statusLabel(p) + ".");
  });
  $("#adminList").addEventListener("click", function (e) {
    var b = e.target.closest('[data-act="del"]');
    if (!b) return;
    var p = byId(b.closest(".arow").dataset.id);
    if (p) askDelete(p, function () { renderAdmin(); });
  });
  function askDelete(p, after) {
    confirmBox('Delete "' + p.name + '"? It comes off the listings and the map. (You can bring the samples back with "Reset to sample listings".)', "Delete").then(function (ok) {
      if (!ok) return;
      props = props.filter(function (x) { return x !== p; });
      if (selected === p.id) selected = null;
      saved('Deleted "' + p.name + '".');
      after();
    });
  }
  $("#btnExport").addEventListener("click", function () {
    var data = { note: "Listings exported from the Rock Creek Developments properties demo. Sample data.", exported: new Date().toISOString(), listings: props };
    try {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "listings-" + todayIso() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast("Exported " + props.length + " listings.");
    } catch (err) { toast("This browser could not make the export file."); }
  });
  $("#fileImport").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    var rd = new FileReader();
    rd.onload = function () {
      var arr;
      try {
        var j = JSON.parse(rd.result);
        arr = Array.isArray(j) ? j : j && j.listings;
        if (!Array.isArray(arr)) throw new Error("no list");
        arr = arr.filter(function (x) { return x && typeof x === "object" && x.name; });
        if (!arr.length) throw new Error("empty");
      } catch (err) { toast("That file isn't a listings export (JSON). Nothing changed."); return; }
      confirmBox("Replace the " + props.length + " current listings with the " + arr.length + ' in "' + file.name + '"?', "Import").then(function (ok) {
        if (!ok) return;
        props = uniqueIds(arr.map(normalize));
        selected = null;
        saved("Imported " + props.length + " listings.");
        renderAdmin();
      });
    };
    rd.onerror = function () { toast("Couldn't read that file."); };
    rd.readAsText(file);
  });
  $("#btnReset").addEventListener("click", function () {
    confirmBox("Put back the " + SAMPLES.length + " sample listings? Anything added or changed in this browser will be lost.", "Reset").then(function (ok) {
      if (!ok) return;
      props = uniqueIds(clone(SAMPLES).map(normalize));
      clearStore();
      selected = null; needFit = true;
      renderAdmin();
      toast("Back to the sample listings.");
    });
  });

  /* ---------- admin: editor ---------- */
  var ed = null, editMap = null, editMarker = null;
  var form = $("#editForm");
  function blank() {
    return normalize({ id: "new", name: "New listing", type: "Office", status: "available", area: "", leaseType: "NNN", photos: [] });
  }
  function showEditor(id) {
    var p = id ? byId(id) : null;
    if (id && !p) { toast("That listing wasn't found."); location.hash = "admin"; return; }
    var src = p ? clone(p) : blank();
    if (!p) { src.name = ""; src.lat = NaN; src.lng = NaN; src.sqft = NaN; src.rent = NaN; }
    ed = { id: p ? p.id : null, photos: src.photos, floorplan: src.floorplan };
    $("#editTitle").textContent = p ? "Edit: " + p.name : "Add Property";
    document.title = (p ? "Edit " + p.name : "Add property") + " — Admin (Demo)";
    TEXT_FIELDS.concat(NUM_FIELDS).forEach(function (k) {
      var el = form.elements[k];
      if (!el) return;
      var v = src[k];
      el.value = (typeof v === "number" && !isFinite(v)) ? "" : (k === "camPsf" && !v ? "" : v);
    });
    form.elements.highlights.value = src.highlights.join("\n");
    $("#eDelete").hidden = !p;
    $("#editErr").textContent = ""; $("#ePhotoErr").textContent = "";
    var pick = $(".samplepick"); if (pick) pick.remove();
    syncEditForm();
    renderEPhotos();
    floorState();
    initEditMap(src);
    setTimeout(function () { form.elements.name.focus(); }, 50);
  }
  function syncEditForm() {
    $("#e-date-wrap").hidden = form.elements.status.value !== "coming";
    $("#e-res").hidden = form.elements.type.value !== "Residential";
  }
  form.elements.status.addEventListener("change", syncEditForm);
  form.elements.type.addEventListener("change", function () {
    syncEditForm();
    if (form.elements.type.value === "Residential" && form.elements.leaseType.value !== "Residential lease") form.elements.leaseType.value = "Residential lease";
  });

  function renderEPhotos() {
    var box = $("#ePhotos");
    if (!ed.photos.length) { box.innerHTML = '<p class="small">No photos yet. The listing shows a drawn placeholder until you add one.</p>'; return; }
    box.innerHTML = ed.photos.map(function (ph, i) {
      return '<div class="ephoto" data-i="' + i + '"><div class="im"><img src="' + esc(imgSrc(ph.src)) + '" alt=""><span class="flag">' + flagText(ph) + "</span>" +
        (i === 0 ? '<span class="cover">COVER</span>' : "") + '</div><div class="bd">' +
        '<label class="vh" for="cap-' + i + '">Caption for photo ' + (i + 1) + "</label>" +
        '<input id="cap-' + i + '" data-cap value="' + esc(ph.caption) + '" placeholder="Caption">' +
        '<div class="pb"><button type="button" data-mv="-1" aria-label="Move photo ' + (i + 1) + ' earlier"' + (i === 0 ? " disabled" : "") + ">◀</button>" +
        '<button type="button" data-mv="1" aria-label="Move photo ' + (i + 1) + ' later"' + (i === ed.photos.length - 1 ? " disabled" : "") + ">▶</button>" +
        '<button type="button" class="rm" data-rm aria-label="Remove photo ' + (i + 1) + '">Remove</button></div></div></div>';
    }).join("");
  }
  $("#ePhotos").addEventListener("input", function (e) {
    if (!e.target.hasAttribute("data-cap")) return;
    ed.photos[+e.target.closest(".ephoto").dataset.i].caption = e.target.value;
  });
  $("#ePhotos").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.closest(".ephoto").dataset.i;
    if (b.hasAttribute("data-rm")) ed.photos.splice(i, 1);
    else if (b.dataset.mv) {
      var j = i + +b.dataset.mv;
      if (j < 0 || j >= ed.photos.length) return;
      var t = ed.photos[i]; ed.photos[i] = ed.photos[j]; ed.photos[j] = t;
    }
    renderEPhotos();
  });
  // shrink an image file to a JPEG data URL so localStorage can hold a few of them
  function readImage(file, maxSide) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error(file.name + " is not an image."));
      if (file.size > 25 * 1024 * 1024) return reject(new Error(file.name + " is over 25 MB."));
      var rd = new FileReader();
      rd.onerror = function () { reject(new Error("Couldn't read " + file.name + ".")); };
      rd.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Couldn't open " + file.name + " as an image.")); };
        img.onload = function () {
          var s = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          var c = document.createElement("canvas");
          c.width = Math.max(1, Math.round((img.naturalWidth || 800) * s));
          c.height = Math.max(1, Math.round((img.naturalHeight || 500) * s));
          var g = c.getContext("2d");
          g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          try { resolve(c.toDataURL("image/jpeg", 0.8)); } catch (err) { resolve(rd.result); }
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }
  $("#ePhotoFile").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    var err = $("#ePhotoErr"); err.textContent = "";
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return readImage(f, 1400).then(function (url) {
          ed.photos.push({ src: url, caption: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), sample: false });
          renderEPhotos();
        }, function (x) { err.textContent += x.message + " "; });
      });
    }, Promise.resolve()).then(function () { if (files.length) toast("Added " + files.length + " photo" + (files.length > 1 ? "s" : "") + ". Save to keep them."); });
  });
  $("#eAddSample").addEventListener("click", function () {
    var pick = $(".samplepick");
    if (pick) { pick.remove(); return; }
    pick = document.createElement("div");
    pick.className = "samplepick";
    pick.innerHTML = SAMPLE_PHOTOS.map(function (s, i) {
      return '<button type="button" data-s="' + i + '" aria-label="Add sample photo: ' + esc(s.caption) + '"><img src="' + esc(imgSrc(s.src)) + '" alt=""></button>';
    }).join("");
    pick.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-s]");
      if (!b) return;
      var s = SAMPLE_PHOTOS[+b.dataset.s];
      ed.photos.push({ src: s.src, caption: s.caption, sample: true });
      renderEPhotos();
    });
    $("#eAddSample").parentNode.after(pick);
  });
  function floorState() {
    $("#eFloorState").textContent = ed.floorplan ? "Floor plan added." : "None yet (shows a placeholder).";
    $("#eFloorClear").hidden = !ed.floorplan;
  }
  $("#eFloorFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    readImage(f, 1600).then(function (url) { ed.floorplan = url; floorState(); }, function (x) { $("#ePhotoErr").textContent = x.message; });
  });
  $("#eFloorClear").addEventListener("click", function () { ed.floorplan = ""; floorState(); });

  function initEditMap(p) {
    var el = $("#editMap");
    var has = isFinite(p.lat) && isFinite(p.lng);
    if (!HAS_L) { mapOff(el, "The map could not load. Type the latitude and longitude instead."); return; }
    if (!editMap) {
      editMap = L.map(el, { scrollWheelZoom: true });
      tiles(editMap);
      editMap.on("click", function (e) { setPin(e.latlng.lat, e.latlng.lng, true); });
    }
    editMap.invalidateSize();
    if (editMarker) { editMarker.remove(); editMarker = null; }
    if (has) { setPin(p.lat, p.lng, false); editMap.setView([p.lat, p.lng], 16); }
    else editMap.setView(CENTER, 14);
  }
  function setPin(lat, lng, fromMap) {
    $("#editErr").textContent = "";
    if (fromMap) {
      form.elements.lat.value = lat.toFixed(5);
      form.elements.lng.value = lng.toFixed(5);
    }
    if (!editMap) return;
    if (!editMarker) {
      editMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon(form.elements.status.value), title: "Listing pin (drag to move)" }).addTo(editMap);
      editMarker.on("dragend", function () { var ll = editMarker.getLatLng(); setPin(ll.lat, ll.lng, true); });
    } else editMarker.setLatLng([lat, lng]);
  }
  ["lat", "lng"].forEach(function (k) {
    form.elements[k].addEventListener("input", function () {
      var lat = parseFloat(form.elements.lat.value), lng = parseFloat(form.elements.lng.value);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        setPin(lat, lng, false);
        if (editMap) editMap.panTo([lat, lng]);
      }
    });
  });
  form.elements.status.addEventListener("change", function () { if (editMarker) editMarker.setIcon(pinIcon(form.elements.status.value)); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var E = form.elements, err = $("#editErr");
    var problems = [];
    if (!E.name.value.trim()) problems.push("a listing name");
    if (!E.area.value.trim()) problems.push("the area");
    if (!(parseFloat(E.sqft.value) > 0)) problems.push("the square feet");
    if (!(parseFloat(E.rent.value) >= 0) || E.rent.value === "") problems.push("the monthly rent");
    var lat = parseFloat(E.lat.value), lng = parseFloat(E.lng.value);
    if (!(isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat !== 0 && lng !== 0)) problems.push("a map pin (click the map or type latitude and longitude)");
    ["videoUrl", "tourUrl"].forEach(function (k) { if (E[k].value.trim() && !safeUrl(E[k].value)) problems.push("a full web address starting with https:// for the " + (k === "videoUrl" ? "video" : "3D") + " tour"); });
    if (problems.length) {
      err.textContent = "Please add " + problems.join(", ") + ".";
      err.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    err.textContent = "";
    var raw = {};
    TEXT_FIELDS.concat(NUM_FIELDS).forEach(function (k) { if (E[k]) raw[k] = E[k].value; });
    raw.highlights = E.highlights.value;
    raw.photos = ed.photos;
    raw.floorplan = ed.floorplan;
    if (raw.status !== "coming") raw.availableDate = "";
    var old = ed.id ? byId(ed.id) : null;
    raw.id = old ? old.id : slug(raw.name);
    var p = normalize(raw);
    if (old) {
      p.id = old.id;
      props[props.indexOf(old)] = p;
    } else {
      var base = p.id, n = 2;
      while (byId(p.id)) p.id = base + "-" + n++;
      props.push(p);
    }
    var ok = save();
    if (!ok && ed.photos.some(function (x) { return !x.sample; })) {
      toast("Saved for this visit, but this browser's storage is full or blocked. Try fewer or smaller photos to keep it after a reload.");
    } else toast(ok ? 'Saved "' + p.name + '". (Demo: saved in this browser only.)' : 'Saved "' + p.name + '" for this visit; this browser blocks storage.');
    needFit = true;
    location.hash = "admin";
  });
  $("#eDelete").addEventListener("click", function () {
    var p = ed && ed.id && byId(ed.id);
    if (p) askDelete(p, function () { location.hash = "admin"; });
  });

  /* ---------- router ---------- */
  var current = null, listScroll = 0;
  function showView(name) {
    if (current === "list") listScroll = window.scrollY;
    $$(".view").forEach(function (v) { v.classList.toggle("on", v.id === "v-" + name); });
    current = name;
  }
  function route() {
    var h = location.hash.replace(/^#/, "");
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    $("#mainNav").classList.remove("open");
    $("#burger").setAttribute("aria-expanded", "false");
    if (!$("#lb").hidden) closeLb();
    if (modalDone) modalDone(false);
    if (h.indexOf("p/") === 0) {
      showView("detail");
      window.scrollTo(0, 0);
      renderDetail(h.slice(2));
    } else if (h === "admin") {
      showView("admin");
      document.title = "Manage listings — Admin (Demo)";
      window.scrollTo(0, 0);
      renderAdmin();
    } else if (h === "admin/new" || h.indexOf("admin/edit/") === 0) {
      showView("edit");
      window.scrollTo(0, 0);
      showEditor(h === "admin/new" ? null : h.slice(11));
    } else {
      var back = current && current !== "list";
      showView("list");
      document.title = "Properties for Lease — Rock Creek Developments (Demo)";
      initMap();
      renderList();
      window.scrollTo(0, back ? listScroll : 0);
    }
  }
  window.addEventListener("hashchange", route);

  $("#burger").addEventListener("click", function () {
    var open = $("#mainNav").classList.toggle("open");
    this.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $(".skip").addEventListener("click", function (e) { e.preventDefault(); $("#main").focus(); });
  window.addEventListener("resize", function () {
    if (map && current === "list") map.invalidateSize();
  });

  route();
})();
