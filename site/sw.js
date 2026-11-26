// Service worker: makes the site installable and lets the installed app (and the site in any browser) open with no signal.
// Adapted from Deovandski-repo-template's public/sw.js (same freshness rule as the Deovandski site, Deovandski/Deovandski#160).
//
// What it saves on the visitor's device (Cache Storage, never sent anywhere):
//   - when it installs: the home page and the scripts and font it loads, plus the manifest and icons;
//   - the page the visitor was on when it installed (so a first visit to /ja/ works offline too);
//   - every page the visitor opens afterwards, in any language;
//   - scripts, stylesheets and fonts as they load.
// What it never saves: images, video, or anything from other websites, so it can't fill the phone's storage.
//
// Everything it handles comes from the network first, asked with `cache: 'no-cache'` so the browser's own cache can't
// hand back an old copy (GitHub Pages lets browsers keep files for 10 minutes). When nothing changed, the server answers
// with a tiny "not modified". With no answer in 4 seconds, or no signal, the saved copy is used if there is one.
// So the first visit after a deploy always shows the new site. (This site has no build hashes in file names, so
// nothing is ever served from the saved copy first.)
// Every address the worker handles is under its scope (/vraki-windows/), so on the shared deovandski.github.io
// address it never touches the other repos' sites, and its saved files are named after that path.
//
// Change VERSION to throw away everything saved and start over (do it whenever this file's rules change).
const VERSION = 'v1';
const SCOPE = new URL(self.registration.scope);
const PREFIX = `site${SCOPE.pathname}`;         // "site/vraki-windows/": one name per site on a shared origin
const CACHE = `${PREFIX}${VERSION}`;
const HOME = SCOPE.href;
const EXTRA = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icon.png'].map((p) => new URL(p, SCOPE).href);
const WAIT_MS = 4000;

/** A request that skips the browser's own cache, so what gets saved is what the server has now. */
const fresh = (href) => new Request(href, { cache: 'no-cache', credentials: 'same-origin' });
const inScope = (url) => url.origin === SCOPE.origin && url.href.startsWith(SCOPE.href);
/** A page's address without #hash or ?query, so /?x and /#try share one saved copy. */
const pageKey = (url) => url.origin + url.pathname;

/** Same-site stylesheets, scripts and preloads (the Vraki font) in a page's HTML, never its images. */
function assetsOf(html, pageUrl) {
  const found = new Set();
  for (const m of html.matchAll(/<(?:link|script)\b[^>]*?\s(?:href|src)="([^"]+)"[^>]*>/gi)) {
    if (/^<link/i.test(m[0]) && !/rel="(?:stylesheet|modulepreload|preload)"/i.test(m[0])) continue;
    const url = new URL(m[1].replace(/&amp;/g, '&'), pageUrl);
    if (inScope(url)) found.add(url.href);
  }
  return [...found];
}

/** Fetch a page, save it and (best effort) the files it needs. */
async function savePage(pageUrl) {
  const url = new URL(pageUrl);
  if (!inScope(url)) return;
  const cache = await caches.open(CACHE);
  const res = await fetch(url.href, { cache: 'no-cache' });
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return;
  const html = await res.clone().text();
  await cache.put(pageKey(url), res);
  await Promise.allSettled(assetsOf(html, url.href).map((f) => cache.add(fresh(f))));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await savePage(HOME).catch(() => {});
    const cache = await caches.open(CACHE);
    await Promise.allSettled(EXTRA.map((f) => cache.add(fresh(f))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The page that registered the worker loaded before the worker existed; it asks to be saved (see index.html).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'save-page' && typeof data.url === 'string') event.waitUntil(savePage(data.url).catch(() => {}));
});

/** The latest copy from the server, saved for offline; the saved copy only with no signal or no answer in WAIT_MS.
 *  A navigation request can't be copied with new options, so it is fetched again by its address. */
async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  const network = fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // no signal: fall through to the saved copy
  }
  return (await cache.match(key)) ?? network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!inScope(url)) return; // other websites, and other repos' sites on the same address: hands off

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, pageKey(url)));
    return;
  }
  if (!['style', 'script', 'font', 'manifest'].includes(request.destination)) return; // images, video: the browser's normal way
  event.respondWith(networkFirst(request, url.href)); // the query string counts (x.js?v=2 is not x.js?v=1)
});
