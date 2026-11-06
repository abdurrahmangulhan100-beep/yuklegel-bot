"use client"

import { Check, Crown, Loader2, Minus } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_FEATURES, PLAY_PACKAGE, PREMIUM_FEATURES, PREMIUM_SKU } from "@/lib/premium"

export function PremiumView({ isGuest = false, onLogin }: { isGuest?: boolean; onLogin?: () => void }) {
  const { isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore } = usePremium()

  const manageUrl = `https://play.google.com/store/account/subscriptions?sku=${PREMIUM_SKU}${PLAY_PACKAGE ? `&package=${PLAY_PACKAGE}` : ""}`
  const storeUrl = PLAY_PACKAGE ? `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}` : null
  const dateText = expiresAt ? new Date(expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="relative overflow-hidden rounded-[28px] bg-navy-gradient p-6 text-white shadow-card sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-brand/25 blur-3xl" />
        <span className="relative mb-4 grid size-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-[#d64526]/30"><Crown className="size-6" /></span>
        <h1 className="relative text-[26px] font-black tracking-tight sm:text-3xl">Nakliye Cepte Premium</h1>
        <p className="relative mt-1 text-sm text-white/70">Daha hızlı iş bulun, sınırsız iletişim kurun, reklamsız kullanın.</p>

        {isPremium ? (
          <div className="relative mt-5 rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
            <p className="font-semibold">Premium aktif ✓</p>
            {dateText && (
              <p className="mt-0.5 text-white/70">
                {status === "canceled" ? `Abonelik iptal edildi, ${dateText} tarihine kadar geçerli.` : `Sonraki yenileme / bitiş: ${dateText}`}
              </p>
            )}
          </div>
        ) : (
          <div className="relative mt-5">
            <p className="text-4xl font-black tracking-tight">{price ?? "Aylık abonelik"}{price && <span className="text-base font-medium text-white/70"> / ay</span>}</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-border bg-card p-5 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Ücretsiz</p>
          <ul className="space-y-2 text-sm text-foreground/80">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2"><Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[24px] border-2 border-brand/60 bg-brand/[0.04] p-5 shadow-card">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.16em] text-brand">Premium</p>
          <ul className="space-y-2 text-sm text-foreground">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {message && <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-foreground/80">{message}</p>}

      {!isPremium && isGuest && (
        <div className="space-y-3 rounded-[24px] border border-border bg-card p-5 text-center shadow-card">
          <p className="text-sm text-foreground/80">Premium almak için önce ücretsiz üye olun veya giriş yapın. Abonelik hesabınıza bağlanır, telefon değiştirseniz de korunur.</p>
          <button onClick={onLogin} className="h-14 w-full rounded-2xl bg-brand-gradient text-[15px] font-extrabold text-white shadow-lg shadow-[#d64526]/25 active:scale-[.98]">Giriş Yap / Kayıt Ol</button>
        </div>
      )}

      {!isPremium && !isGuest && (
        <div className="space-y-2">
          {canBuyHere ? (
            <button
              onClick={buy}
              disabled={busy || loading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient text-[15px] font-extrabold text-white shadow-lg shadow-[#d64526]/25 transition active:scale-[.98] disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Premium'a Geç
            </button>
          ) : (
            <div className="rounded-[24px] border border-border bg-card p-5 text-sm text-foreground/80 shadow-card">
              Premium satın alımı Google Play'den indirilen Nakliye Cepte uygulamasında yapılır. Zaten Premium aldıysanız aynı hesapla uygulamaya giriş yapmanız yeterli; Premium otomatik açılır.
              {storeUrl && <> <a href={storeUrl} className="font-semibold text-foreground/80 underline">Google Play'de aç</a></>}
            </div>
          )}
          {canBuyHere && (
            <button onClick={restore} disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-foreground/80 hover:bg-card disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Satın alımı geri yükle
            </button>
          )}
        </div>
      )}

      {isPremium && (
        <a href={manageUrl} className="block h-14 w-full rounded-2xl border border-border bg-card text-center text-sm font-bold leading-[3.5rem] text-foreground/80 shadow-card active:scale-[.98]">
          Aboneliği yönet / iptal et
        </a>
      )}

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Abonelik aylıktır ve iptal edilmediği sürece her ay Google Play hesabınızdan otomatik yenilenir. İstediğiniz zaman Google Play &gt; Abonelikler bölümünden iptal edebilirsiniz; iptal sonrası mevcut dönemin sonuna kadar Premium kullanmaya devam edersiniz. Ödeme Google Play tarafından işlenir.
      </p>
    </div>
  )
}
