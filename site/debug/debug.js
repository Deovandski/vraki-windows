// "Stats for nerds" (debug/index.html, #12): writes a heading and a row for every value into the terminal, fills each one
// in, then starts the typing. Ported from Deovandski-repo-template's src/pages/debug.astro + src/scripts/debug.ts
// (Deovandski-repo-template#19); the WINDOWS APP section is this repo's own.
// Build facts come from stats.json (tools/stats.mjs, run after `node tools/i18n.mjs build`); the rest is what this browser
// tells the page. Nothing is saved or sent anywhere: the only requests are stats.json itself (once, plus three timed HEAD
// requests for "Ping"). A browser that doesn't share something shows "n/a". After the typing ends, a few values keep
// updating (clock, uptime, frame rate, JS heap, viewport, online status).
//
// To add a line: add ['Label', 'key'] to its section in SECTIONS, then set('key', value) below (or in stats.mjs, for a
// build fact, which ends up in stats.json).
(function () {
  "use strict";

  /** Every line of the terminal, in order: [label, key]. */
  var SECTIONS = [
    { title: "CODE", rows: [
      ["Repository", "repo"], ["Visibility", "visibility"], ["Build", "build"], ["Built at", "builtAt"], ["Branch", "branch"],
      ["Commit", "commit"], ["Committed", "commitDate"], ["Pull request", "pr"], ["Workflow run", "run"], ["Tools", "tools"],
    ] },
    { title: "SITE", rows: [
      ["Address", "siteUrl"], ["This page", "path"], ["Pages", "pages"], ["Deployed", "deployed"], ["Biggest types", "types"],
      ["Page language", "pageLang"], ["Ready langs", "readyLangs"], ["Settings key", "storeKey"], ["Saved settings", "saved"],
      ["Offline worker", "sw"], ["Saved copies", "caches"], ["App mode", "display"],
    ] },
    { title: "WINDOWS APP", rows: [
      ["Latest release", "winRelease"], ["Microsoft Store", "store"], ["2017 source", "legacy"], ["Vraki typeface", "typeface"],
      ["Converter port", "converter"],
    ] },
    { title: "RUNTIME", rows: [
      ["Browser", "browser"], ["Platform", "platform"], ["CPU threads", "cpu"], ["Device memory", "deviceMemory"],
      ["JS heap", "heap"], ["Storage", "storage"], ["Cookies", "cookies"], ["Local storage", "local"], ["Session storage", "session"],
      ["Screen", "screen"], ["Viewport", "viewport"], ["Pixel ratio", "dpr"], ["Colour scheme", "scheme"], ["Motion", "motion"],
      ["Input", "input"], ["GPU", "gpu"], ["WebGPU", "webgpu"], ["Battery", "battery"], ["Time zone", "tz"],
      ["Languages", "langs"], ["Local time", "clock"], ["Uptime", "uptime"], ["Frame rate", "fps"], ["User agent", "ua"],
    ] },
    { title: "NETWORK", rows: [
      ["Status", "online"], ["Connection", "connection"], ["Downlink", "downlink"], ["Round trip", "rtt"], ["Data saver", "saveData"],
      ["Protocol", "protocol"], ["Served from", "servedFrom"], ["Server", "server"], ["CDN node", "cdn"], ["Cache", "cdnCache"],
      ["Ping", "ping"], ["Secure context", "secure"], ["Isolated", "isolated"],
    ] },
    { title: "PERFORMANCE", rows: [
      ["DNS", "dns"], ["Connect", "connect"], ["TLS", "tls"], ["First byte", "ttfb"], ["Download", "download"],
      ["DOM ready", "domReady"], ["Load", "load"], ["First paint", "fcp"], ["Largest paint", "lcp"], ["Layout shift", "cls"],
      ["Page transfer", "transfer"], ["Resources", "resources"], ["DOM nodes", "nodes"],
    ] },
  ];

  var root = document.documentElement;
  var ROOT = root.dataset.root || "./";       // the way back to the site's root, where stats.json lives
  var nav = navigator;
  var term = document.querySelector(".debug-terminal");
  var screenEl = term && term.querySelector(".terminal__screen");
  var end = term && term.querySelector("[data-sections-end]");
  var word = function (k) { var el = document.querySelector('.debug-words [data-k="' + k + '"]'); return el ? el.textContent : k; };
  var NA = word("na");

  // ---------------------------------------------------------------- the lines
  /** "== CODE =================", every heading the same width. */
  var heading = function (title) { return "== " + title + " " + "=".repeat(Math.max(3, 26 - title.length)); };
  function line(cls, text) {
    var el = document.createElement("div");
    el.className = cls;
    if (text != null) el.textContent = text;
    end.before(el);
    return el;
  }
  function writeLines() {
    SECTIONS.forEach(function (s) {
      line("term-gap");
      line("term-h", heading(s.title));
      s.rows.forEach(function (r) {
        var row = line("term-row");
        row.setAttribute("data-row", r[1]);
        var k = document.createElement("span"); k.className = "term-k"; k.textContent = r[0];
        var v = document.createElement("span"); v.className = "term-v"; v.setAttribute("data-v", r[1]); v.textContent = "...";
        row.append(k, v);
      });
    });
    line("term-gap");
    line("term-h", heading("LANGUAGES"));
    line("term-dim").setAttribute("data-v", "i18nSummary");
    term.querySelector('[data-v="i18nSummary"]').textContent = "...";
  }

  // ---------------------------------------------------------------- formatting
  function bytes(n) {
    if (n == null || !isFinite(n)) return NA;
    var u = ["B", "KB", "MB", "GB", "TB"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i && n < 10 ? 1 : 0) + " " + u[i];
  }
  var ms = function (n) { return n == null || !isFinite(n) || n < 0 ? NA : Math.round(n) + " ms"; };
  var when = function (iso) { return iso ? new Date(iso).toLocaleString("en-CA", { hour12: false }).replace(",", "") : NA; };
  var yesNo = function (b) { return word(b ? "yes" : "no"); };
  function bar(pct, width) {
    width = width || 12;
    var full = Math.round((pct / 100) * width);
    return "[" + "█".repeat(full) + "░".repeat(width - full) + "]";
  }

  /** Put text (or a link) in a value. */
  function set(key, text, href) {
    var el = term && term.querySelector('[data-v="' + key + '"]');
    if (!el) return;
    if (href) {
      var a = document.createElement("a");
      a.href = href;
      a.rel = "noopener";
      a.textContent = text;
      el.replaceChildren(a);
    } else el.textContent = text;
  }
  function timeout(p, t) {
    return Promise.race([Promise.resolve(p).catch(function () { return null; }), new Promise(function (r) { setTimeout(function () { r(null); }, t || 1500); })]);
  }

  // ---------------------------------------------------------------- code, site, app, languages (stats.json)
  async function fromStats() {
    var res = await timeout(fetch(ROOT + "stats.json", { cache: "no-cache" }));
    var stats = res && res.ok ? await res.json() : null;
    if (!stats) {
      ["repo", "build", "winRelease", "i18nSummary"].forEach(function (k) { set(k, word("noStats")); });
      return;
    }
    var code = stats.code, site = stats.site, app = stats.app, i18n = stats.i18n;
    if (code.repo) set("repo", code.repo, code.repoUrl); else set("repo", NA);
    set("visibility", code.public === null ? word("local") : word(code.public ? "public" : "private"));
    set("build", code.run ? "#" + code.run + " · " + code.builtBy : code.builtBy, code.runUrl);
    set("builtAt", when(code.builtAt));
    set("branch", code.branch || NA);
    set("commit", code.commit ? (code.commit.slice(0, 7) + " " + (code.commitSubject || "")).trim() : NA, code.commitUrl);
    set("commitDate", when(code.commitDate));
    set("pr", code.pr ? "#" + code.pr : NA, code.prUrl);
    set("run", code.run ? "#" + code.run : NA, code.runUrl);
    set("tools", Object.keys(code.tools).filter(function (k) { return code.tools[k]; })
      .map(function (k) { return k + " " + String(code.tools[k]).replace(/^v/, ""); }).join(" · "));

    set("siteUrl", site.url || NA, site.url);
    set("pages", site.pages + " × " + site.languages + " languages");
    set("deployed", site.files + " files · " + bytes(site.bytes));
    set("types", Object.keys(site.byType).slice(0, 4).map(function (ext) { return ext + " " + bytes(site.byType[ext].bytes); }).join(" · "));
    var sw = term.querySelector('[data-v="sw"]');
    if (sw && site.serviceWorker) sw.setAttribute("data-version", site.serviceWorker);

    if (app) {
      set("winRelease", app.release ? app.release + (app.releaseNotes ? " (release notes)" : "") : NA, app.releaseNotes);
      set("store", app.storeId ? app.storeId + " · Microsoft Store" : NA, app.storeUrl);
      set("legacy", app.legacy || NA, app.legacyUrl);
      set("typeface", app.typeface ? app.typeface.file + " · " + bytes(app.typeface.bytes) + " · own license (not MIT)" : NA, app.typeface && app.typeface.licenseUrl);
      set("converter", app.converter || NA);
    }

    var e = i18n.english;
    set("i18nSummary", "English: " + e.pages + " pages · " + e.segments + " segments · " + e.words.toLocaleString("en") +
      " words · indexed at " + Math.round(i18n.indexCoverage * 100) + "%");
    var here = root.dataset.lang || "en";
    i18n.languages.forEach(function (l) {
      var row = line("term-row");
      var k = document.createElement("span"); k.className = "term-k"; k.textContent = l.code + " " + l.name;
      var v = document.createElement("span"); v.className = "term-v";
      var b = document.createElement("span"); b.className = "term-bar";
      b.textContent = bar(l.percent) + " " + l.percent.toFixed(1).padStart(5) + "%";
      v.append(b, " " + l.segments + "/" + e.segments + " seg · " + word("indexed") + " " + l.pagesIndexed + "/" + e.pagesIndexable);
      if (l.percent < 50) b.classList.add("term-dim");
      if (l.code === here) { row.classList.add("term-hi"); v.append(" " + word("current")); }
      row.append(k, v);
    });
  }

  // ---------------------------------------------------------------- this page and the browser
  function webgl() {
    try {
      var gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return NA;
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch (e) { return NA; }
  }
  function storageSummary(s) {
    try {
      if (!s) return NA;
      var size = 0, keys = [];
      for (var i = 0; i < s.length; i++) { var k = s.key(i); keys.push(k); size += k.length + (s.getItem(k) || "").length; }
      return keys.length ? keys.length + " key" + (keys.length > 1 ? "s" : "") + " · " + bytes(size * 2) + " · " + keys.join(", ") : word("none");
    } catch (e) { return NA; }
  }
  function browserName() {
    var b = nav.userAgentData && nav.userAgentData.brands && nav.userAgentData.brands.filter(function (x) { return !/not.?a.?brand/i.test(x.brand); });
    if (b && b.length) return b.map(function (x) { return x.brand + " " + x.version; }).join(" · ");
    var m = navigator.userAgent.match(/(Firefox|Edg|OPR|SamsungBrowser|Chrome|Version)\/([\d.]+)/);
    if (!m) return NA;
    var name = m[1] === "Version" ? "Safari" : m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1];
    return name + " " + m[2];
  }

  async function fromBrowser() {
    var mq = function (q) { return matchMedia(q).matches; };
    set("path", location.pathname);
    set("pageLang", root.lang + (root.dir === "rtl" ? " (right to left)" : ""));
    set("readyLangs", (root.dataset.langs || "").trim() || word("none"));
    set("storeKey", root.dataset.store || NA);
    try { set("saved", localStorage.getItem(root.dataset.store || "") || word("none")); } catch (e) { set("saved", NA); }
    set("display", word(mq("(display-mode: standalone)") || nav.standalone ? "standalone" : "tab"));

    var uad = nav.userAgentData;
    set("browser", browserName());
    set("platform", ((uad && uad.platform) || navigator.platform || NA) + (uad && uad.mobile ? " (mobile)" : ""));
    set("ua", navigator.userAgent);
    set("cpu", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " logical cores" : NA);
    set("deviceMemory", nav.deviceMemory ? "≥ " + nav.deviceMemory + " GB (rounded by the browser)" : NA);
    var cookies = document.cookie ? document.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); }) : [];
    set("cookies", (navigator.cookieEnabled ? "enabled" : "blocked") + " · " + (cookies.length ? cookies.join(", ") : "none set by this site"));
    set("local", storageSummary(window.localStorage));
    set("session", storageSummary(window.sessionStorage));
    set("screen", screen.width + "×" + screen.height + " · " + screen.colorDepth + "-bit colour" + (screen.orientation ? " · " + screen.orientation.type : ""));
    set("dpr", devicePixelRatio + "×");
    set("scheme", (mq("(prefers-color-scheme: dark)") ? "dark" : "light") + (mq("(prefers-contrast: more)") ? " · more contrast" : ""));
    set("motion", word(mq("(prefers-reduced-motion: reduce)") ? "reduce" : "full"));
    set("input", (mq("(pointer: coarse)") ? "touch" : mq("(pointer: fine)") ? "mouse" : NA) + (navigator.maxTouchPoints ? " · " + navigator.maxTouchPoints + " touch points" : ""));
    set("gpu", webgl());
    set("webgpu", yesNo(!!nav.gpu));
    var tz = Intl.DateTimeFormat().resolvedOptions(), off = -new Date().getTimezoneOffset();
    set("tz", tz.timeZone + " (UTC" + (off >= 0 ? "+" : "") + off / 60 + ") · " + tz.locale);
    set("langs", (navigator.languages || [navigator.language]).join(", "));
    set("secure", yesNo(isSecureContext));
    set("isolated", yesNo(!!window.crossOriginIsolated));

    var c = nav.connection;
    set("connection", c ? [c.type, c.effectiveType].filter(Boolean).join(" · ") || NA : NA);
    set("downlink", c && c.downlink != null ? c.downlink + " Mbps (estimate)" : NA);
    set("rtt", c && c.rtt != null ? c.rtt + " ms (estimate)" : NA);
    set("saveData", c && c.saveData != null ? yesNo(c.saveData) : NA);

    var st = navigator.storage;
    var est = st && st.estimate ? await timeout(st.estimate()) : null;
    var persisted = st && st.persisted ? await timeout(st.persisted()) : null;
    set("storage", est ? bytes(est.usage) + " used of " + bytes(est.quota) + (persisted != null ? " · persistent: " + yesNo(persisted) : "") : NA);

    if (!("serviceWorker" in navigator)) set("sw", word("noWorker"));
    else {
      var reg = await timeout(navigator.serviceWorker.getRegistration());
      var version = term.querySelector('[data-v="sw"]').getAttribute("data-version");
      set("sw", reg ? word(navigator.serviceWorker.controller ? "controlled" : "notControlled") + (version ? " · " + version : "") +
        " · scope " + new URL(reg.scope).pathname : word("none"));
    }
    if ("caches" in window) {
      var names = (await timeout(caches.keys())) || [];
      var counts = await Promise.all(names.map(async function (n) { var k = await timeout(caches.open(n).then(function (cc) { return cc.keys(); })); return k ? k.length : 0; }));
      set("caches", names.length ? names.map(function (n, i) { return n + ": " + counts[i] + " files"; }).join(" · ") : word("none"));
    } else set("caches", NA);

    var bat = nav.getBattery ? await timeout(nav.getBattery()) : null;
    set("battery", bat ? Math.round(bat.level * 100) + "% · " + word(bat.charging ? "charging" : "unplugged") : NA);
  }

  // ---------------------------------------------------------------- network and performance
  async function fromNetwork() {
    var nt = performance.getEntriesByType("navigation")[0];
    if (nt) {
      set("protocol", nt.nextHopProtocol || NA);
      set("servedFrom", word(nt.workerStart > 0 && nt.transferSize === 0 ? "worker" : nt.transferSize === 0 ? "memcache" : "network"));
      set("dns", ms(nt.domainLookupEnd - nt.domainLookupStart));
      set("connect", ms(nt.connectEnd - nt.connectStart));
      set("tls", nt.secureConnectionStart > 0 ? ms(nt.connectEnd - nt.secureConnectionStart) : NA);
      set("ttfb", ms(nt.responseStart - nt.startTime));
      set("download", ms(nt.responseEnd - nt.responseStart));
      set("domReady", ms(nt.domContentLoadedEventEnd - nt.startTime));
      set("load", nt.loadEventEnd ? ms(nt.loadEventEnd - nt.startTime) : NA);
      set("transfer", bytes(nt.transferSize) + " over the wire · " + bytes(nt.decodedBodySize) + " HTML");
    } else {
      ["protocol", "servedFrom", "dns", "connect", "tls", "ttfb", "download", "domReady", "load", "transfer"].forEach(function (k) { set(k, NA); });
    }
    var res = performance.getEntriesByType("resource");
    set("resources", res.length + " files · " + bytes(res.reduce(function (n, r) { return n + (r.transferSize || 0); }, 0)) + " over the wire");
    set("nodes", document.getElementsByTagName("*").length + " elements");
    var fcp = performance.getEntriesByName("first-contentful-paint")[0];
    set("fcp", ms(fcp && fcp.startTime));
    // Largest paint and layout shift arrive as buffered observer entries; take what's there now.
    function observed(type) {
      var got = [];
      try {
        var o = new PerformanceObserver(function () {});
        o.observe({ type: type, buffered: true });
        got = o.takeRecords();
        o.disconnect();
      } catch (e) { /* not supported */ }
      return got;
    }
    var lcp = observed("largest-contentful-paint").slice(-1)[0];
    set("lcp", ms(lcp && lcp.startTime));
    var shifts = observed("layout-shift");
    var types = (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
    set("cls", shifts.length || types.indexOf("layout-shift") >= 0
      ? shifts.filter(function (s) { return !s.hadRecentInput; }).reduce(function (n, s) { return n + s.value; }, 0).toFixed(3) : NA);

    // Ping: three HEAD requests for stats.json, straight to the server (no-store skips every cache).
    var times = [], headers = null;
    for (var i = 0; i < 3; i++) {
      var t0 = performance.now();
      var r = await timeout(fetch(ROOT + "stats.json?ping=" + Date.now(), { method: "HEAD", cache: "no-store" }), 3000);
      if (!r) break;
      times.push(performance.now() - t0);
      if (!headers) headers = r.headers;
    }
    set("ping", times.length ? "min " + ms(Math.min.apply(null, times)) + " · avg " + ms(times.reduce(function (a, b) { return a + b; }, 0) / times.length) +
      " (" + times.length + " HEAD requests)" : NA);
    var h = function (k) { return headers && headers.get(k); };
    set("server", h("server") || NA);
    set("cdn", h("x-served-by") || h("via") || NA);
    set("cdnCache", [h("x-cache"), h("cache-control"), h("age") ? "age " + h("age") + "s" : null].filter(Boolean).join(" · ") || NA);
  }

  // ---------------------------------------------------------------- live values
  var frameCount = 0, fps = 0;
  function countFrames() { frameCount++; requestAnimationFrame(countFrames); }
  function live() {
    var heap = performance.memory;
    set("heap", heap ? bytes(heap.usedJSHeapSize) + " used · " + bytes(heap.totalJSHeapSize) + " allocated · " + bytes(heap.jsHeapSizeLimit) + " limit" : NA);
    set("viewport", innerWidth + "×" + innerHeight);
    set("clock", new Date().toLocaleString("en-CA", { hour12: false }).replace(",", ""));
    var s = Math.floor(performance.now() / 1000);
    set("uptime", Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s on this page");
    set("fps", fps ? fps + " fps" : "…");
    set("online", word(navigator.onLine ? "online" : "offline"));
  }

  async function main() {
    if (!term || !screenEl || !end) return;
    writeLines();
    set("now", when(new Date().toISOString()));
    set("memtest", nav.deviceMemory ? nav.deviceMemory * 1024 * 1024 + "K" : "640K");
    live();
    requestAnimationFrame(countFrames);
    await Promise.all([fromStats(), fromBrowser(), timeout(fromNetwork(), 2500)]);
    live();
    // Frame rate needs a second of counting: measure it now, so no "…" is left when the typing starts.
    await new Promise(function (r) { setTimeout(r, 1000); });
    fps = frameCount; frameCount = 0;
    live();
    term.addEventListener("terminal:done", function () {
      setInterval(function () { fps = frameCount; frameCount = 0; live(); }, 1000);
    }, { once: true });
    term.dispatchEvent(new CustomEvent("terminal:start"));
  }

  if (document.readyState === "complete") main();
  else addEventListener("load", function () { setTimeout(main); }, { once: true }); // after load ends, so "Load" has its time
})();
