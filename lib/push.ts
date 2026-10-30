import { supabase } from "@/lib/supabase"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
const ENABLED_FLAG = "push_enabled" // kullanıcı bildirimi bu cihazda bilerek açtı mı

/** Bildirime dokunulunca (uygulama açıkken) page.tsx'e "İlanlar sekmesini aç + yenile" demek için */
export const OPEN_LISTINGS_EVENT = "nakliye:open-listings"

export type PushState = "unsupported" | "denied" | "on" | "off"

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

function urlBase64ToUint8Array(b64: string) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Bayrak artık KULLANICIYA özel: aynı cihazda başka hesap açılınca eski hesabın "açık" bilgisi ona geçmez.
const flagKey = (uid: string) => `${ENABLED_FLAG}:${uid}`
const flag = {
  get: (uid: string) => { try { return localStorage.getItem(flagKey(uid)) === "1" } catch { return false } },
  set: (uid: string, on: boolean) => { try { on ? localStorage.setItem(flagKey(uid), "1") : localStorage.removeItem(flagKey(uid)) } catch {} },
}

async function sessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Bu cihazın bildirim adresi, GİRİŞ YAPMIŞ kullanıcının hesabına mı kayıtlı? (RLS: yalnızca kendi satırlarını görür) */
async function ownsEndpoint(endpoint: string): Promise<boolean | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle()
  if (error) return null // bilinmiyor: yanlışlıkla silmeyelim
  return !!data
}

/** Bu cihazın kaydını (hangi hesaba bağlı olursa olsun) sunucudan düşürür. */
async function releaseEndpoint(endpoint: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc("release_push_endpoint", { p_endpoint: endpoint })
  if (error) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
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
    if (!sub || Notification.permission !== "granted") return "off"
    // Tarayıcıda abonelik olması yetmez: bu cihaz GİRİŞ YAPILAN hesaba kayıtlı olmalı
    if ((await sessionUserId()) && (await ownsEndpoint(sub.endpoint)) === false) return "off"
    return "on"
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
    const uid = await sessionUserId()
    if (uid) flag.set(uid, true)
    return { ok: true }
  } catch (e) {
    console.error("Push aboneliği başarısız:", e)
    return { ok: false, error: "Bildirim açılamadı: " + ((e as Error)?.name || "") + " " + ((e as Error)?.message || "") }
  }
}

/** Bu cihazda bildirimleri kapatır (abonelik hem tarayıcıdan hem veritabanından silinir). */
export async function disablePush(): Promise<void> {
  const uid = await sessionUserId()
  if (uid) flag.set(uid, false)
  try {
    const reg = await getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await releaseEndpoint(sub.endpoint)
      await sub.unsubscribe()
    }
  } catch (e) {
    console.error("Push kapatılamadı:", e)
  }
}

/** Service worker kaydını bekletmeden alır (çıkış yaparken takılmasın diye). */
async function getRegistrationNow(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!("serviceWorker" in navigator)) return null
    return (await Promise.race([
      navigator.serviceWorker.getRegistration(),
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000)),
    ])) ?? null
  } catch {
    return null
  }
}

/**
 * ÇIKIŞ YAPARKEN çağrılır: bu cihazın bildirim kaydını hesabın üzerinden SİLER.
 * (Tarayıcı aboneliği kalır; aynı kullanıcı tekrar girerse otomatik yeniden bağlanır, başka kullanıcı girerse eski hesabın bildirimleri gelmez.)
 */
export async function releaseDevicePush(): Promise<void> {
  try {
    if (!pushSupported()) return
    const reg = await getRegistrationNow()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await releaseEndpoint(sub.endpoint)
  } catch (e) {
    console.error("Cihaz kaydı düşürülemedi:", e)
  }
}

/** Tüm çıkış düğmeleri bunu kullanır: önce cihaz kaydı düşer, sonra oturum kapanır. */
export async function signOutClean(): Promise<void> {
  await releaseDevicePush()
  if (supabase) await supabase.auth.signOut()
}

let lastSync = { uid: "", at: 0 }
/**
 * Sessiz bakım (uygulama açılınca / oturum değişince çalışır):
 *  - bu cihaz BAŞKA bir hesaba kayıtlıysa ve şu anki kullanıcı bildirimi açmadıysa kaydı düşürür (eski hesabın bildirimleri akmasın),
 *  - şu anki kullanıcı bildirimi açmışsa (Premium) tarayıcının yenilediği abonelik adresini sunucuya yazar,
 *  - eski VAPID anahtarıyla yapılmış aboneliği düzeltir.
 */
export async function syncPush(force = false, entitled = true): Promise<void> {
  try {
    if (!pushSupported() || !VAPID_PUBLIC_KEY || !supabase) return
    if (Notification.permission !== "granted") return
    const uid = await sessionUserId()
    if (!uid) return
    if (!force && lastSync.uid === uid && Date.now() - lastSync.at < 10 * 60_000) return
    lastSync = { uid, at: Date.now() }
    const reg = await getRegistration()
    if (!reg) return
    const existing = await reg.pushManager.getSubscription()
    if (!existing) return // kullanıcı hiç açmamış ya da kapatmış

    const mine = await ownsEndpoint(existing.endpoint)
    if (mine === null) return // sunucuya ulaşılamadı: dokunma
    if (mine) flag.set(uid, true) // eski sürümden gelen kayıt: bayrağı bu kullanıcıya taşı

    if (!flag.get(uid)) {
      // Bu kullanıcı bildirimi açmadı: cihaz önceki hesaba kayıtlıysa oradan düşür
      await releaseEndpoint(existing.endpoint)
      return
    }
    if (!entitled) return // Premium bitmiş: kayıt kalsın, sunucu zaten Premium olmayana göndermez
    const sub = await ensureSubscription(reg, true)
    if (sub) await saveSubscription(sub)
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
