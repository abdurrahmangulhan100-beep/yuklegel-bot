// Supabase Edge Function: Google Play aboneliğini doğrular (eski /api/premium/verify rotasının yerine)
// Deploy: supabase functions deploy premium-verify --no-verify-jwt
// Secrets: supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='...' PLAY_PACKAGE_NAME=...
import { createClient } from "npm:@supabase/supabase-js@2"
import { createSign } from "node:crypto"
import { Buffer } from "node:buffer"

const SKU = "nakliye_premium_aylik"
const PACKAGE = Deno.env.get("PLAY_PACKAGE_NAME") || ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || ""
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

const ALLOWED_ORIGINS = [
  "https://nakliyecepte.online",
  "https://www.nakliyecepte.online",
  "http://localhost:3000",
]

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || ""
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  })
}

const b64u = (v: string | Uint8Array) => Buffer.from(v).toString("base64url")

async function googleAccessToken(): Promise<string> {
  const sa = JSON.parse(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") || "{}")
  if (!sa.client_email || !sa.private_key) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON eksik")
  const now = Math.floor(Date.now() / 1000)
  const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claim = b64u(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )
  const signature = createSign("RSA-SHA256").update(`${header}.${claim}`).sign(sa.private_key).toString("base64url")
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  })
  const j = await res.json()
  if (!res.ok || !j.access_token) throw new Error("Google yetkilendirme hatası")
  return j.access_token as string
}

const STATE_MAP: Record<string, { status: string; entitled: boolean }> = {
  SUBSCRIPTION_STATE_ACTIVE: { status: "active", entitled: true },
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: { status: "grace", entitled: true },
  SUBSCRIPTION_STATE_CANCELED: { status: "canceled", entitled: true }, // süre bitene kadar geçerli
  SUBSCRIPTION_STATE_ON_HOLD: { status: "on_hold", entitled: false },
  SUBSCRIPTION_STATE_PAUSED: { status: "on_hold", entitled: false },
  SUBSCRIPTION_STATE_EXPIRED: { status: "expired", entitled: false },
  SUBSCRIPTION_STATE_PENDING: { status: "expired", entitled: false },
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
    const access = await googleAccessToken()
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE)}`
    const res = await fetch(`${base}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${access}` },
    })
    const sub = await res.json()
    if (!res.ok) {
      console.error("Google Play hata:", res.status, JSON.stringify(sub))
      // Ayrıntıyı istemciye sızdırma, sadece durum kodunu ver
      return json(req, { error: `Satın alma doğrulanamadı (${res.status})` }, 400)
    }

    const item = (sub.lineItems || []).find((l: { productId?: string }) => l.productId === SKU)
    if (!item) return json(req, { error: "Ürün eşleşmedi" }, 400)

    const mapped = STATE_MAP[sub.subscriptionState as string] || { status: "expired", entitled: false }
    const expiresAt: string | null = item.expiryTime || null
    const entitled = mapped.entitled && (!expiresAt || new Date(expiresAt).getTime() > Date.now())

    // 5) Onaylanmamışsa 3 gün içinde acknowledge et (yoksa Google otomatik iade eder)
    if (entitled && sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      await fetch(`${base}/purchases/subscriptions/${SKU}/tokens/${encodeURIComponent(token)}:acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: "{}",
      })
    }

    // 6) Kaydet (sadece service role yazabilir)
    const { error: upErr } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        product_id: SKU,
        purchase_token: token,
        status: entitled ? mapped.status : mapped.status === "active" ? "expired" : mapped.status,
        expires_at: expiresAt,
        order_id: sub.latestOrderId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    if (upErr) return json(req, { error: "Kayıt hatası" }, 500)

    return json(req, { premium: entitled, status: mapped.status, expiresAt })
  } catch (e) {
    console.error("premium verify hatası:", e)
    return json(req, { error: "Sunucu hatası" }, 500)
  }
})
