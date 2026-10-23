// Supabase Edge Function: yeni ilan eklenince uygun Premium kullanıcılara Web Push gönderir.
// Tetikleyici: 003_bildirim_gonder.sql (listings / bot_listings INSERT -> pg_net -> bu fonksiyon)
// Ayrıca: giriş yapmış Premium kullanıcı { "test": true } ile KENDİ cihazlarına test bildirimi gönderebilir.
//
// Deploy:  supabase functions deploy notify-listing --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:siz@ornek.com NOTIFY_WEBHOOK_SECRET=...
// NOT: ../_shared kullanır -> Supabase CLI ile deploy edin.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import { analyzeListing, fold } from "../_shared/route.ts"

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || ""
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || ""
const WEBHOOK_SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET") || ""

const FLUSH_DELAY_MS = 62_000 // 003/006 SQL'deki 1 dakikalık throttle penceresi + pay

const ALLOWED_ORIGINS = ["https://nakliyecepte.online", "https://www.nakliyecepte.online", "http://localhost:3000"]

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || ""
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-webhook-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } })

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

type Rec = {
  id?: string | number
  user_id?: string | null
  from_city?: string | null
  to_city?: string | null
  cargo_detail?: string | null
  message?: string | null
  vehicle_type?: string | null
  urgent?: boolean | null
  phone?: string | null
  created_at?: string
}
type Route = { id: string; user_id: string; from_city: string; direction?: "from" | "to" | "both" | null; vehicle: string | null; urgent_only: boolean }
type Sub = { endpoint: string; p256dh: string; auth: string }

let vapidReady = false
function initVapid() {
  if (vapidReady) return
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  vapidReady = true
}

/** Cihazlara gönderir; süresi dolmuş (404/410) abonelikleri veritabanından siler. */
async function sendAll(db: SupabaseClient, subs: Sub[], payload: Record<string, unknown>) {
  initVapid()
  const body = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0
  for (let i = 0; i < subs.length; i += 20) {
    await Promise.all(
      subs.slice(i, i + 20).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            TTL: 3600,
            urgency: "high",
          })
          sent++
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) dead.push(s.endpoint)
          else console.error("push gönderilemedi:", code, (e as Error)?.message)
        }
      }),
    )
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead)
  return { sent, removed: dead.length }
}

async function subsOf(db: SupabaseClient, userIds: string[]): Promise<Map<string, Sub[]>> {
  const map = new Map<string, Sub[]>()
  if (!userIds.length) return map
  const { data } = await db.from("push_subscriptions").select("user_id,endpoint,p256dh,auth").in("user_id", userIds)
  for (const r of (data || []) as (Sub & { user_id: string })[]) {
    const list = map.get(r.user_id) || []
    list.push(r)
    map.set(r.user_id, list)
  }
  return map
}

const PHONE_RE = /(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/

const stripEmoji = (t: string) =>
  t.replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u231A-\u23FF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uFE0F|\u200D/g, "")
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t)

/** Bot ilanları aynı metinle tekrar tekrar gelir; son 6 saatte aynısı varsa bildirim atma. */
async function isRepeatedBot(db: SupabaseClient, rec: Rec): Promise<boolean> {
  if (!rec.cargo_detail || !rec.created_at) return false
  const since = new Date(new Date(rec.created_at).getTime() - 6 * 3600_000).toISOString()
  const { data } = await db
    .from("bot_listings")
    .select("id")
    .eq("cargo_detail", rec.cargo_detail)
    .gte("created_at", since)
    .lt("created_at", rec.created_at)
    .limit(1)
  return !!data?.length
}

async function handleListing(db: SupabaseClient, table: string, rec: Rec) {
  const isUser = table === "listings"
  const a = analyzeListing({
    from: rec.from_city,
    to: rec.to_city,
    cargo: rec.cargo_detail,
    message: rec.message,
    vehicle: rec.vehicle_type,
    trustFields: isUser,
  })
  const fromCity = a.from?.city
  const toCity = a.to?.city
  const cities = Array.from(new Set([fromCity, toCity, ...a.cities].filter(Boolean))) as string[]
  if (!cities.length) return

  if (!isUser && (await isRepeatedBot(db, rec))) return

  const { data: routes, error } = await db.rpc("notify_candidate_routes", { p_cities: cities })
  if (error) { console.error("notify_candidate_routes hatası:", error.message); return }
  if (!routes?.length) return

  const rawText = `${rec.cargo_detail || ""} ${rec.message || ""}`
  const urgent = rec.urgent === true || /\bacil\b/.test(fold(rawText))
  const vehicleTokens = a.vehicle ? fold(a.vehicle).split(/\s+/).filter(Boolean) : []

  const matches = (routes as Route[]).filter((r) => {
    if (rec.user_id && r.user_id === rec.user_id) return false // kendi ilanı için bildirim yok
    // YÖN KESİN: "from" = yalnızca bu şehirden ÇIKAN, "to" = yalnızca bu şehre GİDEN, "both" = ikisinden biri.
    // Yön bilgisi yoksa/bilinmiyorsa en dar anlam ("çıkan") kullanılır; metinde sadece geçen şehir (örn. güzergâh üstü) eşleşme sayılmaz.
    const dir = r.direction === "to" || r.direction === "both" ? r.direction : "from"
    const ok =
      dir === "from" ? fromCity === r.from_city && toCity !== r.from_city
      : dir === "to" ? toCity === r.from_city && fromCity !== r.from_city
      : fromCity === r.from_city || toCity === r.from_city
    if (!ok) return false
    if (r.urgent_only && !urgent) return false
    // Araç filtresi: ilandan araç tipi çıkarılamadıysa kaçırmamak için bildirim gönderilir
    if (r.vehicle && vehicleTokens.length) {
      const want = fold(r.vehicle).split(/\s+/).filter(Boolean)
      if (!want.every((w) => vehicleTokens.includes(w))) return false
    }
    return true
  })
  if (!matches.length) return

  const place = fromCity && toCity ? `${fromCity} → ${toCity}` : fromCity ? `${fromCity} çıkışlı` : toCity ? `${toCity} varışlı` : "Yeni ilan"
  const info = [a.vehicle, a.trailer, a.tonnage, a.timing].filter(Boolean).join(" · ")
  const cargo = clip(stripEmoji(a.cargoText || "").replace(/\s+/g, " ").trim(), 110)
  const bodyText = [info, cargo].filter(Boolean).join(" — ") || "Detaylar için dokunun."
  // Telefon: kayıttaki alan ya da ilan metnindeki cep numarası (bildirimde "Ara" düğmesi için)
  const m = (rec.phone || "").match(PHONE_RE) || rawText.match(PHONE_RE)
  const digits = m ? m[0].replace(/\D/g, "") : ""
  const phone = digits.length >= 10 ? "0" + digits.slice(-10) : ""

  const sendNow: { route: Route; total: number }[] = []
  const toFlush: Route[] = []
  for (const r of matches) {
    const { data: total, error: cErr } = await db.rpc("claim_route_notification", { p_route: r.id })
    if (cErr) { console.error("claim hatası:", cErr.message); continue }
    if (typeof total !== "number") continue
    if (total > 0) sendNow.push({ route: r, total })
    else if (total === -1) toFlush.push(r)
  }

  if (sendNow.length) {
    const subs = await subsOf(db, Array.from(new Set(sendNow.map((s) => s.route.user_id))))
    for (const { route, total } of sendNow) {
      const list = subs.get(route.user_id) || []
      if (!list.length) continue
      await sendAll(db, list, {
        title: (urgent ? "ACİL · " : "") + (total > 1 ? `${total} yeni ilan · ${route.from_city}` : place),
        body: bodyText,
        url: "/",
        tag: `route-${route.id}`,
        phone: total > 1 ? "" : phone,
      })
    }
  }

  // Throttle yüzünden bekleyen ilanlar: pencere dolunca tek bildirimle haber ver
  for (const r of toFlush) schedule(flushLater(db, r))
}

async function flushLater(db: SupabaseClient, route: Route) {
  await new Promise((res) => setTimeout(res, FLUSH_DELAY_MS))
  const { data: n } = await db.rpc("flush_route_pending", { p_route: route.id })
  if (typeof n !== "number" || n <= 0) return
  const subs = (await subsOf(db, [route.user_id])).get(route.user_id) || []
  if (!subs.length) return
  await sendAll(db, subs, {
    title: `${n} yeni ilan · ${route.from_city}`,
    body: "Yeni ilanları görmek için dokunun.",
    url: "/",
    tag: `route-${route.id}`,
  })
}

function schedule(p: Promise<unknown>) {
  const safe = p.catch((e) => console.error("arka plan hatası:", e))
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(safe)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return json(req, { ok: false, error: "method" }, 405)
  if (!SUPABASE_URL || !SERVICE || !ANON || !VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT || !WEBHOOK_SECRET) {
    console.error("Eksik secret: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT / NOTIFY_WEBHOOK_SECRET")
    return json(req, { ok: false, error: "config" }, 500)
  }
  const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

  try {
    const hook = req.headers.get("x-webhook-secret")

    // A) Veritabanı tetikleyicisi (yeni ilan)
    if (hook !== null) {
      if (!safeEqual(hook, WEBHOOK_SECRET)) return json(req, { ok: false, error: "unauthorized" }, 401)
      const payload = await req.json().catch(() => null)
      const table = String(payload?.table || "")
      const rec = payload?.record as Rec | undefined
      if (!rec || (table !== "listings" && table !== "bot_listings")) return json(req, { ok: true, skipped: true })

      const job = handleListing(db, table, rec).catch((e) => console.error("handleListing hatası:", e))
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(job)
        return json(req, { ok: true, queued: true }, 202)
      }
      await job
      return json(req, { ok: true })
    }

    // B) Kullanıcının kendi cihazlarına test bildirimi
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    if (!jwt) return json(req, { ok: false, error: "unauthorized" }, 401)
    const { data: u } = await createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } }).auth.getUser(jwt)
    if (!u?.user) return json(req, { ok: false, error: "unauthorized" }, 401)
    const body = await req.json().catch(() => ({}))
    if (!body?.test) return json(req, { ok: false, error: "bad_request" }, 400)

    const { data: prem } = await db.rpc("is_premium", { uid: u.user.id })
    if (!prem) return json(req, { ok: false, error: "premium_required" }, 403)

    const subs = (await subsOf(db, [u.user.id])).get(u.user.id) || []
    if (!subs.length) return json(req, { ok: false, error: "no_device", devices: 0 })
    const r = await sendAll(db, subs, {
      title: "Nakliye Cepte · Test",
      body: "Bildirimler bu cihazda çalışıyor.",
      url: "/",
      tag: "test",
    })
    return json(req, { ok: r.sent > 0, devices: subs.length, ...r })
  } catch (e) {
    console.error("notify-listing hatası:", e)
    return json(req, { ok: false, error: "exception" }, 500)
  }
})
