// Supabase Edge Function: bot izleme (UptimeRobot için)
// Son bot ilanı HEALTH_MAX_SILENCE_MIN dakikadır (varsayılan 90) gelmediyse 503 döner -> UptimeRobot e-posta atar.
// Deploy:  supabase functions deploy health-check --no-verify-jwt
// Secrets (isteğe bağlı): supabase secrets set HEALTH_KEY=<uzun-rastgele-metin> HEALTH_MAX_SILENCE_MIN=90
// UptimeRobot adresi:  https://<PROJE_REF>.supabase.co/functions/v1/health-check?key=<HEALTH_KEY>
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const KEY = Deno.env.get("HEALTH_KEY") || ""
const MAX_MIN = Number(Deno.env.get("HEALTH_MAX_SILENCE_MIN") || 90)

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return reply(405, { ok: false, error: "method" })
  if (KEY && new URL(req.url).searchParams.get("key") !== KEY) return reply(401, { ok: false, error: "unauthorized" })
  if (!SUPABASE_URL || !SERVICE) return reply(500, { ok: false, error: "config" })

  try {
    const db = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const { data, error } = await db
      .from("bot_listings")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
    if (error) return reply(500, { ok: false, error: "db" })

    const last = data?.[0]?.created_at ? Date.parse(String(data[0].created_at)) : NaN
    if (!Number.isFinite(last)) return reply(503, { ok: false, error: "no_listings" })

    const minutes = Math.round((Date.now() - last) / 60000)
    if (minutes > MAX_MIN) return reply(503, { ok: false, last_listing_minutes_ago: minutes, limit_minutes: MAX_MIN })
    return reply(200, { ok: true, last_listing_minutes_ago: minutes })
  } catch {
    return reply(500, { ok: false, error: "exception" })
  }
})
