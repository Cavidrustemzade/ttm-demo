// TTM Tədris Mərkəzi - Service Worker
// Səhifələr (HTML): əvvəl internet — yeniliklər dərhal görünsün; internet yoxdursa keşdən.
// Digər fayllar (şəkil, ikon): əvvəl keş, arxada yenilənir.

const CACHE_NAME = "ttm-cache-v3";
const APP_SHELL = [
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Firebase və xarici API sorğularına toxunmuruq - onlar həmişə birbaşa şəbəkəyə getsin
  if (event.request.method !== "GET" || event.request.url.includes("firestore") || event.request.url.includes("googleapis")) {
    return;
  }
  const isPage = event.request.mode === "navigate" || /\.html(\?|$)/.test(new URL(event.request.url).pathname);
  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./app.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
