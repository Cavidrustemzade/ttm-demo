// TTM Tədris Mərkəzi - Service Worker
// Sadə "cache-first, sonra şəbəkə" strategiyası: sayt bir dəfə açılandan sonra
// zəif internetdə də sürətli açılır, tam offline halda əsas səhifə yenə görünür.

const CACHE_NAME = "ttm-cache-v2";
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
