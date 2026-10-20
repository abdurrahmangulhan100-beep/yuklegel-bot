import { NextResponse } from "next/server"
import { createSign } from "crypto"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SKU = "nakliye_premium_aylik"
const PACKAGE = process.env.PLAY_PACKAGE_NAME || process.env.NEXT_PUBLIC_PLAY_PACKAGE || ""
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const b64u = (v: string | Buffer) => Buffer.from(v).toString("base64url")

async function googleAccessToken(): Promise<string> {
  const sa = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "{}")
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
    })
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
  const json = await res.json()
  if (!res.ok || !json.access_token) throw new Error("Google yetkilendirme hatası")
  return json.access_token as string
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

export async function POST(req: Request) {
  try {
    if (!PACKAGE || !SUPABASE_URL || !ANON || !SERVICE) {
      return NextResponse.json({ error: "Sunucu ayarları eksik" }, { status: 500 })
    }

    // 1) Kullanıcıyı Supabase oturum belirteciyle doğrula
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    if (!jwt) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 })
    const userClient = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
    if (userErr || !userData.user) return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 })
    const userId = userData.user.id

    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })

    // 2) Token: istekte varsa o, yoksa kullanıcının kayıtlı token'ı (yenileme)
    const body = await req.json().catch(() => ({}))
    let token: string | undefined = typeof body.purchaseToken === "string" ? body.purchaseToken : undefined
    if (!token) {
      const { data: row } = await admin.from("subscriptions").select("purchase_token").eq("user_id", userId).maybeSingle()
      token = row?.purchase_token
    }
    if (!token) return NextResponse.json({ premium: false })

    // 3) Aynı satın alma başka bir hesaba bağlıysa reddet
    const { data: owner } = await admin.from("subscriptions").select("user_id").eq("purchase_token", token).maybeSingle()
    if (owner && owner.user_id !== userId) {
      return NextResponse.json({ error: "Bu abonelik başka bir hesaba bağlı" }, { status: 409 })
    }

    // 4) Google Play'de doğrula
    const access = await googleAccessToken()
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE)}`
    const res = await fetch(`${base}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    })
    const sub = await res.json()
    if (!res.ok) {
      console.error("Google Play hata:", res.status, JSON.stringify(sub))
      return NextResponse.json(
        { error: `Satın alma doğrulanamadı (${res.status}: ${sub?.error?.message || "bilinmiyor"})` },
        { status: 400 }
      )
    }

    const item = (sub.lineItems || []).find((l: { productId?: string }) => l.productId === SKU)
    if (!item) return NextResponse.json({ error: "Ürün eşleşmedi" }, { status: 400 })

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
      { onConflict: "user_id" }
    )
    if (upErr) return NextResponse.json({ error: "Kayıt hatası" }, { status: 500 })

    return NextResponse.json({ premium: entitled, status: mapped.status, expiresAt })
  } catch (e) {
    console.error("premium verify hatası:", e)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
