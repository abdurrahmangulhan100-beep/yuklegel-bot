"use client"

import { useEffect, useRef, useState } from "react"
import { Crown } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { openPremium } from "@/lib/premium"

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT
// Uygulama (Play Store / TWA) içinde AdSense reklamı göstermek için "true" yapın.
// Varsayılan: kapalı. Uygulama içinde "Premium'a geç" kartı gösterilir, reklam sadece tarayıcıda çıkar.
const ADS_IN_APP = process.env.NEXT_PUBLIC_ADS_IN_APP === "true"

/** Sayfa Play Store uygulaması (TWA) veya yüklü PWA içinde mi açıldı? */
function detectApp(): boolean {
  try {
    if (sessionStorage.getItem("is_app") === "1") return true
    const fromTwa = (document.referrer || "").startsWith("android-app://")
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    if (fromTwa || standalone) {
      sessionStorage.setItem("is_app", "1")
      return true
    }
  } catch {}
  return false
}

let scriptAdded = false
function ensureAdsScript() {
  if (scriptAdded || !CLIENT || typeof document === "undefined") return
  scriptAdded = true
  const s = document.createElement("script")
  s.async = true
  s.crossOrigin = "anonymous"
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`
  document.head.appendChild(s)
}

/**
 * Reklam alanı. Premium kullanıcıda hiç görünmez.
 * AdSense tanımlıysa reklam, değilse "Premium'a geç" kartı gösterir.
 */
export function AdSlot({ className = "" }: { className?: string }) {
  const { isPremium, loading } = usePremium()
  const pushed = useRef(false)
  const [inApp, setInApp] = useState<boolean | null>(null)
  const useAdsense = Boolean(CLIENT && SLOT) && (inApp === false || ADS_IN_APP)

  useEffect(() => {
    setInApp(detectApp())
  }, [])

  useEffect(() => {
    if (loading || isPremium || inApp === null || !useAdsense || pushed.current) return
    ensureAdsScript()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any
      ;(w.adsbygoogle = w.adsbygoogle || []).push({})
      pushed.current = true
    } catch {}
  }, [loading, isPremium, inApp, useAdsense])

  if (loading || isPremium || inApp === null) return null

  return (
    <div className={className}>
      {useAdsense ? (
        <div className="overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white p-2">
          <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[#b4c1ce]">Reklam</p>
          <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={SLOT} data-ad-format="auto" data-full-width-responsive="true" />
        </div>
      ) : (
        <PremiumPromo />
      )}
    </div>
  )
}

export function PremiumPromo() {
  return (
    <button
      type="button"
      onClick={openPremium}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#f3d9a4] bg-gradient-to-r from-[#fff8e6] to-[#fff1cf] p-4 text-left transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f5b301] text-white"><Crown className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#122c4a]">Reklamsız ve sınırsız kullanın</span>
        <span className="block text-xs text-[#7a6a3a]">Nakliye Cepte Premium ile sınırsız iletişim ve tüm şoför araçları.</span>
      </span>
      <span className="shrink-0 rounded-full bg-[#122c4a] px-3 py-1.5 text-xs font-semibold text-white">İncele</span>
    </button>
  )
}
