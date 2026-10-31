// Google Play Developer API yardımcıları (premium-verify ve play-rtdn ortak kullanır)
import { createSign } from "node:crypto"
import { Buffer } from "node:buffer"

export const SKU = "nakliye_premium_aylik"
export const PACKAGE = Deno.env.get("PLAY_PACKAGE_NAME") || ""

const b64u = (v: string | Uint8Array) => Buffer.from(v).toString("base64url")

let cached: { token: string; exp: number } | null = null

export async function googleAccessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
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
  cached = { token: j.access_token as string, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 }
  return cached.token
}

export const API_BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE)}`

/** Google'ın abonelik durumu -> bizim durum + hak sahibi mi */
const STATE_MAP: Record<string, { status: string; entitled: boolean }> = {
  SUBSCRIPTION_STATE_ACTIVE: { status: "active", entitled: true },
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: { status: "grace", entitled: true },
  SUBSCRIPTION_STATE_CANCELED: { status: "canceled", entitled: true }, // süre bitene kadar geçerli
  SUBSCRIPTION_STATE_ON_HOLD: { status: "on_hold", entitled: false },
  SUBSCRIPTION_STATE_PAUSED: { status: "on_hold", entitled: false },
  SUBSCRIPTION_STATE_EXPIRED: { status: "expired", entitled: false },
  SUBSCRIPTION_STATE_PENDING: { status: "expired", entitled: false },
}

export type Evaluated = {
  entitled: boolean
  status: string
  expiresAt: string | null
  orderId: string | null
  needsAck: boolean
  /** Ödeme henüz onaylanmadı (ör. bekleyen/yavaş ödeme yöntemi). Onaylanınca RTDN ile otomatik aktif olur. */
  pending: boolean
}

// deno-lint-ignore no-explicit-any
export function evaluate(sub: any): Evaluated | null {
  const item = (sub.lineItems || []).find((l: { productId?: string }) => l.productId === SKU)
  if (!item) return null
  const mapped = STATE_MAP[sub.subscriptionState as string] || { status: "expired", entitled: false }
  const expiresAt: string | null = item.expiryTime || null
  const notExpired = !expiresAt || new Date(expiresAt).getTime() > Date.now()
  const entitled = mapped.entitled && notExpired
  // Süresi dolmuş bir "active/grace/canceled" kaydı asla hak sahibi görünmesin
  const status = !entitled && ["active", "grace", "canceled"].includes(mapped.status) ? "expired" : mapped.status
  return {
    entitled,
    status,
    expiresAt,
    orderId: sub.latestOrderId || null,
    needsAck: entitled && sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
    pending: sub.subscriptionState === "SUBSCRIPTION_STATE_PENDING",
  }
}

export type PlayResult =
  // deno-lint-ignore no-explicit-any
  | { ok: true; sub: any; access: string }
  | { ok: false; status: number }

export async function fetchSubscription(token: string): Promise<PlayResult> {
  const access = await googleAccessToken()
  const res = await fetch(`${API_BASE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`, {
    headers: { Authorization: `Bearer ${access}` },
  })
  const sub = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error("Google Play hata:", res.status, JSON.stringify(sub))
    return { ok: false, status: res.status }
  }
  return { ok: true, sub, access }
}

/** Onaylanmamış aboneliği onayla (3 gün içinde yapılmazsa Google otomatik iade eder) */
export async function acknowledge(token: string, access: string): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/purchases/subscriptions/${SKU}/tokens/${encodeURIComponent(token)}:acknowledge`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: "{}",
    },
  )
  if (!res.ok) {
    console.error("acknowledge başarısız:", res.status, await res.text().catch(() => ""))
    return false
  }
  return true
}
