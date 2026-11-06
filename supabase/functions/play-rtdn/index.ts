// Supabase Edge Function: Google Play "Gerçek Zamanlı Geliştirici Bildirimleri" (RTDN) alıcısı.
// İptal / iade / süre bitişi / yenileme olduğunda Google bu adrese haber verir ve abonelik kaydı ANINDA güncellenir.
// (Uygulama kapalı olsa bile; böylece iptal edilen abonelik için bildirim gitmeye devam etmez.)
// Deploy:  supabase functions deploy play-rtdn --no-verify-jwt
// Secret:  supabase secrets set RTDN_SECRET=<uzun-rastgele-metin>
// Pub/Sub push adresi:  https://<PROJE_REF>.supabase.co/functions/v1/play-rtdn?key=<RTDN_SECRET>
import { createClient } from "npm:@supabase/supabase-js@2"
import { PACKAGE, acknowledge, evaluate, fetchSubscription } from "../_shared/play.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const SECRET = Deno.env.get("RTDN_SECRET") || ""

const reply = (status: number, body: Record<string, unknown> = { ok: true }) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply(405, { ok: false })
  if (!SECRET || !SUPABASE_URL || !SERVICE || !PACKAGE) return reply(500, { ok: false, error: "config" })
  if (!safeEqual(new URL(req.url).searchParams.get("key") || "", SECRET)) return reply(401, { ok: false })

  try {
    const envelope = await req.json()
    const raw = envelope?.message?.data
    if (!raw) return reply(200) // geçersiz zarf: tekrar denenmesin
    const msg = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))))

    if (msg.packageName && msg.packageName !== PACKAGE) return reply(200)
    const token: string | undefined = msg.subscriptionNotification?.purchaseToken
    if (!token) return reply(200) // test bildirimi veya abonelik dışı olay

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const { data: row } = await admin.from("subscriptions").select("user_id").eq("purchase_token", token).maybeSingle()
    // Henüz hiçbir hesaba bağlanmamış satın alma: uygulama doğrulayınca zaten güncel durumu alır
    if (!row) return reply(200)

    const play = await fetchSubscription(token)
    if (!play.ok) {
      if (play.status === 404 || play.status === 410) {
        await admin.from("subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("user_id", row.user_id)
        return reply(200)
      }
      return reply(500, { ok: false }) // geçici hata: Google tekrar dener
    }
    const ev = evaluate(play.sub)
    if (!ev) return reply(200)
    if (ev.needsAck) await acknowledge(token, play.access)

    const { error } = await admin
      .from("subscriptions")
      .update({ status: ev.status, expires_at: ev.expiresAt, order_id: ev.orderId, updated_at: new Date().toISOString() })
      .eq("user_id", row.user_id)
    if (error) {
      console.error("RTDN güncelleme hatası:", error.message)
      return reply(500, { ok: false })
    }
    return reply(200)
  } catch (e) {
    console.error("RTDN hatası:", e)
    return reply(500, { ok: false })
  }
})
