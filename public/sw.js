// Service worker: önbellek tutmaz (güncel ilan verisi eski önbellekten gelmesin) + Web Push bildirimleri.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))
self.addEventListener("fetch", () => {})

// Sunucudan gelen bildirimi göster. Beklenen JSON: { title, body, url, tag, phone }
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
    badge: "/icon-192.png",
    lang: "tr",
    timestamp: Date.now(),
    vibrate: [200, 100, 200],
    data: { url: data.url || "/", phone: data.phone || "" },
  }
  // Telefon varsa bildirimde "Ara" düğmesi göster
  if (data.phone) options.actions = [{ action: "call", title: "Ara" }]
  if (data.tag) { options.tag = data.tag; options.renotify = true } // aynı etiket = eskisinin yerine geçer
  event.waitUntil(self.registration.showNotification(data.title || "Nakliye Cepte", options))
})

// Bildirime dokununca uygulamayı aç / öne getir (varsa açık pencereyi ilgili adrese yönlendirir)
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  const phone = (event.notification.data && event.notification.data.phone) || ""
  // "Ara" düğmesi: doğrudan arama ekranını aç (olmazsa uygulamayı açar)
  if (event.action === "call" && phone) {
    event.waitUntil(self.clients.openWindow("tel:" + phone).catch(() => self.clients.openWindow(url)))
    return
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      for (const c of list) {
        if ("focus" in c) {
          try { await c.focus() } catch {}
          // Açık pencere varsa ilanlar yenilensin diye ona haber ver
          c.postMessage({ type: "notification-click", url })
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Tarayıcı abonelik adresini yenilediyse açık pencereye haber ver; uygulama yeni adresi sunucuya kaydeder.
// (Pencere kapalıysa bir sonraki açılışta lib/push.ts > syncPush bunu düzeltir.)
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) c.postMessage({ type: "push-resubscribe" })
    })
  )
})
