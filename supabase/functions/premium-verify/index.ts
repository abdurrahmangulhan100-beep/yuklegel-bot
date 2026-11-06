// Supabase Edge Function: Google Play aboneliğini doğrular
// Deploy: supabase functions deploy premium-verify --no-verify-jwt
// Secrets: supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='...' PLAY_PACKAGE_NAME=...
// NOT: ../_shared kullanır -> Dashboard'dan değil, Supabase CLI ile deploy edin.
import { createClient } from "npm:@supabase/supabase-js@2"
import { PACKAGE, PlayError, SKU, acknowledge, evaluate, fetchSubscription } from "../_shared/play.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || ""
// Anon anahtarına artık gerek yok (oturum, service role ile doğrulanır). Yeni API anahtarı sisteminde SUPABASE_ANON_KEY
// bazen tanımlı gelmediği için eski kod "Sunucu ayarları eksik" (500) dönüyordu.
// Service role için de, otomatik değişken yoksa kendi secret'ınızı (SERVICE_ROLE_KEY) yedek olarak okur.
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || ""

// CORS: bu uç nokta çerez değil, Authorization (Supabase JWT) ile korunur; kaynak (origin) kısıtı güvenlik sağlamaz.
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

/**
 * Hata yanıtı: `error` kullanıcıya gösterilir, `code` ise sorunun NEREDE olduğunu söyler (gizli bilgi içermez).
 * İstemci `code` değerine göre yeniden deneyip denemeyeceğine karar verir.
 */
function fail(req: Request, status: number, code: string, error: string) {
  return json(req, { error, code }, status)
}

const PLAY_ERRORS: Record<string, string> = {
  E_SA_MISSING: "Sunucuda Google servis hesabı tanımlı değil",
  E_SA_JSON: "Sunucudaki Google servis hesabı anahtarı okunamadı",
  E_SA_KEY: "Sunucudaki Google servis hesabı anahtarı geçersiz",
  E_GOOGLE_AUTH: "Sunucu Google'a giriş yapamadı",
  E_GOOGLE_NET: "Google'a ulaşılamadı, biraz sonra tekrar deneyin",
  E_PLAY_NET: "Google Play'e ulaşılamadı, biraz sonra tekrar deneyin",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) })
  if (req.method !== "POST") return fail(req, 405, "E_METHOD", "Yöntem desteklenmiyor")

  let stage = "init"
  try {
    const missing = [
      !PACKAGE && "PLAY_PACKAGE_NAME",
      !SUPABASE_URL && "SUPABASE_URL",
      !SERVICE && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean)
    if (missing.length) {
      console.error("[premium-verify] eksik ortam değişkeni:", missing.join(", "))
      return fail(req, 500, "E_CONFIG", "Sunucu ayarları eksik")
    }

    // 1) Kullanıcıyı Supabase oturum belirteciyle doğrula
    stage = "auth"
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    if (!jwt) return fail(req, 401, "E_NO_AUTH", "Giriş gerekli")
    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData.user) return fail(req, 401, "E_BAD_SESSION", "Geçersiz oturum")
    const userId = userData.user.id

    // 2) Token: istekte varsa o, yoksa kullanıcının kayıtlı token'ı (yenileme)
    stage = "token"
    const body = await req.json().catch(() => ({}))
    let token: string | undefined = typeof body.purchaseToken === "string" && body.purchaseToken ? body.purchaseToken : undefined
    if (!token) {
      const { data: row, error } = await admin.from("subscriptions").select("purchase_token").eq("user_id", userId).maybeSingle()
      if (error) {
        console.error("[premium-verify] subscriptions okuma hatası:", error.code, error.message, error.details, error.hint)
        return fail(req, 500, "E_DB", `Veritabanı hatası (${error.code || "?"})`)
      }
      token = row?.purchase_token ?? undefined
    }
    if (!token) return json(req, { premium: false })

    // 3) Aynı satın alma başka bir hesaba bağlıysa reddet
    stage = "owner"
    const { data: owners, error: ownerErr } = await admin.from("subscriptions").select("user_id").eq("purchase_token", token)
    if (ownerErr) {
      console.error("[premium-verify] sahip sorgusu hatası:", ownerErr.code, ownerErr.message)
      return fail(req, 500, "E_DB", `Veritabanı hatası (${ownerErr.code || "?"})`)
    }
    const ownedByMe = (owners || []).some((o) => o.user_id === userId)
    if ((owners || []).some((o) => o.user_id !== userId)) {
      return fail(req, 409, "E_OWNED", "Bu abonelik başka bir hesaba bağlı")
    }

    // 4) Google Play'de doğrula
    stage = "google"
    const play = await fetchSubscription(token)
    if (!play.ok) {
      // 404/410: token artık Google'da yok (çok eski, süresi dolmuş) -> kaydı "expired" yap, hata verme
      if ((play.status === 404 || play.status === 410) && ownedByMe) {
        await admin
          .from("subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
        return json(req, { premium: false, status: "expired", expiresAt: null })
      }
      // 401/403: servis hesabı Play Console'da yetkili değil (Kullanıcılar ve izinler > Finansal veriler + Siparişleri yönet)
      if (play.status === 401 || play.status === 403) {
        return fail(req, 502, "E_PLAY_ACCESS", "Sunucunun Google Play erişim izni yok")
      }
      if (play.status >= 500 || play.status === 429) {
        return fail(req, 502, "E_PLAY_UNAVAILABLE", "Google Play şu an yanıt vermiyor, biraz sonra tekrar deneyin")
      }
      // 400 / 404: token bu paket için geçerli değil (ör. paket adı yanlış) ya da Google kaydı henüz oluşturmadı
      return fail(req, 400, "E_PLAY_REJECTED", `Satın alma doğrulanamadı (${play.status})`)
    }

    const ev = evaluate(play.sub)
    if (!ev) return fail(req, 400, "E_SKU", "Ürün eşleşmedi")

    // 5) Onaylanmamışsa onayla. Onay 3 gün içinde yapılmazsa Google aboneliği otomatik İADE EDER ve Premium kendiliğinden kaybolur.
    //    Bu yüzden onay başarısızsa Premium vermeyiz; kullanıcı "Satın alımı geri yükle" ile (ya da uygulamayı yeniden açınca) tekrar dener.
    stage = "ack"
    if (ev.needsAck) {
      const acked = await acknowledge(token, play.access)
      if (!acked) return fail(req, 502, "E_ACK", "Satın alma onaylanamadı. Birkaç dakika sonra 'Satın alımı geri yükle'ye dokunun.")
    }

    // 6) Kaydet (sadece service role yazabilir)
    stage = "save"
    const record = {
      user_id: userId,
      product_id: SKU,
      purchase_token: token,
      status: ev.status,
      expires_at: ev.expiresAt,
      order_id: ev.orderId,
      updated_at: new Date().toISOString(),
    }
    let { error: upErr } = await admin.from("subscriptions").upsert(record, { onConflict: "user_id" })
    // 42P10: user_id üzerinde benzersiz kısıt yok -> upsert çalışamaz; elle güncelle/ekle (kalıcı çözüm: supabase/008_abonelik_tablosu.sql)
    if (upErr?.code === "42P10") {
      const upd = await admin.from("subscriptions").update(record).eq("user_id", userId).select("user_id")
      if (!upd.error && (upd.data?.length ?? 0) > 0) upErr = null
      else if (!upd.error) upErr = (await admin.from("subscriptions").insert(record)).error
      else upErr = upd.error
    }
    if (upErr) {
      console.error("[premium-verify] subscriptions kayıt hatası:", upErr.code, upErr.message, upErr.details, upErr.hint)
      return fail(req, 500, "E_DB", `Kayıt hatası (${upErr.code || "?"})`)
    }

    return json(req, { premium: ev.entitled, status: ev.status, expiresAt: ev.expiresAt, pending: ev.pending })
  } catch (e) {
    if (e instanceof PlayError) {
      console.error(`[premium-verify] ${stage} aşamasında ${e.code}:`, e.message)
      const transient = e.code === "E_GOOGLE_NET" || e.code === "E_PLAY_NET"
      return fail(req, transient ? 502 : 500, e.code, PLAY_ERRORS[e.code] || "Sunucu hatası")
    }
    console.error(`[premium-verify] ${stage} aşamasında beklenmeyen hata:`, e instanceof Error ? e.stack || e.message : e)
    return fail(req, 500, "E_UNKNOWN", "Sunucu hatası")
  }
})
