// Install app: an "Install app" button for an installable site (a web app manifest and a service worker).
// Ported from the Deovandski site's src/components/reusable/InstallApp.astro (Deovandski/Deovandski#293, #292).
//
// It shows the button only when the browser can install the site right now (Chrome, Edge, Samsung Internet), and
// otherwise a short line on how to get there: "Open this page in Chrome" on Android (links opened from WhatsApp,
// Instagram or Gmail land in a viewer with no install option), "Share, then Add to Home Screen" on iPhone and iPad,
// and which browsers can install it anywhere else. Inside the installed app it says so; right after installing too.
//
// Usage:
//   <link rel="stylesheet" href="install-app.css">
//   <script>/* in <head>, so the browser's offer is kept even if it comes early: */
//     if (!window.__installAppPrompt) { window.__installAppPrompt = { event: null };
//       addEventListener("beforeinstallprompt", function (e) { window.__installAppPrompt.event = e;
//         document.dispatchEvent(new CustomEvent("install-app:ready")); }); }</script>
//   <div class="install-app" data-install-app>
//     <button type="button" class="install-app__btn" hidden><svg …></svg><span>Install app</span></button>
//     <p class="install-app__note" aria-live="polite"></p>
//   </div>
//   <div id="ui-strings" hidden>
//     <span data-k="install-app.installed">You’re using the installed app.</span>
//     <span data-k="install-app.done">Installed! Open it from your home screen or app list.</span>
//     <span data-k="install-app.android">No install button? Open this page in Chrome (⋮ → Open in Chrome), then ⋮ → Install app.</span>
//     <span data-k="install-app.ios">On iPhone or iPad: tap Share, then Add to Home Screen.</span>
//     <span data-k="install-app.other">To install it, open this page in Chrome, Edge or Samsung Internet. On iPhone or iPad: Share, then Add to Home Screen.</span>
//   </div>
//   <script src="install-app.js" defer></script>
//
// Options (data attributes on the [data-install-app] element):
//   data-strings="#ui-strings"   where its words live (default #ui-strings). Each is a [data-k="install-app.<key>"],
//                                so the site's translations reach them. A [data-k] inside the element itself wins.
//
// Nothing is saved. Keyboard and screen reader friendly: a real button, and the hint line is read out when it changes
// (aria-live). It works when used several times on a page, and has no motion.
(function () {
  "use strict";
  var standalone = function () {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  };
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var keep = function () { return window.__installAppPrompt; };

  document.querySelectorAll("[data-install-app]").forEach(function (root) {
    var btn = root.querySelector(".install-app__btn");
    var note = root.querySelector(".install-app__note");
    if (!btn || !note) return;
    var strings = document.querySelector(root.getAttribute("data-strings") || "#ui-strings");
    var msg = function (k) {
      var sel = '[data-k="install-app.' + k + '"]';
      var el = root.querySelector(sel) || (strings && strings.querySelector(sel));
      return el ? el.textContent.trim() : "";
    };
    // What to show: the button when the browser can install the site now, otherwise how to get there.
    var show = function () {
      if (standalone()) {
        btn.hidden = true;
        note.textContent = msg("installed");
      } else if (keep() && keep().event) {
        btn.hidden = false;
        note.textContent = "";
      } else {
        btn.hidden = true;
        note.textContent = msg(ios ? "ios" : android ? "android" : "other");
      }
    };
    var done = function () {
      btn.hidden = true;
      note.textContent = msg("done");
    };
    btn.addEventListener("click", function () {
      var e = keep() && keep().event;
      if (!e) return show();
      keep().event = null; // the browser's offer can only be used once
      e.prompt();
      e.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") done(); else show();
      }, show);
    });
    document.addEventListener("install-app:ready", show);
    addEventListener("appinstalled", done);
    show();
  });
})();
