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

// --- İlan metninden şehir / yön ayrıştırma (lib/route.ts ile aynı mantık) ---
const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
]

/** Yaygın kısa adlar / ağız kullanımları */
const ALIAS_TO_CITY: Record<string, string> = {
  afyon: "Afyonkarahisar",
  antep: "Gaziantep",
  maras: "Kahramanmaraş",
  urfa: "Şanlıurfa",
  izmit: "Kocaeli",
  adapazari: "Sakarya",
  icel: "Mersin",
}

/** Günlük dilde başka anlamları olan adlar: ek alıyorsa kesme işareti, çıplaksa büyük harf şart */
const WEAK = new Set(["van", "mus", "ordu", "kilis", "tokat", "agri"])

const FOLD_MAP: Record<string, string> = {
  "ı": "i", "İ": "i", "I": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
  "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
}

/** Küçük harf + Türkçe karakterleri sadeleştirir. Uzunluk korunur (indeksler aynı kalır). */
function fold(s: string): string {
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const mapped = FOLD_MAP[ch]
    if (mapped) { out += mapped; continue }
    const low = ch.toLowerCase()
    out += low.length === 1 ? low : ch
  }
  return out
}

const CANON: Map<string, string> = new Map()
for (const c of CITIES) CANON.set(fold(c), c)
for (const [alias, city] of Object.entries(ALIAS_TO_CITY)) CANON.set(alias, city)

type SuffixKind = "from" | "to" | "at"
const SUFFIXES: [string, SuffixKind][] = [
  ["dan", "from"], ["den", "from"], ["tan", "from"], ["ten", "from"],
  ["ya", "to"], ["ye", "to"], ["na", "to"], ["ne", "to"], ["a", "to"], ["e", "to"],
  ["da", "at"], ["de", "at"], ["ta", "at"], ["te", "at"],
]
const SUFFIX_MAP = new Map(SUFFIXES)
const SUFFIXES_LONGEST_FIRST = [...SUFFIXES].sort((a, b) => b[0].length - a[0].length)

type Mention = {
  city: string
  /** from: -dan/-den, to: -a/-e, at: -da/-de, bare: ek yok */
  kind: SuffixKind | "bare"
  start: number
  end: number
}

const TOKEN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü0-9]+(?:['’´`][A-Za-zÇĞİıÖŞÜçğöşü]+)?/g

function findMentions(text: string): Mention[] {
  const tokens: { raw: string; start: number; end: number }[] = []
  for (const m of text.matchAll(TOKEN_RE)) {
    tokens.push({ raw: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
  }

  const result: Mention[] = []
  for (let i = 0; i < tokens.length; i++) {
    const { raw, start, end } = tokens[i]
    const aposIdx = raw.search(/['’´`]/)
    const hasApos = aposIdx > 0
    const base = fold(hasApos ? raw.slice(0, aposIdx) : raw)
    const suffixPart = hasApos ? fold(raw.slice(aposIdx + 1)) : ""

    let city: string | undefined
    let kind: Mention["kind"] = "bare"
    let weakKey = ""

    if (hasApos) {
      const c = CANON.get(base)
      const k = SUFFIX_MAP.get(suffixPart)
      if (c && k) { city = c; kind = k; weakKey = base }
    } else {
      const direct = CANON.get(base)
      if (direct) {
        city = direct; weakKey = base
      } else {
        for (const [suf, k] of SUFFIXES_LONGEST_FIRST) {
          if (base.length > suf.length && base.endsWith(suf)) {
            const stem = base.slice(0, -suf.length)
            const c = CANON.get(stem)
            if (c) { city = c; kind = k; weakKey = stem; break }
          }
        }
      }
    }
    if (!city) continue

    if (WEAK.has(weakKey)) {
      // "Van'a" geçerli; "vana" / "van" (küçük harf) geçersiz
      const firstChar = raw[0]
      const isCapital = firstChar !== firstChar.toLocaleLowerCase("tr-TR")
      if (kind !== "bare" && !hasApos) continue
      if (kind === "bare" && !isCapital) continue
    }

    // "Konya dan Urfa" - ek ayrı yazılmış
    if (kind === "bare" && i + 1 < tokens.length) {
      const next = fold(tokens[i + 1].raw)
      if (next === "dan" || next === "den") {
        kind = "from"
        result.push({ city, kind, start, end: tokens[i + 1].end })
        i++
        continue
      }
    }

    // Aynı şehir arka arkaya geçiyorsa tekrar ekleme
    const prev = result[result.length - 1]
    if (prev && prev.city === city && prev.kind === kind) continue
    result.push({ city, kind, start, end })
  }
  return result
}

const SEPARATOR_RE = /^\s*(?:[-–—>→»~/+]+|=>|->)\s*$/

type TextRoute = { from?: Mention; to?: Mention; explicit: boolean }

function routeFromMentions(text: string, ms: Mention[]): TextRoute {
  if (ms.length === 0) return { explicit: false }

  // 1) "Konya - Adana", "Konya > Adana"
  for (let i = 0; i < ms.length - 1; i++) {
    if (ms[i].city === ms[i + 1].city) continue
    if (SEPARATOR_RE.test(text.slice(ms[i].end, ms[i + 1].start))) {
      return { from: ms[i], to: ms[i + 1], explicit: true }
    }
  }

  // 2) -dan / -e ekleriyle
  let from = ms.find((m) => m.kind === "from")
  let to = ms.find((m) => m.kind === "to" && m.city !== from?.city)
  const explicit = Boolean(from && to)

  // 3) Eksik tarafı sıraya bakarak tamamla
  if (from && !to) {
    to = ms.find((m) => m.city !== from!.city && m.start > from!.start) ?? ms.find((m) => m.city !== from!.city)
  } else if (!from && to) {
    from = ms.find((m) => m.city !== to!.city && m.kind !== "to" && m.start < to!.start) ?? ms.find((m) => m.city !== to!.city && m.kind !== "to")
  } else if (!from && !to) {
    from = ms.find((m) => m.kind !== "to")
    if (from) to = ms.find((m) => m.city !== from!.city && m.kind !== "from")
    else to = ms[0]
  }
  return { from, to, explicit }
}


type Row = Record<string, unknown>
type Route = { id: string; user_id: string; from_city: string | null; to_city: string | null; vehicle: string | null; urgent_only: boolean; direction: string | null }

// 05xx telefon numarasını yakalar ("05xxxxxxxxx" döner)
function extractPhone(text: string): string {
  const m = (text || "").match(/(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/)
  if (!m) return ""
  const d = m[0].replace(/\D/g, "")
  return d.length < 10 ? "" : "0" + d.slice(-10)
}

const canonCity = (s: unknown): string | undefined => {
  const t = String(s ?? "").trim()
  if (!t || t === "-") return undefined
  return CANON.get(fold(t)) ?? findMentions(t)[0]?.city
}

// Bildirim için metin temizliği (emoji, *_~` işaretleri, fazla boşluk)
function cleanForPush(t: string): string {
  return (t || "")
    .replace(/[*_~`]/g, "")
    .replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u231A-\u23FF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uFE0F|\u200D/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
// Metindeki telefon numaralarını (ve başlarındaki "tel:" gibi etiketleri) çıkarır
function stripPhoneText(t: string): string {
  return t
    .replace(/(?:\b(?:tel|telefon|iletisim|iletişim|irtibat|ara|whatsapp|wp|no)\b[\s:.\-]*)?(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

// İlanın çıkış / varış / geçen şehirleri. Kullanıcı ilanında form alanlarına güvenilir, eksikse metinden tamamlanır.
function analyze(rec: Row, isUser: boolean) {
  const text = [rec.cargo_detail, rec.message, rec.text].filter(Boolean).join(" ")
  const ms = findMentions(text)
  const tr = routeFromMentions(text, ms)
  let from = tr.from?.city
  let to = tr.to?.city
  if (isUser) {
    from = canonCity(rec.from_city) ?? from
    to = canonCity(rec.to_city) ?? to
  }
  const any = new Set<string>(ms.map((m) => m.city))
  if (from) any.add(from)
  if (to) any.add(to)
  return { text, from, to, any }
}

function routeMatches(r: Route, rec: Row, isUser: boolean): boolean {
  if (r.urgent_only && !rec.urgent) return false
  const a = analyze(rec, isUser)
  const vehicleText = [rec.vehicle_type, a.text].filter(Boolean).join(" ")

  const city = r.from_city ? (CANON.get(fold(r.from_city)) ?? r.from_city) : ""
  if (city) {
    if (r.to_city) {
      // Eski iki şehirli kayıtlar: çıkış ve varış ikisi de tutmalı
      const dest = CANON.get(fold(r.to_city)) ?? r.to_city
      if (a.from !== city || a.to !== dest) return false
    } else {
      const dir = r.direction || "from"
      if (dir === "from" && a.from !== city) return false
      if (dir === "to" && a.to !== city) return false
      if (dir === "both" && !a.any.has(city)) return false
    }
  }

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
    .select("id,user_id,from_city,to_city,vehicle,urgent_only,direction")
  if (error || !routes) return new Response("routes error", { status: 500 })

  // Rotası uyan, ilan sahibi olmayan kullanıcılar (kullanıcı başına tek bildirim)
  const owner = isUser ? String(rec.user_id ?? "") : ""
  const hits = new Map<string, string>() // user_id -> route_id
  for (const r of routes as Route[]) {
    if (r.user_id === owner || hits.has(r.user_id)) continue
    if (routeMatches(r, rec, isUser)) hits.set(r.user_id, r.id)
  }
  if (hits.size === 0) return new Response("no match", { status: 200 })

  // Bildirim yalnızca Premium: abonelik süresi bitmiş / olmayan kullanıcılar elenir
  const { data: subRows } = await db
    .from("subscriptions")
    .select("user_id,status,expires_at")
    .in("user_id", Array.from(hits.keys()))
  const premiumIds = new Set(
    (subRows || [])
      .filter((x: { status: string; expires_at: string | null }) =>
        ["active", "grace", "canceled"].includes(x.status) && (!x.expires_at || Date.parse(x.expires_at) > Date.now()))
      .map((x: { user_id: string }) => x.user_id),
  )
  for (const uid of Array.from(hits.keys())) if (!premiumIds.has(uid)) hits.delete(uid)
  if (hits.size === 0) return new Response("no premium", { status: 200 })

  // Kısa tekrar koruması (003/004 SQL'deki claim süresi): rota için çok yakın zamanda bildirim gittiyse atla
  const targets: string[] = []
  for (const [uid, routeId] of hits) {
    const { data: ok } = await db.rpc("claim_route_notification", { p_route: routeId })
    if (ok) targets.push(uid)
  }
  if (targets.length === 0) return new Response("throttled", { status: 200 })

  const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth,user_id").in("user_id", targets)

  // Bildirim metni: emoji / *kalın* işaretleri / telefon numarası temizlenir (numara "Ara" düğmesinde)
  const rawText = String(rec.cargo_detail ?? rec.message ?? rec.text ?? "")
  const phone = extractPhone(String(rec.phone ?? "")) || extractPhone(rawText)
  const detail = stripPhoneText(cleanForPush(rawText)).slice(0, 110).trim()
  // Rota satırı yalnızca kullanıcı ilanında (formdan seçilen, eksiksiz şehirler) gösterilir; "Belirtilmedi" asla yazılmaz
  const fromC = canonCity(rec.from_city), toC = canonCity(rec.to_city)
  const line = isUser && fromC && toC ? `${fromC} → ${toC}` : ""
  const title = rec.urgent ? "Acil yeni ilan" : "Yeni ilan"
  const payload = JSON.stringify({
    title,
    body: [line, detail].filter(Boolean).join(" · ") || "Seçtiğiniz şehre uygun yeni bir ilan var.",
    url: "/",
    tag: "yeni-ilan",
    phone: phone || undefined,
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
