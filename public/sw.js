// Basit service worker: önbellek tutmaz, istekleri doğrudan ağa iletir.
// (Güncel ilan verisinin eski önbellekten gelmesini önler; PWA kurulabilirliği için fetch dinleyicisi yeterlidir.)
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})
