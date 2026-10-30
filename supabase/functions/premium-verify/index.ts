// Supabase Edge Function: Google Play aboneliğini doğrular
// Deploy: supabase functions deploy premium-verify --no-verify-jwt
// Secrets: supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='...' PLAY_PACKAGE_NAME=...
// NOT: ../_shared kullanır -> Dashboard'dan değil, Supabase CLI ile deploy edin.
import { createClient } from "npm:@supabase/supabase-js@2"
import { PACKAGE, SKU, acknowledge, evaluate, fetchSubscription } from "../_shared/play.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

// CORS: bu uç nokta çerez değil, Authorization (Supabase JWT) ile korunur; kaynak (origin) kısıtı güvenlik sağlamaz.
// Eskiden yalnızca nakliyecepte.online izinliydi: uygulama başka bir adresten (ör. *.workers.dev) açılınca tarayıcı isteği
// engelliyor ve kullanıcı satın alma/doğrulama sırasında "Failed to fetch" görüyordu.
function corsHeaders(_req: Request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return json(req, { error: "Yöntem desteklenmiyor" }, 405)

  try {
    if (!PACKAGE || !SUPABASE_URL || !ANON || !SERVICE) {
      return json(req, { error: "Sunucu ayarları eksik" }, 500)
    }

    // 1) Kullanıcıyı Supabase oturum belirteciyle doğrula
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    if (!jwt) return json(req, { error: "Giriş gerekli" }, 401)
    const userClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
    if (userErr || !userData.user) return json(req, { error: "Geçersiz oturum" }, 401)
    const userId = userData.user.id

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    // 2) Token: istekte varsa o, yoksa kullanıcının kayıtlı token'ı (yenileme)
    const body = await req.json().catch(() => ({}))
    let token: string | undefined = typeof body.purchaseToken === "string" ? body.purchaseToken : undefined
    if (!token) {
      const { data: row } = await admin.from("subscriptions").select("purchase_token").eq("user_id", userId).maybeSingle()
      token = row?.purchase_token
    }
    if (!token) return json(req, { premium: false })

    // 3) Aynı satın alma başka bir hesaba bağlıysa reddet
    const { data: owner } = await admin.from("subscriptions").select("user_id").eq("purchase_token", token).maybeSingle()
    if (owner && owner.user_id !== userId) {
      return json(req, { error: "Bu abonelik başka bir hesaba bağlı" }, 409)
    }

    // 4) Google Play'de doğrula
    const play = await fetchSubscription(token)
    if (!play.ok) {
      // 404/410: token artık Google'da yok (çok eski, süresi dolmuş) -> kaydı "expired" yap, hata verme
      if ((play.status === 404 || play.status === 410) && owner?.user_id === userId) {
        await admin
          .from("subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
        return json(req, { premium: false, status: "expired", expiresAt: null })
      }
      return json(req, { error: `Satın alma doğrulanamadı (${play.status})` }, 400)
    }

    const ev = evaluate(play.sub)
    if (!ev) return json(req, { error: "Ürün eşleşmedi" }, 400)

    // 5) Onaylanmamışsa onayla. Onay 3 gün içinde yapılmazsa Google aboneliği otomatik İADE EDER ve Premium kendiliğinden kaybolur.
    //    Bu yüzden onay başarısızsa Premium vermeyiz; kullanıcı "Satın alımı geri yükle" ile (ya da uygulamayı yeniden açınca) tekrar dener.
    if (ev.needsAck) {
      const acked = await acknowledge(token, play.access)
      if (!acked) return json(req, { error: "Satın alma onaylanamadı. Birkaç dakika sonra 'Satın alımı geri yükle'ye dokunun." }, 502)
    }

    // 6) Kaydet (sadece service role yazabilir)
    const { error: upErr } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        product_id: SKU,
        purchase_token: token,
        status: ev.status,
        expires_at: ev.expiresAt,
        order_id: ev.orderId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    if (upErr) {
      console.error("subscriptions upsert hatası:", upErr.message)
      return json(req, { error: "Kayıt hatası" }, 500)
    }

    return json(req, { premium: ev.entitled, status: ev.status, expiresAt: ev.expiresAt })
  } catch (e) {
    console.error("premium verify hatası:", e)
    return json(req, { error: "Sunucu hatası" }, 500)
  }
})
