"use client"

import { Crown, Lock } from "lucide-react"
import { openPremium } from "@/lib/premium"

/** Premium'a özel bölümlerde ücretsiz kullanıcıya gösterilen kilit ekranı */
export function PremiumLock({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/60 dark:bg-amber-400/15">
        <Lock className="size-6 text-[#d98a00]" />
      </div>
      <h2 className="text-lg font-bold text-foreground/80">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
