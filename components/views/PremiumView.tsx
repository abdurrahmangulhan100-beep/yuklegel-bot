"use client"

import { Check, Crown, Loader2, X } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_FEATURES, PLAY_PACKAGE, PREMIUM_FEATURES, PREMIUM_SKU } from "@/lib/premium"

export function PremiumView() {
  const { isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore } = usePremium()

  const manageUrl = `https://play.google.com/store/account/subscriptions?sku=${PREMIUM_SKU}${PLAY_PACKAGE ? `&package=${PLAY_PACKAGE}` : ""}`
  const storeUrl = PLAY_PACKAGE ? `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}` : null
  const dateText = expiresAt ? new Date(expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : null

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-[#122c4a] to-[#1f4b6e] p-6 text-white shadow-lg sm:p-8">
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-[#f5b301] text-white"><Crown className="size-6" /></span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Nakliye Cepte Premium</h1>
        <p className="mt-1 text-sm text-white/70">Daha hızlı iş bulun, sınırsız iletişim kurun, reklamsız kullanın.</p>

        {isPremium ? (
          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm">
            <p className="font-semibold">Premium aktif ✓</p>
            {dateText && (
              <p className="mt-0.5 text-white/70">
                {status === "canceled" ? `Abonelik iptal edildi, ${dateText} tarihine kadar geçerli.` : `Sonraki yenileme / bitiş: ${dateText}`}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-3xl font-extrabold">{price ?? "Aylık abonelik"}{price && <span className="text-base font-medium text-white/70"> / ay</span>}</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e4e9ef] bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Ücretsiz</p>
          <ul className="space-y-2 text-sm text-[#486581]">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-[#b4c1ce]" />{f}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-[#f5b301] bg-white p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#b58200]">Premium</p>
          <ul className="space-y-2 text-sm text-[#122c4a]">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {message && <p className="rounded-xl bg-[#eef4f8] px-4 py-3 text-sm text-[#315d83]">{message}</p>}

      {!isPremium && (
        <div className="space-y-2">
          {canBuyHere ? (
            <button
              onClick={buy}
              disabled={busy || loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d64526] text-sm font-bold text-white transition-colors hover:bg-[#c13a1c] disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Premium'a Geç
            </button>
          ) : (
            <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 text-sm text-[#486581]">
              Premium satın alımı Google Play'den indirilen Nakliye Cepte uygulamasında yapılır.
              {storeUrl && <> <a href={storeUrl} className="font-semibold text-[#315d83] underline">Google Play'de aç</a></>}
            </div>
          )}
          <button onClick={restore} disabled={busy} className="h-11 w-full rounded-xl text-sm font-semibold text-[#315d83] hover:bg-white disabled:opacity-60">
            Satın alımı geri yükle
          </button>
        </div>
      )}

      {isPremium && (
        <a href={manageUrl} className="block h-12 w-full rounded-xl border border-[#e4e9ef] bg-white text-center text-sm font-semibold leading-[3rem] text-[#315d83] hover:bg-[#f5f7fa]">
          Aboneliği yönet / iptal et
        </a>
      )}

      <p className="px-1 text-xs leading-relaxed text-[#8da0b2]">
        Abonelik aylıktır ve iptal edilmediği sürece her ay Google Play hesabınızdan otomatik yenilenir. İstediğiniz zaman Google Play &gt; Abonelikler bölümünden iptal edebilirsiniz; iptal sonrası mevcut dönemin sonuna kadar Premium kullanmaya devam edersiniz. Ödeme Google Play tarafından işlenir.
      </p>
    </div>
  )
}
