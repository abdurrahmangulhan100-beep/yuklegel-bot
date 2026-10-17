"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarClock, CheckCircle2, FileWarning, Pencil, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet } from "@/components/Sheet"
import { cn } from "@/lib/utils"

export type VehicleDoc = {
  id: string
  type: string
  plate: string
  /** YYYY-MM-DD */
  due: string
  note: string
}

const KEY = "vehicle_docs_v1"

export const DOC_TYPES = [
  "Araç Muayenesi",
  "Zorunlu Trafik Sigortası",
  "Kasko",
  "Takograf Kalibrasyonu",
  "SRC Belgesi",
  "Ehliyet",
  "Psikoteknik",
  "Yetki Belgesi",
  "Egzoz Emisyon Ölçümü",
  "Taşıma / Yük Sigortası",
  "Diğer",
]

const pad = (n: number) => String(n).padStart(2, "0")
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function loadDocs(): VehicleDoc[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((d) => d && typeof d.due === "string") : []
  } catch {
    return []
  }
}

function saveDocs(docs: VehicleDoc[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(docs))
  } catch {
    // depolama kapalı
  }
}

export function daysLeft(due: string): number {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const d = new Date(due + "T00:00:00")
  return Math.round((d.getTime() - t.getTime()) / 86_400_000)
}

/** 30 gün içinde dolacak veya süresi geçmiş belge sayısı */
export function docsAlertCount(): number {
  return loadDocs().filter((d) => daysLeft(d.due) <= 30).length
}

function status(days: number) {
  if (days < 0) return { label: `${Math.abs(days)} gün geçti`, tone: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" }
  if (days === 0) return { label: "Bugün doluyor", tone: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" }
  if (days <= 15) return { label: `${days} gün kaldı`, tone: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-500" }
  if (days <= 30) return { label: `${days} gün kaldı`, tone: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400" }
  return { label: `${days} gün kaldı`, tone: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" }
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function DocumentsTool() {
  const [docs, setDocs] = useState<VehicleDoc[]>([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleDoc | null>(null)
  const [type, setType] = useState(DOC_TYPES[0])
  const [plate, setPlate] = useState("")
  const [due, setDue] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDocs(loadDocs())
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) saveDocs(docs)
  }, [docs, ready])

  const sorted = useMemo(() => [...docs].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0)), [docs])
  const plates = useMemo(() => Array.from(new Set(docs.map((d) => d.plate).filter(Boolean))), [docs])
  const urgent = sorted.filter((d) => daysLeft(d.due) <= 30).length

  const openNew = () => {
    setEditing(null)
    setType(DOC_TYPES[0])
    setPlate(plates[0] ?? "")
    setDue("")
    setNote("")
    setError(null)
    setOpen(true)
  }

  const openEdit = (d: VehicleDoc) => {
    setEditing(d)
    setType(d.type)
    setPlate(d.plate)
    setDue(d.due)
    setNote(d.note)
    setError(null)
    setOpen(true)
  }

  const save = () => {
    if (!due) return setError("Bitiş tarihini seçin.")
    const rec: VehicleDoc = { id: editing?.id ?? newId(), type, plate: plate.toUpperCase().trim(), due, note: note.trim() }
    setDocs((prev) => (editing ? prev.map((d) => (d.id === editing.id ? rec : d)) : [...prev, rec]))
    setOpen(false)
  }

  const remove = (d: VehicleDoc) => {
    if (!confirm(`"${d.type}" kaydı silinsin mi?`)) return
    setDocs((prev) => prev.filter((x) => x.id !== d.id))
  }

  /** Yenilendi: bitiş tarihini 1 yıl ileri al */
  const renew = (d: VehicleDoc) => {
    const base = new Date(d.due + "T00:00:00")
    const next = new Date(Math.max(base.getTime(), Date.now()))
    next.setFullYear(next.getFullYear() + 1)
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, due: iso(next) } : x)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          {urgent > 0 ? (
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#d64526]">
              <FileWarning className="size-4" /> {urgent} belgenin süresi dolmak üzere veya geçmiş
            </p>
          ) : docs.length > 0 ? (
            <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="size-4" /> Yaklaşan bir bitiş tarihi yok
            </p>
          ) : (
            <p className="text-sm text-[#718397]">Muayene, sigorta, SRC gibi belgelerinizin bitiş tarihlerini ekleyin.</p>
          )}
        </div>
        <button onClick={openNew} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[#d64526] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#b8381e]">
          <Plus className="size-4" /> Belge Ekle
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
            <CalendarClock className="size-7" />
          </div>
          <p className="text-sm font-bold text-[#122c4a]">Henüz belge eklemediniz</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-[#718397]">Tarihi geçen muayene veya sigorta cezaya yol açar. Buraya ekleyin, kalan günü takip edin.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sorted.map((d) => {
            const days = daysLeft(d.due)
            const s = status(days)
            // 365 günlük skalaya göre kalan oran (görsel ipucu)
            const frac = Math.max(0.04, Math.min(1, days / 365))
            return (
              <li key={d.id} className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-[#122c4a]">{d.type}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#718397]">
                      {d.plate && <span className="font-semibold text-[#334e68]">{d.plate}</span>}
                      <span>{new Date(d.due + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold", s.tone)}>{s.label}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef2f6]">
                  <div className={cn("h-full rounded-full", s.bar)} style={{ width: `${days < 0 ? 100 : frac * 100}%` }} />
                </div>
                {d.note && <p className="mt-2.5 text-xs text-[#627d98]">{d.note}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => renew(d)} className="h-9 rounded-lg bg-[#eef4f8] px-3 text-xs font-semibold text-[#315d83] hover:bg-[#dfeaf3]">
                    Yenilendi (+1 yıl)
                  </button>
                  <div className="flex items-center">
                    <button onClick={() => openEdit(d)} aria-label="Düzenle" className="grid size-9 place-items-center rounded-full text-[#b4c1ce] hover:bg-[#eef4f8] hover:text-[#315d83]">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => remove(d)} aria-label="Sil" className="grid size-9 place-items-center rounded-full text-[#b4c1ce] hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-[#8da0b2]">Kayıtlar yalnızca bu cihazda saklanır; uygulama verisini silerseniz kaybolur. Hatırlatma, uygulamayı açtığınızda görünür.</p>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Belgeyi Düzenle" : "Belge Ekle"}
        footer={
          <button onClick={save} className="h-12 w-full rounded-xl bg-[#122c4a] text-sm font-semibold text-white hover:bg-[#1a3d68]">
            {editing ? "Güncelle" : "Kaydet"}
          </button>
        }
      >
        <div className="space-y-3.5 pt-1">
          <label className="block text-xs font-semibold text-[#334e68]">
            Belge türü
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-3 text-base text-[#122c4a] md:text-sm">
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#334e68]">
            Plaka / Kişi (ops.)
            <Input list="doc-plates" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Örn: 42 ABC 123" className="mt-1.5 h-12 text-base uppercase md:text-sm" />
            <datalist id="doc-plates">
              {plates.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="block text-xs font-semibold text-[#334e68]">
            Bitiş tarihi
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-3 text-base text-[#122c4a] md:text-sm" />
          </label>
          <label className="block text-xs font-semibold text-[#334e68]">
            Not (ops.)
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Poliçe no, acente vb." className="mt-1.5 h-12 text-base md:text-sm" />
          </label>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </Sheet>
    </div>
  )
}
