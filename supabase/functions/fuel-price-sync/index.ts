// Supabase Edge Function: güncel motorin fiyatını (Opet, İstanbul) çekip app_settings.fuel_diesel'e yazar.
// Deploy:  supabase functions deploy fuel-price-sync --no-verify-jwt
// Secrets (isteğe bağlı): supabase secrets set FUEL_KEY=<rastgele-metin> FUEL_PROVINCE=34
// Zamanlama: Supabase paneli > Integrations > Cron > yeni job > bu fonksiyonu günde 2 kez çağır (ör. 06:00 ve 14:00).
// Çağrı:  https://<PROJE_REF>.supabase.co/functions/v1/fuel-price-sync?key=<FUEL_KEY>
// UYARI: Opet'in bu adresi resmi/belgeli bir API değil; yanıt yapısı değişirse fonksiyon hata döner ve eski fiyat kalır.
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const KEY = Deno.env.get("FUEL_KEY") || ""
const PROVINCE = Deno.env.get("FUEL_PROVINCE") || "34"

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } })

// Yanıt yapısını bilmeden çalışsın diye JSON'u gezer: adında "motorin" geçen ve sayısal fiyatı olan kayıtları toplar
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
  if (KEY && new URL(req.url).searchParams.get("key") !== KEY) return reply(401, { ok: false, error: "unauthorized" })
  if (!SUPABASE_URL || !SERVICE) return reply(500, { ok: false, error: "config" })
  try {
    const r = await fetch(`https://api.opet.com.tr/api/fuelprices/prices?ProvinceCode=${PROVINCE}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    })
    if (!r.ok) return reply(502, { ok: false, error: "source_http", status: r.status })
    const prices: number[] = []
    collect(await r.json(), prices)
    if (prices.length === 0) return reply(502, { ok: false, error: "no_price_found" })
    const price = Math.round(Math.min(...prices) * 100) / 100 // standart motorin = en düşük motorin kalemi (premium değil)
    const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const { error } = await db.from("app_settings").upsert({ key: "fuel_diesel", value: String(price), updated_at: new Date().toISOString() })
    if (error) return reply(500, { ok: false, error: "db" })
    return reply(200, { ok: true, price })
  } catch {
    return reply(500, { ok: false, error: "exception" })
  }
})
