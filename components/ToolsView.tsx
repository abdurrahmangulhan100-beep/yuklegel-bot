"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Boxes, CalendarClock, ChevronRight, Route as RouteIcon, Timer, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TachographTool } from "@/components/tools/TachographTool"
import { TripPlannerTool } from "@/components/tools/TripPlannerTool"
import { DocumentsTool, docsAlertCount, loadDocs } from "@/components/tools/DocumentsTool"
import { VolumeTool } from "@/components/tools/VolumeTool"
import { loadSegments } from "@/lib/tachograph"

type ToolKey = "tacho" | "planner" | "docs" | "volume"

const TOOLS: { key: ToolKey; title: string; desc: string; icon: LucideIcon; tone: string }[] = [
  { key: "tacho", title: "Takograf Sayacı", desc: "4,5 saat mola, günlük 9 saat ve haftalık 56 saat sürüş limitlerini canlı takip edin.", icon: Timer, tone: "bg-amber-50 text-amber-600" },
  { key: "planner", title: "Varış Süresi Planlayıcı", desc: "Zorunlu mola ve dinlenmeler dahil, yola çıkış saatinize göre tahmini varışı görün.", icon: RouteIcon, tone: "bg-[#eef4f8] text-[#315d83]" },
  { key: "docs", title: "Belge Hatırlatıcı", desc: "Muayene, sigorta, SRC, takograf kalibrasyonu gibi bitiş tarihlerini takip edin.", icon: CalendarClock, tone: "bg-[#fff0ec] text-[#d64526]" },
  { key: "volume", title: "Hacim, Desi & Ladin Metre", desc: "Palet ve koli ölçülerinden m³, desi ve LDM hesaplayın; tıra ne kadar sığdığını görün.", icon: Boxes, tone: "bg-emerald-50 text-emerald-600" },
]

export function ToolsView() {
  const [active, setActive] = useState<ToolKey | null>(null)
  const [badges, setBadges] = useState<Partial<Record<ToolKey, { text: string; tone: string }>>>({})

  // Hub kartlarındaki canlı rozetler (yalnızca cihazdaki kayıtlardan)
  useEffect(() => {
    if (active) return
    const next: Partial<Record<ToolKey, { text: string; tone: string }>> = {}
    try {
      if (loadSegments().some((s) => s.end === null)) next.tacho = { text: "Sürüşte", tone: "bg-emerald-100 text-emerald-700" }
      const n = docsAlertCount()
      if (n > 0) next.docs = { text: `${n} uyarı`, tone: "bg-red-100 text-red-700" }
      else if (loadDocs().length > 0) next.docs = { text: "Güncel", tone: "bg-emerald-100 text-emerald-700" }
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
          <button onClick={() => setActive(null)} className="mb-2 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-[#315d83] ring-1 ring-[#e4e9ef] hover:bg-[#f5f7fa]">
            <ArrowLeft className="size-4" /> Tüm araçlar
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">{current.title}</h1>
        </div>
        {active === "tacho" && <TachographTool />}
        {active === "planner" && <TripPlannerTool />}
        {active === "docs" && <DocumentsTool />}
        {active === "volume" && <VolumeTool />}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Yolda yanınızda</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Şoför Araçları</h1>
        <p className="mt-1 text-sm text-[#627d98]">Sürüş, evrak ve yük planlaması için pratik hesaplayıcılar. Veriler yalnızca cihazınızda saklanır.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const b = badges[t.key]
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className="group flex items-start gap-4 rounded-2xl border border-[#e4e9ef] bg-white p-4 text-left shadow-[0_1px_2px_rgba(18,44,74,0.04)] transition-all hover:shadow-md active:scale-[0.99] sm:p-5"
            >
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", t.tone)}>
                <t.icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-[#122c4a]">{t.title}</span>
                  {b && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", b.tone)}>{b.text}</span>}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[#718397]">{t.desc}</span>
              </span>
              <ChevronRight className="mt-1 size-4 shrink-0 text-[#b4c1ce] transition-transform group-hover:translate-x-0.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
