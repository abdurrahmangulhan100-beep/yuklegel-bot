import { supabase } from "@/lib/supabase"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const ENABLED_FLAG = "push_enabled" // kullanıcı bildirimi bu cihazda bilerek açtı mı

export type PushState = "unsupported" | "denied" | "on" | "off"

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

function urlBase64ToUint8Array(b64: string) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const flag = {
  get: () => { try { return localStorage.getItem(ENABLED_FLAG) === "1" } catch { return false } },
  set: (on: boolean) => { try { on ? localStorage.setItem(ENABLED_FLAG, "1") : localStorage.removeItem(ENABLED_FLAG) } catch {} },
}

/** Service worker hazır olana kadar bekler (kayıt henüz bitmemiş olabilir); en fazla 6 sn. */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration()
    if (existing?.active) return existing
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
    ])
  } catch {
    return null
  }
}

/** Abonelik başka bir VAPID anahtarıyla yapılmışsa sunucu 403 döner; bunu yakalarız. */
function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const cur = sub.options?.applicationServerKey
  if (!cur) return true
  const a = new Uint8Array(cur)
  return a.length === key.length && a.every((v, i) => v === key[i])
}

async function saveSubscription(sub: PushSubscription): Promise<boolean> {
  if (!supabase) return false
  const json = sub.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) return false
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  })
  return !error
}

/** Geçerli (doğru anahtarlı) bir abonelik döndürür; yoksa/uyumsuzsa yenisini oluşturur. */
async function ensureSubscription(reg: ServiceWorkerRegistration, createIfMissing: boolean): Promise<PushSubscription | null> {
  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  let sub = await reg.pushManager.getSubscription()
  if (sub && !sameKey(sub, key)) {
    await sub.unsubscribe().catch(() => {})
    sub = null
  }
  if (!sub && createIfMissing) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource })
  }
  return sub
}

/** Bu cihazda bildirim durumu: kapalı / açık / izin reddedilmiş / desteklenmiyor */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"
  try {
    const reg = await getRegistration()
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
    const reg = await getRegistration()
    if (!reg) return { ok: false, error: "Bildirimler yalnızca yayındaki sürümde çalışır." }
    const sub = await ensureSubscription(reg, true)
    if (!sub) return { ok: false, error: "Bildirim açılamadı, tekrar deneyin." }
    if (!(await saveSubscription(sub))) return { ok: false, error: "Kaydedilemedi, tekrar deneyin." }
    flag.set(true)
    return { ok: true }
  } catch (e) {
    console.error("Push aboneliği başarısız:", e)
    return { ok: false, error: "Bildirim açılamadı: " + ((e as Error)?.name || "") + " " + ((e as Error)?.message || "") }
  }
}

/** Bu cihazda bildirimleri kapatır (abonelik hem tarayıcıdan hem veritabanından silinir). */
export async function disablePush(): Promise<void> {
  flag.set(false)
  try {
    const reg = await getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (e) {
    console.error("Push kapatılamadı:", e)
  }
}

let lastSync = 0
/**
 * Sessiz bakım (Premium kullanıcı uygulamayı açınca çalışır):
 *  - tarayıcının yenilediği/değiştirdiği abonelik adresini sunucuya yazar,
 *  - sistem aboneliği düşürmüşse (kullanıcı bildirimi bilerek kapatmadıysa) yeniden oluşturur,
 *  - eski VAPID anahtarıyla yapılmış aboneliği düzeltir.
 * Bu olmadan "bir süre sonra bildirimler gelmiyor" sorunu oluşur.
 */
export async function syncPush(force = false): Promise<void> {
  try {
    if (!pushSupported() || !VAPID_PUBLIC_KEY || !supabase) return
    if (Notification.permission !== "granted") return
    if (!force && Date.now() - lastSync < 10 * 60_000) return
    if (!(await supabase.auth.getSession()).data.session) return
    lastSync = Date.now()
    const reg = await getRegistration()
    if (!reg) return
    const existing = await reg.pushManager.getSubscription()
    if (!existing && !flag.get()) return // kullanıcı hiç açmamış ya da kapatmış
    const sub = await ensureSubscription(reg, true)
    if (sub && (await saveSubscription(sub))) flag.set(true)
  } catch (e) {
    console.error("Push senkronu başarısız:", e)
  }
}

/** Sunucudan KENDİ cihazlarına test bildirimi ister (Premium + açık bildirim gerekir). */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Bağlantı kurulamadı." }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, message: "Önce giriş yapın." }
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-listing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ test: true }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.status === 403) return { ok: false, message: "Premium aboneliğiniz aktif değil." }
    if (j.error === "no_device") return { ok: false, message: "Bu hesapta kayıtlı cihaz yok. Önce \"Aç\" düğmesine dokunun." }
    if (!res.ok && !j.devices) return { ok: false, message: "Test gönderilemedi (sunucu hatası). Edge Function loglarına bakın." }
    if (j.ok) return { ok: true, message: `Test bildirimi gönderildi (${j.sent} cihaz). Birkaç saniye içinde gelmelidir.` }
    return { ok: false, message: "Cihaz kaydınız geçersiz olduğu için silindi. Bildirimi \"Kapat\" → \"Aç\" yapıp tekrar deneyin." }
  } catch {
    return { ok: false, message: "İnternet bağlantısı yok." }
  }
}
