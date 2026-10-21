// Service worker: önbellek tutmaz (güncel ilan verisi eski önbellekten gelmesin) + Web Push bildirimleri.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})

// Sunucudan gelen bildirimi göster. Beklenen JSON: { title, body, url, tag }
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    data: { url: data.url || "/" },
  }
  if (data.tag) { options.tag = data.tag; options.renotify = true } // aynı etiket = eskisinin yerine geçer
  event.waitUntil(self.registration.showNotification(data.title || "Nakliye Cepte", options))
})

// Bildirime dokununca uygulamayı aç / öne getir
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
