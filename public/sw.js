// Service worker: önbellek tutmaz (güncel ilan verisi eski önbellekten gelmesin).
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})
