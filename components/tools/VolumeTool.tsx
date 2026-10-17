"use client"

import { useMemo, useState } from "react"
import { Boxes, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Row = { id: number; w: string; l: string; h: string; qty: string; kg: string; stack: string }

const num = (v: string) => {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}
const fmt = (n: number, d = 2) => n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: d })

const PRESETS: { label: string; w: string; l: string; h: string }[] = [
  { label: "Euro palet 120×80", w: "80", l: "120", h: "150" },
  { label: "Endüstriyel palet 120×100", w: "100", l: "120", h: "150" },
  { label: "Koli 60×40×40", w: "40", l: "60", h: "40" },
]

// Standart 13,60 m tır: yaklaşık değerler
const TRUCK = { ldm: 13.6, tons: 24, pallets: 33, m3: 90 }

let seq = 1
const blank = (): Row => ({ id: seq++, w: "80", l: "120", h: "150", qty: "1", kg: "", stack: "1" })

export function VolumeTool() {
  const [rows, setRows] = useState<Row[]>(() => [blank()])

  const upd = (id: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const t = useMemo(() => {
    let m3 = 0
    let desi = 0
    let ldm = 0
    let kg = 0
    let pieces = 0
    for (const r of rows) {
      const qty = Math.max(0, num(r.qty))
      const w = num(r.w)
      const l = num(r.l)
      const h = num(r.h)
      const stack = Math.max(1, Math.round(num(r.stack)) || 1)
      m3 += (w * l * h * qty) / 1_000_000
      desi += (w * l * h * qty) / 3000
      // Ladin metre: zemin alanı / 2,4 m (tır genişliği); üst üste istiflenen parçalar tek yer kaplar
      ldm += (((w / 100) * (l / 100) * qty) / stack) / 2.4
      kg += num(r.kg) * qty
      pieces += qty
    }
    return { m3, desi, ldm, kg, pieces }
  }, [rows])

  const chargeableLdm = Math.max(t.ldm, t.kg / 1850) // yaygın taşıma kuralı: 1 LDM ≈ 1850 kg
  const fill = {
    ldm: Math.min(1.5, t.ldm / TRUCK.ldm),
    kg: Math.min(1.5, t.kg / 1000 / TRUCK.tons),
    m3: Math.min(1.5, t.m3 / TRUCK.m3),
  }

  const inp = "h-11 w-full rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-2.5 text-base text-[#122c4a] outline-none focus:border-[#122c4a] focus:bg-white md:text-sm"

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section className="space-y-3 lg:col-span-7">
        {rows.map((r, i) => (
          <div key={r.id} className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[#122c4a]">Yük kalemi {i + 1}</span>
              {rows.length > 1 && (
                <button onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))} aria-label="Kalemi sil" className="grid size-8 place-items-center rounded-full text-[#b4c1ce] hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => upd(r.id, { w: p.w, l: p.l, h: p.h })}
                  className="rounded-full border border-[#e0e6ed] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#627d98] hover:border-[#c4d0dc]"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Field label="En (cm)"><input inputMode="decimal" className={inp} value={r.w} onChange={(e) => upd(r.id, { w: e.target.value })} /></Field>
              <Field label="Boy (cm)"><input inputMode="decimal" className={inp} value={r.l} onChange={(e) => upd(r.id, { l: e.target.value })} /></Field>
              <Field label="Yükseklik (cm)"><input inputMode="decimal" className={inp} value={r.h} onChange={(e) => upd(r.id, { h: e.target.value })} /></Field>
              <Field label="Adet"><input inputMode="numeric" className={inp} value={r.qty} onChange={(e) => upd(r.id, { qty: e.target.value })} /></Field>
              <Field label="Adet başı kg"><input inputMode="decimal" className={inp} value={r.kg} placeholder="ops." onChange={(e) => upd(r.id, { kg: e.target.value })} /></Field>
              <Field label="İstif">
                <select className={inp} value={r.stack} onChange={(e) => upd(r.id, { stack: e.target.value })}>
                  <option value="1">Tek kat</option>
                  <option value="2">2 kat</option>
                  <option value="3">3 kat</option>
                </select>
              </Field>
            </div>
          </div>
        ))}
        <button onClick={() => setRows((p) => [...p, blank()])} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#dbe3ec] bg-white px-4 text-sm font-semibold text-[#334e68] hover:bg-[#f5f7fa]">
          <Plus className="size-4" /> Kalem ekle
        </button>
      </section>

      <section className="space-y-4 lg:col-span-5">
        <div className="rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
            <Boxes className="size-3.5" /> Toplam ({fmt(t.pieces, 0)} parça)
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Stat label="Hacim" value={`${fmt(t.m3)} m³`} />
            <Stat label="Desi" value={fmt(t.desi, 0)} />
            <Stat label="Ladin metre" value={`${fmt(t.ldm)} LDM`} />
            <Stat label="Ağırlık" value={t.kg > 0 ? `${fmt(t.kg, 0)} kg` : "-"} />
          </div>
          {t.kg > 0 && (
            <p className="mt-3 text-xs text-white/65">
              Ücretlendirilebilir ladin metre: <strong className="text-white">{fmt(chargeableLdm)} LDM</strong> (hacim ve ağırlıktan büyük olan)
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
          <h3 className="mb-3 text-sm font-bold text-[#122c4a]">Standart tıra (13,60 m) göre doluluk</h3>
          <Meter label="Zemin (LDM)" frac={fill.ldm} text={`${fmt(t.ldm)} / ${TRUCK.ldm}`} />
          {t.kg > 0 && <Meter label="Ağırlık" frac={fill.kg} text={`${fmt(t.kg / 1000)} / ~${TRUCK.tons} ton`} />}
          <Meter label="Hacim" frac={fill.m3} text={`${fmt(t.m3)} / ~${TRUCK.m3} m³`} />
          <p className="mt-3 text-[11px] leading-relaxed text-[#8da0b2]">
            Yaklaşık değerlerdir: 13,60 m tır ≈ 33 euro palet, ≈ 24 ton, ≈ 90 m³. Desi = en × boy × yükseklik ÷ 3000. Gerçek kapasite araca ve yük tipine göre değişir.
          </p>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-[#627d98]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
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

function Meter({ label, frac, text }: { label: string; frac: number; text: string }) {
  const over = frac > 1
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-[#122c4a]">{label}</span>
        <span className={cn("tabular-nums", over ? "font-bold text-red-600" : "text-[#627d98]")}>{over ? "Tıra sığmaz · " : ""}{text}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]">
        <div className={cn("h-full rounded-full", over ? "bg-red-500" : frac > 0.85 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, frac * 100)}%` }} />
      </div>
    </div>
  )
}
