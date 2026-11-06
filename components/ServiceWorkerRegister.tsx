"use client"

import { useEffect } from "react"

/** PWA için service worker kaydı (yalnızca production). Eski sürümlerden kalan push aboneliklerini sessizce temizler. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => reg.pushManager?.getSubscription().then((sub) => sub?.unsubscribe()))
      .catch(() => {})
  }, [])
  return null
}
