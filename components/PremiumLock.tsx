"use client"

import { Crown, Lock } from "lucide-react"
import { openPremium } from "@/lib/premium"

/** Premium'a özel bölümlerde ücretsiz kullanıcıya gösterilen kilit ekranı */
export function PremiumLock({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-[#e4e9ef] bg-white p-8 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#fff6e5]">
        <Lock className="size-6 text-[#d98a00]" />
      </div>
      <h2 className="text-lg font-bold text-[#1f2937]">{title}</h2>
      <p className="text-sm leading-relaxed text-[#64748b]">{description}</p>
      <button
        onClick={openPremium}
        className="inline-flex items-center gap-2 rounded-xl bg-[#d98a00] px-5 py-3 text-sm font-semibold text-white active:scale-95"
      >
        <Crown className="size-4" />
        Premium'a Geç
      </button>
    </div>
  )
}
