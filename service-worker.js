const CACHE_NAME = "moses-lounge-v12";
const APP_FILES = ["./", "./index.html", "./privacy.html", "./styles.css?v=7", "./app.js?v=5", "./manifest.webmanifest", "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./assets/photos/sample-room.jpg", "./assets/photos/sample-room-2.jpg", "./assets/photos/sample-shop.jpg", "./assets/photos/sample-club.jpg", "./assets/photos/sample-lounge.jpg", "./assets/photos/sample-conference.jpg", "./assets/photos/sample-party-hall.jpg", "./assets/photos/sample-pool.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("moses-lounge-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw error;
    }
  })());
});
