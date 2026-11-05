// Supabase Edge Function: çıkış iline ait standart motorin fiyatını Opet'ten alır.
// İstemci POST { provinceCode } ile çağırabilir; il başına 6 saat önbellek uygulanır.
// İsteğe bağlı cron GET ?key=<FUEL_KEY>&province=38 ile belirli ili önceden güncelleyebilir.
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || ""
const KEY = Deno.env.get("FUEL_KEY") || ""
const DEFAULT_PROVINCE = Number(Deno.env.get("FUEL_PROVINCE") || "34")
const CACHE_MS = 6 * 60 * 60 * 1000
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } })

function collect(node: unknown, out: number[]) {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, out)); return }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>
    const name = Object.values(o).find((v) => typeof v === "string" && /motorin|diesel/i.test(v)) as string | undefined
    if (name) {
      for (const k of ["amount", "price", "value", "fiyat"]) {
        const raw = o[k]
        const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."))
        if (Number.isFinite(n) && n > 20 && n < 200) { out.push(n); break }
      }
    }
    Object.values(o).forEach((v) => collect(v, out))
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (!SUPABASE_URL || !SERVICE) return reply(500, { ok: false, error: "config" })

  const isClientCall = req.method === "POST"
  if (isClientCall && (!ANON || req.headers.get("apikey") !== ANON)) return reply(401, { ok: false, error: "unauthorized" })
  if (!isClientCall && KEY && new URL(req.url).searchParams.get("key") !== KEY) return reply(401, { ok: false, error: "unauthorized" })

  let province = DEFAULT_PROVINCE
  if (isClientCall) {
    try { province = Number((await req.json()).provinceCode) } catch { return reply(400, { ok: false, error: "bad_body" }) }
  } else {
    province = Number(new URL(req.url).searchParams.get("province") || DEFAULT_PROVINCE)
  }
  if (!Number.isInteger(province) || province < 1 || province > 81) return reply(400, { ok: false, error: "bad_province" })

  try {
    const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const settingKey = `fuel_diesel_${province}`
    const { data: old } = await db.from("app_settings").select("value,updated_at").eq("key", settingKey).maybeSingle()
    const oldPrice = old ? parseFloat(String(old.value).replace(",", ".")) : 0
    if (oldPrice > 0 && old?.updated_at && Date.now() - new Date(old.updated_at).getTime() < CACHE_MS) {
      return reply(200, { ok: true, price: oldPrice, updatedAt: old.updated_at, cached: true, province })
    }

    const r = await fetch(`https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=${province}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    })
    if (!r.ok) return reply(502, { ok: false, error: "source_http", status: r.status })
    const prices: number[] = []
    collect(await r.json(), prices)
    if (prices.length === 0) return reply(502, { ok: false, error: "no_price_found" })
    const price = Math.round(Math.min(...prices) * 100) / 100
    const updatedAt = new Date().toISOString()
    const { error } = await db.from("app_settings").upsert({ key: settingKey, value: String(price), updated_at: updatedAt })
    if (error) return reply(500, { ok: false, error: "db" })
    return reply(200, { ok: true, price, updatedAt, cached: false, province })
  } catch {
    return reply(500, { ok: false, error: "exception" })
  }
})
