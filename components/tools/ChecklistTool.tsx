"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { id: string; text: string; custom?: boolean }
type Group = { key: string; title: string; items: Item[] }

const STATE_KEY = "trip_checklist_v1"
const CUSTOM_KEY = "trip_checklist_custom_v1"

const GROUPS: Group[] = [
  {
    key: "arac",
    title: "Araç",
    items: [
      { id: "lastik", text: "Lastik basıncı ve diş derinliği (çekici + dorse)" },
      { id: "sivi", text: "Motor yağı, soğutma suyu, cam suyu seviyesi" },
      { id: "fren", text: "Fren hava basıncı ve el freni" },
      { id: "isik", text: "Far, stop, sinyal, dörtlü flaşör çalışıyor" },
      { id: "ayna", text: "Aynalar ve silecekler temiz / çalışıyor" },
      { id: "yakit", text: "Yakıt ve AdBlue seviyesi yeterli" },
      { id: "kaplin", text: "Dorse bağlantısı (beşinci teker, hava ve elektrik hortumları)" },
    ],
  },
  {
    key: "evrak",
    title: "Evrak",
    items: [
      { id: "ruhsat", text: "Ruhsat, ehliyet ve SRC yanımda" },
      { id: "sigorta", text: "Trafik sigortası ve muayene geçerli" },
      { id: "tako", text: "Takograf kartı ve yeterli kâğıt / veri" },
      { id: "irsaliye", text: "İrsaliye, taşıma belgesi ve yük sigortası" },
      { id: "hgs", text: "HGS / OGS bakiyesi yeterli" },
    ],
  },
  {
    key: "yuk",
    title: "Yük",
    items: [
      { id: "baglama", text: "Yük bağlama kayışları ve zincirleri sıkı" },
      { id: "brandalar", text: "Branda, kilit ve kapaklar kapalı" },
      { id: "dagilim", text: "Ağırlık dengeli dağıtılmış, dingil limiti aşılmamış" },
    ],
  },
  {
    key: "guvenlik",
    title: "Güvenlik Ekipmanı",
    items: [
      { id: "tup", text: "Yangın söndürme tüpü (dolu ve tarihi geçmemiş)" },
      { id: "reflektor", text: "Reflektör (üçgen) ve yelek" },
      { id: "ilkyardim", text: "İlk yardım çantası" },
      { id: "takoz", text: "Takoz, kriko ve yedek lastik" },
    ],
  },
]

const pad = (n: number) => String(n).padStart(2, "0")
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function readChecked(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "null")
    // Liste her gün sıfırdan başlar
    if (raw && raw.date === todayIso() && Array.isArray(raw.checked)) return raw.checked
  } catch {
    // bozuk kayıt
  }
  return []
}

function readCustom(): Item[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.id === "string" && typeof x.text === "string").map((x) => ({ ...x, custom: true })) : []
  } catch {
    return []
  }
}

/** Araçlar ekranındaki rozet için bugünkü ilerleme */
export function checklistProgress(): { done: number; total: number } {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0) + readCustom().length
  const ids = new Set([...GROUPS.flatMap((g) => g.items.map((i) => i.id)), ...readCustom().map((i) => i.id)])
  const done = readChecked().filter((id) => ids.has(id)).length
  return { done, total }
}

export function ChecklistTool() {
  const [checked, setChecked] = useState<string[]>([])
  const [custom, setCustom] = useState<Item[]>([])
  const [draft, setDraft] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setChecked(readChecked())
    setCustom(readCustom())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ date: todayIso(), checked }))
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom.map(({ id, text }) => ({ id, text }))))
    } catch {
      // depolama kapalı
    }
  }, [checked, custom, ready])

  const groups = useMemo<Group[]>(
    () => (custom.length > 0 ? [...GROUPS, { key: "ozel", title: "Benim Maddelerim", items: custom }] : GROUPS),
    [custom]
  )
  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const done = groups.reduce((n, g) => n + g.items.filter((i) => checked.includes(i.id)).length, 0)
  const complete = total > 0 && done === total

  const toggle = (id: string) => setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const addCustom = () => {
    const text = draft.trim().slice(0, 80)
    if (!text) return
    setCustom((prev) => [...prev, { id: `c-${Date.now()}`, text, custom: true }])
    setDraft("")
  }

  const removeCustom = (id: string) => {
    setCustom((prev) => prev.filter((i) => i.id !== id))
    setChecked((prev) => prev.filter((x) => x !== id))
  }

  return (
    <div className="space-y-4">
      <div className={cn("rounded-3xl p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.2)]", complete ? "bg-gradient-to-br from-emerald-600 to-emerald-800" : "bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33]")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Bugünkü kontrol</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {done}<span className="text-lg font-bold text-white/60"> / {total}</span>
            </p>
            <p className="mt-1 text-sm text-white/75">{complete ? "Hazırsınız, iyi yolculuklar." : "Yola çıkmadan önce maddeleri işaretleyin."}</p>
          </div>
          <button
            type="button"
            onClick={() => setChecked([])}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold ring-1 ring-white/20 active:scale-95"
          >
            <RotateCcw className="size-3.5" /> Sıfırla
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="rounded-2xl border border-[#e4e9ef] bg-white p-2 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-3">
          <h3 className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">{g.title}</h3>
          <ul>
            {g.items.map((item) => {
              const on = checked.includes(item.id)
              return (
                <li key={item.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={on}
                    className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-[#f5f7fa]"
                  >
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors", on ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#c4d0dc] bg-white")}>
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                    <span className={cn("text-sm font-medium", on ? "text-[#8da0b2] line-through" : "text-[#122c4a]")}>{item.text}</span>
                  </button>
                  {item.custom && (
                    <button
                      type="button"
                      onClick={() => removeCustom(item.id)}
                      aria-label="Maddeyi sil"
                      className="mr-1 grid size-10 shrink-0 place-items-center rounded-full text-[#b4c1ce] active:bg-red-50 active:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustom() }}
          placeholder="Kendi maddenizi ekleyin (örn: Termos, şarj aleti)"
          maxLength={80}
          className="h-12 min-w-0 flex-1 rounded-xl border border-[#dbe3ec] bg-white px-3.5 text-base text-[#122c4a] outline-none placeholder:text-[#a3b1c0] focus:border-[#122c4a] focus:ring-4 focus:ring-[#122c4a]/10 md:text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!draft.trim()}
          className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-[#122c4a] px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="size-4" /> Ekle
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[#8da0b2]">Liste her gün yeniden başlar. Eklediğiniz maddeler cihazınızda saklanır.</p>
    </div>
  )
}
