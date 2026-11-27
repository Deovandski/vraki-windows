// The Settings menu (gear, top right) on every page: language and text size, remembered in this browser under the key
// in <html data-store> ("vraki-site"). The × (a value="close" button in the method="dialog" form) and Esc close it.
// Switching language keeps you on the same page: data-root is the way back to the site's root, data-page this page's
// folder ("" for the home page, "debug/" for Stats for nerds), so /ja/debug/ becomes /fr/debug/.
(function () {
  "use strict";
  var root = document.documentElement, KEY = root.dataset.store || "vraki-site";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(patch) {
    var s = load();
    for (var k in patch) s[k] = patch[k];
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: lasts for this page only */ }
  }
  function langHref(code) {
    return (root.dataset.root || "./") + (code === "en" ? "" : code + "/") + (root.dataset.page || "") + location.hash;
  }
  function goLang(code) { save({ lang: code }); location.href = langHref(code); }

  var sd = document.getElementById("site-settings"), gear = document.getElementById("gear");
  if (!sd || !gear) return;
  gear.addEventListener("click", function () {
    if (typeof sd.showModal === "function") sd.showModal(); else sd.setAttribute("open", "");
  });
  // the banner's "English" link (and anything with data-lang-switch) remembers the choice too
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-lang-switch]");
    if (a) { e.preventDefault(); goLang(a.dataset.langSwitch); }
  });
  var langSel = sd.querySelector('[data-setting="lang"]'), sizeIn = sd.querySelector('[data-setting="size"]');
  langSel.value = root.dataset.lang || "en";
  langSel.addEventListener("change", function () { goLang(langSel.value); });
  sizeIn.value = load().size || 17;
  sizeIn.addEventListener("input", function () {
    root.style.setProperty("--scale", sizeIn.value / 17);
    save({ size: +sizeIn.value });
  });
})();
