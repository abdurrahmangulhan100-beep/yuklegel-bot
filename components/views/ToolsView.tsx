"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Boxes, Crown, CalendarClock, ChevronRight, ClipboardCheck, Fuel, Route as RouteIcon, Timer, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TachographTool } from "@/components/tools/TachographTool"
import { TripPlannerTool } from "@/components/tools/TripPlannerTool"
import { DocumentsTool, docsAlertCount, loadDocs } from "@/components/tools/DocumentsTool"
import { VolumeTool } from "@/components/tools/VolumeTool"
import { ChecklistTool, checklistProgress } from "@/components/tools/ChecklistTool"
import { FuelLogTool } from "@/components/tools/FuelLogTool"
import { loadSegments } from "@/lib/tachograph"
import { usePremium } from "@/components/PremiumProvider"
import { PREMIUM_ONLY_TOOLS, openPremium } from "@/lib/premium"

type ToolKey = "tacho" | "planner" | "docs" | "volume" | "check" | "fuel"

const TOOLS: { key: ToolKey; title: string; desc: string; icon: LucideIcon; tone: string }[] = [
  { key: "tacho", title: "Takograf Sayacı", desc: "4,5 saat mola, günlük 9 saat ve haftalık 56 saat sürüş limitlerini canlı takip edin.", icon: Timer, tone: "bg-amber-500/15 text-amber-600" },
  { key: "planner", title: "Varış Süresi Planlayıcı", desc: "Zorunlu mola ve dinlenmeler dahil, yola çıkış saatinize göre tahmini varışı görün.", icon: RouteIcon, tone: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300" },
  { key: "docs", title: "Belge Hatırlatıcı", desc: "Muayene, sigorta, SRC, takograf kalibrasyonu gibi bitiş tarihlerini takip edin.", icon: CalendarClock, tone: "bg-brand/12 text-brand" },
  { key: "check", title: "Sefer Öncesi Kontrol", desc: "Araç, evrak, yük ve güvenlik ekipmanı için günlük kontrol listesi; kendi maddelerinizi de ekleyin.", icon: ClipboardCheck, tone: "bg-sky-500/15 text-sky-600" },
  { key: "fuel", title: "Yakıt Defteri", desc: "Yakıt alımlarını kaydedin; ortalama L/100 km tüketiminizi hesaplayıp Sefer Hesapla'ya aktarın.", icon: Fuel, tone: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  { key: "volume", title: "Hacim, Desi & Ladin Metre", desc: "Palet ve koli ölçülerinden m³, desi ve LDM hesaplayın; tıra ne kadar sığdığını görün.", icon: Boxes, tone: "bg-emerald-500/12 text-emerald-600" },
]

export function ToolsView() {
  const { isPremium } = usePremium()
  const [active, setActive] = useState<ToolKey | null>(null)
  const [badges, setBadges] = useState<Partial<Record<ToolKey, { text: string; tone: string }>>>({})

  // Hub kartlarındaki canlı rozetler (yalnızca cihazdaki kayıtlardan)
  useEffect(() => {
    if (active) return
    const next: Partial<Record<ToolKey, { text: string; tone: string }>> = {}
    try {
      if (loadSegments().some((s) => s.end === null)) next.tacho = { text: "Sürüşte", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
      const n = docsAlertCount()
      if (n > 0) next.docs = { text: `${n} uyarı`, tone: "bg-red-500/15 text-red-600" }
      else if (loadDocs().length > 0) next.docs = { text: "Güncel", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
      const cp = checklistProgress()
      if (cp.done > 0) next.check = { text: cp.done === cp.total ? "Hazır" : `${cp.done}/${cp.total}`, tone: cp.done === cp.total ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300" }
    } catch {
      // depolama erişilemiyorsa rozet göstermeyiz
    }
    setBadges(next)
  }, [active])

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 })
  }, [active])

  const current = TOOLS.find((t) => t.key === active)

  if (current) {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => setActive(null)} className="mb-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-xs font-bold text-foreground/80 shadow-card active:scale-95">
            <ArrowLeft className="size-4" /> Tüm araçlar
          </button>
          <div className="flex items-center gap-3"><span className={cn("grid size-11 place-items-center rounded-2xl", current.tone)}><current.icon className="size-5" /></span><h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{current.title}</h1></div>
        </div>
        {active === "tacho" && <TachographTool />}
        {active === "planner" && <TripPlannerTool />}
        {active === "docs" && <DocumentsTool />}
        {active === "volume" && <VolumeTool />}
        {active === "check" && <ChecklistTool />}
        {active === "fuel" && <FuelLogTool />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-brand">Yolda yanınızda</p>
        <h1 className="text-[26px] font-black tracking-tight text-foreground sm:text-3xl">Şoför Araçları</h1>
        <p className="mt-1 text-sm text-muted-foreground">Veriler yalnızca cihazınızda saklanır.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const b = badges[t.key]
          const locked = !isPremium && PREMIUM_ONLY_TOOLS.includes(t.key)
          return (
            <button
              key={t.key}
              onClick={() => (locked ? openPremium() : setActive(t.key))}
              className="group flex items-center gap-4 rounded-[24px] border border-border bg-card p-4 text-left shadow-card transition-all hover:shadow-card-hover active:scale-[0.985] sm:p-5"
            >
              <span className={cn("grid size-14 shrink-0 place-items-center rounded-[20px]", t.tone)}>
                <t.icon className="size-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-foreground">{t.title}</span>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"><Crown className="size-3" />PRO</span>
                  ) : (
                    b && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", b.tone)}>{b.text}</span>
                  )}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{t.desc}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
