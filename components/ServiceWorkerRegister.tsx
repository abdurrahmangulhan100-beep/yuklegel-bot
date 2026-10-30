"use client"

import { useEffect } from "react"
import { OPEN_LISTINGS_EVENT, syncPush } from "@/lib/push"

/** PWA için service worker kaydı (yalnızca production) + service worker mesajlarını dinler. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {})

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "push-resubscribe") syncPush(true)
      // Uygulama açıkken bildirime dokunuldu: İlanlar sekmesini aç ve listeyi yenile
      if (e.data?.type === "notification-click") window.dispatchEvent(new Event(OPEN_LISTINGS_EVENT))
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])
  return null
}
