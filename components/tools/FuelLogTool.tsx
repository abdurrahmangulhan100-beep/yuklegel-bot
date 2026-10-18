"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRightLeft, Check, Fuel, Plus, Trash2 } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import { cn } from "@/lib/utils"

type Fill = {
  id: string
  /** YYYY-MM-DD */
  date: string
  km: number
  liters: number
  total: number
  /** Depo tamamen doldu mu? Tüketim hesabı için gerekli */
  full: boolean
}

const KEY = "fuel_log_v1"
const CALC_KEY = "calc_v2"

const pad = (n: number) => String(n).padStart(2, "0")
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const num = (v: string) => {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}
const fmt = (n: number, d = 1) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
const money = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n)

function load(): Fill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((f) => f && Number.isFinite(f.km) && Number.isFinite(f.liters)) : []
  } catch {
    return []
  }
}

/**
 * Depo-depo yöntemi: iki "tam depo" arasındaki tüm yakıt, aradaki km'ye bölünür.
 * Aradaki kısmi dolumlar da litreye eklenir. İlk tam depo yalnızca başlangıç noktasıdır.
 */
function analyze(fills: Fill[]) {
  const sorted = [...fills].sort((a, b) => a.km - b.km)
  let baseKm: number | null = null
  let acc = 0
  let litersCounted = 0
  let kmCounted = 0
  const per: Record<string, number> = {}

  for (const f of sorted) {
    if (baseKm === null) {
      if (f.full) baseKm = f.km
      continue
    }
    acc += f.liters
    if (f.full && f.km > baseKm) {
      const km = f.km - baseKm
      per[f.id] = (acc / km) * 100
      litersCounted += acc
      kmCounted += km
      baseKm = f.km
      acc = 0
    }
  }

  const totalCost = fills.reduce((n, f) => n + f.total, 0)
  const totalLiters = fills.reduce((n, f) => n + f.liters, 0)
  return {
    per,
    avg: kmCounted > 0 ? (litersCounted / kmCounted) * 100 : 0,
    avgPrice: totalLiters > 0 ? totalCost / totalLiters : 0,
    totalCost,
    totalLiters,
    lastPrice: sorted.length ? (sorted[sorted.length - 1].liters > 0 ? sorted[sorted.length - 1].total / sorted[sorted.length - 1].liters : 0) : 0,
  }
}

export function FuelLogTool() {
  const [fills, setFills] = useState<Fill[]>([])
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({ date: todayIso(), km: "", liters: "", total: "", full: true })

  useEffect(() => {
    setFills(load())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(KEY, JSON.stringify(fills))
    } catch {
      // depolama kapalı
    }
  }, [fills, ready])

  const stats = useMemo(() => analyze(fills), [fills])
  const list = useMemo(() => [...fills].sort((a, b) => b.km - a.km), [fills])
  const lastKm = list[0]?.km ?? 0

  const openForm = () => {
    setErr(null)
    setForm({ date: todayIso(), km: "", liters: "", total: "", full: true })
    setOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const km = Math.round(num(form.km))
    const liters = num(form.liters)
    const total = num(form.total)
    if (km <= 0) return setErr("Kilometre sayacını yazın.")
    if (liters <= 0) return setErr("Alınan litreyi yazın.")
    if (total <= 0) return setErr("Ödenen tutarı yazın.")
    if (fills.some((f) => f.km === km)) return setErr("Bu kilometrede zaten bir kayıt var.")
    setFills((prev) => [...prev, { id: `f-${Date.now()}`, date: form.date || todayIso(), km, liters, total, full: form.full }])
    setOpen(false)
  }

  const remove = (id: string) => {
    if (!confirm("Bu yakıt kaydı silinsin mi?")) return
    setFills((prev) => prev.filter((f) => f.id !== id))
  }

  // Ortalama tüketim ve fiyatı "Sefer Hesapla" ekranına taşır
  const sendToCalculator = () => {
    try {
      const cur = JSON.parse(localStorage.getItem(CALC_KEY) || "{}")
      const next = { ...cur }
      if (stats.avg > 0) next.consumption = String(Math.round(stats.avg * 10) / 10)
      if (stats.lastPrice > 0) next.fuelPrice = String(Math.round(stats.lastPrice * 100) / 100)
      localStorage.setItem(CALC_KEY, JSON.stringify(next))
      setSent(true)
      setTimeout(() => setSent(false), 2500)
    } catch {
      // depolama kapalı
    }
  }

  const fieldClass =
    "h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-3.5 text-base text-[#122c4a] outline-none transition-colors focus:border-[#122c4a] focus:ring-4 focus:ring-[#122c4a]/10 md:text-sm"
  const labelClass = "mb-1.5 block text-xs font-semibold text-[#334e68]"

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
          <Fuel className="size-3.5" /> Yakıt özeti
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Ort. tüketim" value={stats.avg > 0 ? `${fmt(stats.avg)} L/100km` : "—"} />
          <Stat label="Ort. litre fiyatı" value={stats.avgPrice > 0 ? `${fmt(stats.avgPrice, 2)} ₺` : "—"} />
          <Stat label="Toplam harcama" value={fills.length ? money(stats.totalCost) : "—"} />
          <Stat label="Toplam yakıt" value={fills.length ? `${fmt(stats.totalLiters, 0)} L` : "—"} />
        </div>
        {stats.avg === 0 && fills.length > 0 && (
          <p className="mt-3 text-xs text-white/65">Tüketimi hesaplamak için en az iki kez “depo full” kayıt gerekir.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={openForm}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d64526] text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-4" /> Yakıt Ekle
        </button>
        <button
          type="button"
          onClick={sendToCalculator}
          disabled={stats.avg <= 0 && stats.lastPrice <= 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe3ec] bg-white text-sm font-semibold text-[#122c4a] active:scale-[0.98] disabled:opacity-40"
        >
          {sent ? <Check className="size-4 text-emerald-600" /> : <ArrowRightLeft className="size-4" />}
          {sent ? "Aktarıldı" : "Sefer Hesapla'ya aktar"}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
            <Fuel className="size-7" />
          </div>
          <p className="text-sm font-bold text-[#122c4a]">Henüz yakıt kaydı yok</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-[#718397]">Her yakıt aldığınızda kilometre, litre ve tutarı girin; ortalama tüketiminizi otomatik hesaplayalım.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#edf0f3] overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-[#122c4a]">
                  <span className="tabular-nums">{fmt(f.km, 0)} km</span>
                  {!f.full && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Kısmi</span>}
                  {stats.per[f.id] !== undefined && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{fmt(stats.per[f.id])} L/100km</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[#718397]">
                  {new Date(f.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} • {fmt(f.liters)} L • {fmt(f.total / f.liters, 2)} ₺/L
                </div>
              </div>
              <div className="shrink-0 text-sm font-extrabold tabular-nums text-[#122c4a]">{money(f.total)}</div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                aria-label="Kaydı sil"
                className="grid size-10 shrink-0 place-items-center rounded-full text-[#b4c1ce] active:bg-red-50 active:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Yakıt Ekle"
        subtitle={lastKm > 0 ? `Son kayıt: ${fmt(lastKm, 0)} km` : "İlk kaydınızı ekleyin"}
        footer={
          <div className="space-y-2.5">
            {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{err}</div>}
            <button type="submit" form="fuel-form" className="h-12 w-full rounded-xl bg-[#d64526] text-sm font-semibold text-white active:bg-[#b93820]">
              Kaydet
            </button>
          </div>
        }
      >
        <form id="fuel-form" onSubmit={save} className="space-y-4 pt-1">
          <div>
            <label className={labelClass} htmlFor="fl-date">Tarih</label>
            <input id="fl-date" type="date" value={form.date} max={todayIso()} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="fl-km">Kilometre sayacı</label>
            <input id="fl-km" inputMode="numeric" placeholder="Örn: 482150" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value.replace(/\D/g, "").slice(0, 8) })} className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="fl-l">Alınan litre</label>
              <input id="fl-l" inputMode="decimal" placeholder="Örn: 320" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="fl-t">Ödenen tutar (₺)</label>
              <input id="fl-t" inputMode="decimal" placeholder="Örn: 13440" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className={fieldClass} />
            </div>
          </div>
          <label
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors",
              form.full ? "border-[#122c4a] bg-[#122c4a]/5" : "border-[#e4e9ef] bg-white"
            )}
          >
            <input type="checkbox" checked={form.full} onChange={(e) => setForm({ ...form, full: e.target.checked })} className="size-5 shrink-0 accent-[#122c4a]" />
            <span>
              <span className="block text-sm font-semibold text-[#122c4a]">Depoyu tamamen doldurdum</span>
              <span className="block text-xs text-[#718397]">Tüketim hesabı için tam depo kayıtları kullanılır.</span>
            </span>
          </label>
        </form>
      </Sheet>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  )
}
