import { supabase } from "@/lib/supabase"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

export type PushState = "unsupported" | "denied" | "on" | "off"

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

function urlBase64ToUint8Array(b64: string) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Bu cihazda bildirim durumu: kapalı / açık / izin reddedilmiş / desteklenmiyor */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    return sub && Notification.permission === "granted" ? "on" : "off"
  } catch {
    return "off"
  }
}

/** İzin ister, cihazı abone eder ve Supabase'e kaydeder. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Bu cihaz bildirimleri desteklemiyor." }
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: "Bildirim anahtarı tanımlı değil." }
  if (!supabase || !(await supabase.auth.getSession()).data.session) return { ok: false, error: "Bildirimler için giriş yapın." }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return { ok: false, error: "Bildirim izni verilmedi." }

  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return { ok: false, error: "Bildirimler yalnızca yayındaki sürümde çalışır." }
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }))
    const json = sub.toJSON()
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh ?? "",
      p_auth: json.keys?.auth ?? "",
    })
    if (error) return { ok: false, error: "Kaydedilemedi, tekrar deneyin." }
    return { ok: true }
  } catch (e) {
    console.error("Push aboneliği başarısız:", e)
    return { ok: false, error: "Bildirim açılamadı." }
  }
}

/** Bu cihazda bildirimleri kapatır (abonelik hem tarayıcıdan hem veritabanından silinir). */
export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (e) {
    console.error("Push kapatılamadı:", e)
  }
}
