// Supabase Edge Function: il/ilçe dahil karayolu km'si (OpenStreetMap: Nominatim + OSRM, ücretsiz, anahtarsız).
// Sonuç route_cache'e yazılır; aynı güzergâh bir daha dışarı çıkmaz.
// Deploy:  supabase functions deploy route-km --no-verify-jwt
// Çağrı:   /functions/v1/route-km?from=Konya/Beyşehir&to=Ankara   (ilçe isteğe bağlı: "İl/İlçe" veya "İl")
// UYARI: OSRM/Nominatim herkese açık demo sunucularıdır (yoğun kullanım için değil). Önbellek sayesinde istek sayısı düşük kalır;
//        kullanıcı sayısı çok artarsa ücretsiz openrouteservice anahtarı veya kendi OSRM'iniz önerilir.
import { createClient } from "npm:@supabase/supabase-js@2"

const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } })
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type" }
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": status === 200 ? "public, max-age=86400" : "no-store" } })
const UA = { "User-Agent": "nakliyecepte-route-km/1.0 (nakliyecepte.online)" }
const ok = (s: string) => /^[\p{L}\p{N} .'\-\/]{2,60}$/u.test(s)

async function geocode(place: string): Promise<[number, number] | null> {
  const { data } = await db.from("geo_cache").select("lat,lon").eq("place", place).maybeSingle()
  if (data) return [data.lat, data.lon]
  const [city, district] = place.split("/")
  const q = district ? `${district}, ${city}, Türkiye` : `${city}, Türkiye`
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(q)}`, { headers: UA })
  if (!r.ok) return null
  const j = await r.json()
  if (!Array.isArray(j) || !j[0]) return null
  const lat = parseFloat(j[0].lat), lon = parseFloat(j[0].lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  await db.from("geo_cache").upsert({ place, lat, lon })
  return [lat, lon]
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  const u = new URL(req.url)
  const from = (u.searchParams.get("from") || "").trim(), to = (u.searchParams.get("to") || "").trim()
  if (!ok(from) || !ok(to) || from === to) return reply(400, { ok: false, error: "bad_params" })
  const route = `${from}>${to}`
  try {
    const { data: hit } = await db.from("route_cache").select("km").eq("route", route).maybeSingle()
    if (hit) return reply(200, { ok: true, km: hit.km, cached: true })
    const a = await geocode(from)
    await new Promise((r) => setTimeout(r, 1100)) // Nominatim: saniyede 1 istek
    const b = await geocode(to)
    if (!a || !b) return reply(404, { ok: false, error: "place_not_found" })
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=false`, { headers: UA })
    const j = await r.json()
    const m = j?.routes?.[0]?.distance
    if (j?.code !== "Ok" || !(m > 0)) return reply(502, { ok: false, error: "route_failed" })
    const km = Math.round(m / 1000)
    await db.from("route_cache").upsert({ route, km })
    return reply(200, { ok: true, km, cached: false })
  } catch {
    return reply(500, { ok: false, error: "exception" })
  }
})
