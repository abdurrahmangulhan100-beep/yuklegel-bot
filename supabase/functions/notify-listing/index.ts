// Supabase Edge Function: yeni ilan eklenince rotası uyan kullanıcılara Web Push gönderir.
// Deploy:  supabase functions deploy notify-listing --no-verify-jwt
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:siz@ornek.com NOTIFY_WEBHOOK_SECRET=<003 SQL'deki GIZLI_ANAHTAR ile aynı>
import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const SECRET = Deno.env.get("NOTIFY_WEBHOOK_SECRET") || ""
const MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 saatten eski ilan için bildirim gönderme (bot toplu eski kayıt eklese bile)

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:admin@nakliyecepte.online",
  Deno.env.get("VAPID_PUBLIC_KEY") || "",
  Deno.env.get("VAPID_PRIVATE_KEY") || "",
)

const MAP: Record<string, string> = { "ı": "i", "İ": "i", "I": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c" }
const fold = (s: string) => Array.from(s || "").map((c) => MAP[c] ?? c.toLowerCase()).join("")
// Günlük dilde başka anlamı olan şehir adları: yalnızca "Van'a", "Muş'tan" gibi ekli yazımda sayılır
const WEAK = new Set(["van", "mus", "ordu", "kilis", "tokat", "agri"])

function mentions(text: string, city: string): boolean {
  const c = fold(city).trim()
  if (!c) return false
  const f = fold(text)
  const re = WEAK.has(c) ? new RegExp(`(^|[^a-z0-9])${c}['’]`) : new RegExp(`(^|[^a-z0-9])${c}`)
  return re.test(f)
}

type Row = Record<string, unknown>
type Route = { id: string; user_id: string; from_city: string | null; to_city: string | null; vehicle: string | null; urgent_only: boolean }

function routeMatches(r: Route, rec: Row, isUser: boolean): boolean {
  const text = [rec.cargo_detail, rec.message, rec.text].filter(Boolean).join(" ")
  const vehicleText = [rec.vehicle_type, text].filter(Boolean).join(" ")
  if (r.urgent_only && !rec.urgent) return false

  const cityOk = (route: string | null, field: unknown) => {
    if (!route) return true
    if (isUser && field && String(field).trim() && fold(String(field)).includes(fold(route))) return true
    return mentions(text, route) || mentions(String(field ?? ""), route)
  }
  if (!cityOk(r.from_city, rec.from_city)) return false
  if (!cityOk(r.to_city, rec.to_city)) return false

  if (r.vehicle) {
    const v = fold(r.vehicle).replace(/[^a-z0-9 ]/g, "")
    if (v && !new RegExp(`(^|[^a-z0-9])${v}`).test(fold(vehicleText))) return false
  }
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method", { status: 405 })
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) return new Response("unauthorized", { status: 401 })

  let body: { table?: string; record?: Row }
  try { body = await req.json() } catch { return new Response("bad json", { status: 400 }) }
  const rec = body.record
  const isUser = body.table === "listings"
  if (!rec || !["listings", "bot_listings"].includes(body.table || "")) return new Response("ignored", { status: 200 })

  const created = rec.created_at ? Date.parse(String(rec.created_at)) : Date.now()
  if (Date.now() - created > MAX_AGE_MS) return new Response("old", { status: 200 })

  const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

  const { data: routes, error } = await db
    .from("notification_routes")
    .select("id,user_id,from_city,to_city,vehicle,urgent_only")
  if (error || !routes) return new Response("routes error", { status: 500 })

  // Rotası uyan, ilan sahibi olmayan kullanıcılar (kullanıcı başına tek bildirim)
  const owner = isUser ? String(rec.user_id ?? "") : ""
  const hits = new Map<string, string>() // user_id -> route_id
  for (const r of routes as Route[]) {
    if (r.user_id === owner || hits.has(r.user_id)) continue
    if (routeMatches(r, rec, isUser)) hits.set(r.user_id, r.id)
  }
  if (hits.size === 0) return new Response("no match", { status: 200 })

  // 10 dakika kuralı: rota için yakın zamanda bildirim gittiyse atla
  const targets: string[] = []
  for (const [uid, routeId] of hits) {
    const { data: ok } = await db.rpc("claim_route_notification", { p_route: routeId })
    if (ok) targets.push(uid)
  }
  if (targets.length === 0) return new Response("throttled", { status: 200 })

  const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth,user_id").in("user_id", targets)

  const from = String(rec.from_city ?? "").trim()
  const to = String(rec.to_city ?? "").trim()
  const detail = String(rec.cargo_detail ?? rec.message ?? rec.text ?? "").replace(/\s+/g, " ").trim().slice(0, 110)
  const title = rec.urgent ? "Acil yeni ilan" : "Yeni ilan"
  const line = from && to && from !== "-" && to !== "-" ? `${from} → ${to}` : ""
  const payload = JSON.stringify({
    title,
    body: [line, detail].filter(Boolean).join(" · ") || "Rotanıza uygun yeni bir ilan var.",
    url: "/",
    tag: "yeni-ilan",
  })

  const dead: string[] = []
  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.id) // cihaz aboneliği iptal edilmiş
      }
    }),
  )
  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead)

  return new Response(JSON.stringify({ sent: (subs?.length ?? 0) - dead.length }), { status: 200 })
})
