"use client"

import type { ReactNode } from "react"
import { ChevronDown, Layers } from "lucide-react"
import type { Load } from "@/components/LoadCard"
import { isMissing } from "@/lib/route"
import { cn } from "@/lib/utils"

/**
 * Aynı WhatsApp mesajından çıkan çok güzergâhlı saha ilanlarını (Niğde → Çankırı, Uşak, Nevşehir ...) tek kartta toplar.
 * Tamamen tarayıcıda çalışır: botta, veritabanında ve sunucuda hiçbir değişiklik / ek yük gerektirmez.
 */

/** Bir grup için en az bu kadar ilan gerekir; daha azı tek tek gösterilir */
export const GROUP_MIN = 3
/** Aynı mesajdan gelen satırlar toplu eklendiği için zaman damgaları neredeyse aynıdır */
const GROUP_WINDOW_MS = 5000

export type ListItem =
  | { kind: "single"; load: Load }
  | { kind: "group"; key: string; loads: Load[] }

type Bucket = { loads: Load[]; firstTime: number }

export function groupLoads(loads: Load[]): ListItem[] {
  const slots: (Load | Bucket)[] = []
  const open = new Map<string, Bucket>()

  for (const l of loads) {
    const t = l.createdAt ? Date.parse(l.createdAt) : NaN
    // Yalnızca çıkışı ve telefonu belli saha ilanları gruplanır (farklı gönderenler karışmasın)
    if (l.source !== "bot" || !l.fromCity || isMissing(l.phone) || Number.isNaN(t)) {
      slots.push(l)
      continue
    }
    const key = `${l.fromCity}|${l.phone}`
    const b = open.get(key)
    if (b && b.firstTime - t <= GROUP_WINDOW_MS && b.firstTime - t >= -GROUP_WINDOW_MS) {
      b.loads.push(l)
      continue
    }
    const nb: Bucket = { loads: [l], firstTime: t }
    open.set(key, nb)
    slots.push(nb)
  }

  const items: ListItem[] = []
  for (const s of slots) {
    if ("loads" in s) {
      if (s.loads.length >= GROUP_MIN) items.push({ kind: "group", key: `grp-${s.loads[0].id}`, loads: s.loads })
      else for (const l of s.loads) items.push({ kind: "single", load: l })
    } else {
      items.push({ kind: "single", load: s })
    }
  }
  return items
}

const destOf = (l: Load) => l.toCity || l.cities?.find((c) => c !== l.fromCity) || "—"
const priceOf = (l: Load) => {
  const m = l.cargo.match(/(\d[\d.,]*)\s*(?:₺|tl\b)/i)
  return m ? `${m[1]}₺` : ""
}

const PREVIEW_ROWS = 5

type Props = {
  loads: Load[]
  open: boolean
  onToggle: () => void
  /** Açıkken tek tek gösterilecek ilan kartları */
  children?: ReactNode
}

export function LoadGroupCard({ loads, open, onToggle, children }: Props) {
  const first = loads[0]
  const from = first.fromCity ?? ""

  if (open) {
    return (
      <div className="col-span-full rounded-2xl border border-[#cfe0ee] bg-[#f1f7fc] p-2 sm:p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded="true"
          className="mb-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left active:bg-white/60"
        >
          <span className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-[#122c4a]">
            <Layers aria-hidden className="size-4 shrink-0 text-[#315d83]" />
            <span className="truncate">{from} çıkışlı {loads.length} güzergâh</span>
            <span className="shrink-0 font-medium text-[#627d98]">{first.time}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#315d83]">
            Daralt <ChevronDown aria-hidden className="size-4 rotate-180" />
          </span>
        </button>
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">{children}</div>
      </div>
    )
  }

  const rows = loads.slice(0, PREVIEW_ROWS)
  const rest = loads.length - rows.length

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded="false"
      className="w-full overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white p-4 text-left shadow-[0_1px_2px_rgba(18,44,74,0.04)] transition-colors active:bg-[#f8fafc]"
    >
      <div className="flex items-center gap-3">
        <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white", first.color || "bg-[#315d83]")}>
          {first.initials || "NA"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[#122c4a]">{first.company}</div>
          <div className="text-xs text-[#8da0b2]">{first.time} · Saha Ağı</div>
        </div>
        <span className="shrink-0 rounded-full bg-[#eaf1f8] px-2.5 py-1 text-xs font-bold text-[#315d83]">{loads.length} güzergâh</span>
      </div>

      <div className="mt-3 rounded-xl border border-[#edf1f5] bg-[#f8fafc] px-3 py-2.5">
        <div className="mb-1.5 text-[11px] font-semibold text-[#8da0b2]">Çıkış</div>
        <div className="text-[17px] font-extrabold leading-tight text-[#122c4a]">{from}</div>
      </div>

      <ul className="mt-3 divide-y divide-[#edf1f5]">
        {rows.map((l) => {
          const price = priceOf(l)
          return (
            <li key={l.id} className="flex items-baseline justify-between gap-3 py-2 text-[13px]">
              <span className="min-w-0 truncate font-bold text-[#122c4a]">{destOf(l)}</span>
              <span className="shrink-0 text-xs text-[#627d98]">
                {[l.trailer || l.vehicle, price].filter(Boolean).join(" · ")}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs font-semibold text-[#315d83]">
        <span>{rest > 0 ? `+${rest} güzergâh daha` : ""}</span>
        <span className="flex items-center gap-1">
          Hepsini göster <ChevronDown aria-hidden className="size-4" />
        </span>
      </div>
    </button>
  )
}
