"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Copy, Minus, Plus, RotateCcw, Share2, SlidersHorizontal, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { cn } from "@/lib/utils"

type Form = {
  vehicle: string
  km: string
  emptyReturn: boolean
  returnKm: string
  fuelPrice: string
  consumption: string
  tolls: string
  driver: string
  extra: string
  maintPerKm: string
  margin: string
  tons: string
  vat: boolean
  offer: string
}

const DEFAULTS: Form = {
  vehicle: "Kapalı Dorse",
  km: "500",
  emptyReturn: false,
  returnKm: "",
  fuelPrice: "42",
  consumption: "32",
  tolls: "0",
  driver: "0",
  extra: "2000",
  maintPerKm: "0",
  margin: "35",
  tons: "",
  vat: false,
  offer: "",
}

const STORAGE_KEY = "calc_v3"

// Ortalama yakıt tüketimi (lt / 100 km): sadece başlangıç önerisi, ayarlardan değiştirilebilir
const VEHICLES: { label: string; kind: VehicleKind; lt: string }[] = [
  { label: "Kapalı Dorse", kind: "tir", lt: "32" },
  { label: "Açık Dorse", kind: "acikdorse", lt: "32" },
  { label: "Kırkayak", kind: "kirkayak", lt: "30" },
  { label: "Kamyon", kind: "kamyon", lt: "24" },
  { label: "Damperli", kind: "damperli", lt: "36" },
  { label: "Frigo", kind: "frigo", lt: "34" },
]
const KM_PRESETS = [250, 500, 750, 1000, 1500]
const MARGIN_PRESETS = [10, 20, 30, 35, 50]
const COST_COLORS = { fuel: "#d64526", tolls: "#2f6fb0", driver: "#1f9d7a", maint: "#8a6bd1", extra: "#94a3b8" }

/** "42,5" ve "42.5" ikisini de kabul eder; "1.500" -> 1500, "1.500,50" -> 1500.5 */
const num = (v: string) => {
  let s = String(v).trim().replace(/\s/g, "")
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "")
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

const fmt = (digits: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: digits, maximumFractionDigits: digits })
const money = (v: number) => fmt(2).format(v)
const moneyR = (v: number) => fmt(0).format(Math.round(v))
const plain = (v: number, d = 2) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

export function CalculatorView() {
  const [f, setF] = useState<Form>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fuelLive, setFuelLive] = useState<{ price: number; date: string } | null>(null)

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((p) => ({ ...p, [key]: value }))

  // Önceki ayarlar bu cihazda hatırlanır
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setF({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch {
      // bozuk kayıt varsa varsayılanlarla devam
    }
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)) } catch { /* depolama kapalı */ }
  }, [f, ready])

  // Güncel mazot fiyatı (app_settings tablosu; yoksa sessizce elle giriş kalır)
  useEffect(() => {
    if (!supabase) return
    supabase.from("app_settings").select("value,updated_at").eq("key", "fuel_diesel").maybeSingle().then(({ data }) => {
      const v = data ? num(String(data.value)) : 0
      if (v > 0) setFuelLive({ price: v, date: String(data.updated_at || "").slice(0, 10) })
    })
  }, [])

  const c = useMemo(() => {
    const loadedKm = num(f.km)
    const returnKm = f.emptyReturn ? (f.returnKm.trim() ? num(f.returnKm) : loadedKm) : 0
    const totalKm = loadedKm + returnKm
    const fuelCost = (totalKm / 100) * num(f.consumption) * num(f.fuelPrice)
    const tolls = num(f.tolls)
    const driver = num(f.driver)
    const extra = num(f.extra)
    const maint = totalKm * num(f.maintPerKm)
    const totalCost = fuelCost + tolls + driver + extra + maint
    const margin = num(f.margin)
    const profit = totalCost * (margin / 100)
    const price = totalCost + profit
    const finalPrice = f.vat ? price * 1.2 : price
    const tons = num(f.tons)
    const offer = num(f.offer)
    const parts = [
      { key: "fuel", label: "Yakıt", value: fuelCost, color: COST_COLORS.fuel },
      { key: "tolls", label: "Otoyol / Köprü", value: tolls, color: COST_COLORS.tolls },
      { key: "driver", label: "Şoför", value: driver, color: COST_COLORS.driver },
      { key: "maint", label: "Bakım · Lastik", value: maint, color: COST_COLORS.maint },
      { key: "extra", label: "Ek masraf", value: extra, color: COST_COLORS.extra },
    ].filter((p) => p.value > 0)
    return {
      loadedKm, totalKm, totalCost, margin, profit, price, finalPrice, tons, offer, parts,
      pricePerKm: loadedKm > 0 ? price / loadedKm : 0,
      perTon: tons > 0 ? price / tons : 0,
      floorPrice: totalCost * 1.1, // pazarlıkta inilebilecek en alt (%10 kâr)
      openPrice: price * 1.1, // ilk söylenecek fiyat (pazarlığa yer bırakır)
    }
  }, [f])

  const verdict = useMemo(() => {
    if (c.offer <= 0 || c.totalCost <= 0) return null
    const diff = c.offer - c.totalCost
    if (c.offer < c.totalCost) return { tone: "red" as const, title: "Zararına", text: `Bu fiyata masrafı bile karşılanmıyor (${moneyR(-diff)} zarar).` }
    if (c.offer < c.price) return { tone: "amber" as const, title: "Hedefin altında", text: `+${moneyR(diff)} kalır ama hedef kâr için ${moneyR(c.price - c.offer)} eksik. Karşı teklif: ${moneyR(c.price)}.` }
    return { tone: "green" as const, title: "Kârlı", text: `Hedef kârı karşılıyor, +${moneyR(diff)} kalır.` }
  }, [c])

  const handleShare = async () => {
    const text = [
      `🚛 Navlun teklifi: ${moneyR(c.finalPrice)}${f.vat ? " (KDV dahil)" : ""}`,
      `Mesafe: ${plain(c.loadedKm, 0)} km${c.tons > 0 ? ` • Yük: ${plain(c.tons, 1)} ton` : ""}`,
      c.perTon > 0 ? `Ton başı: ${moneyR(c.perTon)}` : "",
      "— Nakliye Cepte",
    ].filter(Boolean).join("\n")
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text })
        return
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // paylaşım iptal edildi
    }
  }

  const reset = () => setF({ ...DEFAULTS, fuelPrice: fuelLive ? String(fuelLive.price).replace(".", ",") : DEFAULTS.fuelPrice })

  const toneCls = {
    red: "border-red-500/30 bg-red-500/10 text-red-500",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">Sefer Hesapla</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Mesafeyi gir, navlunu ve kârını anında gör.</p>
        </div>
        <button type="button" onClick={reset} aria-label="Sıfırla" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground active:scale-95">
          <RotateCcw className="size-3.5" /> Sıfırla
        </button>
      </div>

      {/* 1) Mesafe + araç */}
      <section className="space-y-3.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none">
        <div>
          <label htmlFor="calc-km" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Yüklü mesafe</label>
          <div className="relative">
            <input
              id="calc-km"
              inputMode="decimal"
              value={f.km}
              onChange={(e) => set("km", e.target.value)}
              placeholder="0"
              className="h-16 w-full rounded-xl border border-input bg-muted/50 pl-4 pr-14 text-3xl font-extrabold tabular-nums text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-ring/10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">km</span>
          </div>
          <div className="no-scrollbar -mx-3.5 mt-2 flex gap-2 overflow-x-auto px-3.5">
            {KM_PRESETS.map((k) => (
              <button key={k} type="button" onClick={() => set("km", String(k))} aria-pressed={num(f.km) === k}
                className={cn("h-9 shrink-0 rounded-full border px-3.5 text-[12.5px] font-semibold tabular-nums active:scale-95", num(f.km) === k ? "border-brand bg-brand/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
                {k} km
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Araç</div>
          <div className="no-scrollbar -mx-3.5 flex gap-2 overflow-x-auto px-3.5">
            {VEHICLES.map((v) => {
              const active = f.vehicle === v.label
              return (
                <button key={v.label} type="button" aria-pressed={active} onClick={() => setF((p) => ({ ...p, vehicle: v.label, consumption: v.lt }))}
                  className={cn("flex h-10 shrink-0 items-center gap-1.5 rounded-full border pl-2 pr-3.5 text-[12.5px] font-semibold active:scale-95", active ? "border-brand bg-brand/10 text-foreground" : "border-border bg-card text-muted-foreground")}>
                  <span className="flex h-6 w-10 items-center justify-center"><VehicleIcon kind={v.kind} className="h-full w-full" /></span>
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Toggle on={f.emptyReturn} onChange={(v) => set("emptyReturn", v)} label="Boş dönüş" />
          <Toggle on={f.vat} onChange={(v) => set("vat", v)} label="KDV +%20" />
        </div>
        {f.emptyReturn && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <label htmlFor="calc-rkm" className="shrink-0 text-xs font-semibold text-foreground/80">Dönüş km</label>
            <input id="calc-rkm" inputMode="decimal" value={f.returnKm} onChange={(e) => set("returnKm", e.target.value)} placeholder={String(c.loadedKm || 0)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base tabular-nums outline-none focus:border-primary" />
          </div>
        )}
      </section>

      {/* 2) Sonuç */}
      <section aria-live="polite" className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#122c4a] to-[#1d4b78] p-4 text-white shadow-md">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Önerilen navlun{f.vat ? " · KDV dahil" : ""}</p>
        <p className="mt-0.5 text-4xl font-extrabold tabular-nums tracking-tight">{moneyR(c.finalPrice)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Tile label="Masraf" value={moneyR(c.totalCost)} />
          <Tile label={`Kâr %${plain(c.margin, 0)}`} value={moneyR(c.profit)} />
          <Tile label="KM başı" value={money(c.pricePerKm)} />
        </div>
        {c.perTon > 0 && <p className="mt-2.5 text-center text-xs font-semibold text-white/80">Ton başı {moneyR(c.perTon)}</p>}

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-center">
          <div>
            <p className="text-[10px] text-white/55">İlk söyleyeceğin</p>
            <p className="text-sm font-bold tabular-nums">{moneyR(c.openPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/55">İnebileceğin en alt</p>
            <p className="text-sm font-bold tabular-nums">{moneyR(c.floorPrice)}</p>
          </div>
        </div>

        <button type="button" onClick={handleShare} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/15 text-sm font-semibold active:bg-white/25">
          {copied ? <><Check className="size-4" /> Kopyalandı</> : typeof navigator !== "undefined" && typeof navigator.share === "function" ? <><Share2 className="size-4" /> Teklifi paylaş</> : <><Copy className="size-4" /> Teklifi kopyala</>}
        </button>
      </section>

      {/* 3) Gelen teklif */}
      <section className="rounded-2xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none">
        <label htmlFor="calc-offer" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Gelen teklifi değerlendir</label>
        <div className="relative">
          <input id="calc-offer" inputMode="decimal" value={f.offer} onChange={(e) => set("offer", e.target.value)} placeholder="Karşı tarafın teklifi (₺)"
            className="h-12 w-full rounded-xl border border-input bg-muted/50 px-3.5 pr-11 text-base font-semibold tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-ring/10" />
          {f.offer && (
            <button type="button" aria-label="Temizle" onClick={() => set("offer", "")} className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground active:bg-muted">
              <X className="size-4" />
            </button>
          )}
        </div>
        {verdict && (
          <div role="status" className={cn("mt-2.5 rounded-xl border px-3.5 py-3", toneCls[verdict.tone])}>
            <p className="text-sm font-extrabold">{verdict.title}</p>
            <p className="mt-0.5 text-xs font-medium leading-relaxed">{verdict.text}</p>
          </div>
        )}
      </section>

      {/* 4) Masraf dökümü */}
      {c.totalCost > 0 && (
        <section className="rounded-2xl border border-border bg-card p-3.5 shadow-sm dark:shadow-none">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Masraf dökümü</h2>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{plain(c.totalKm, 0)} km</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            {c.parts.map((p) => <div key={p.key} style={{ width: `${(p.value / c.totalCost) * 100}%`, background: p.color }} />)}
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {c.parts.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-1.5 text-foreground/80"><i className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />{p.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{moneyR(p.value)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5) Masraf ayarları (kapalı gelir) */}
      <section className="rounded-2xl border border-border bg-card shadow-sm dark:shadow-none">
        <button type="button" onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen} className="flex w-full items-center gap-3 p-3.5 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground/80"><SlidersHorizontal className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Masraf ayarları</span>
            <span className="block truncate text-xs text-muted-foreground">Mazot {plain(num(f.fuelPrice), 1)} ₺ · {f.consumption} lt/100 km · Kâr %{plain(num(f.margin), 0)}</span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", settingsOpen && "rotate-180")} />
        </button>

        {settingsOpen && (
          <div className="space-y-3.5 border-t border-border p-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Mazot (₺ / lt)" value={f.fuelPrice} onChange={(v) => set("fuelPrice", v)} step={0.5} />
              <Stepper label="Tüketim (lt / 100 km)" value={f.consumption} onChange={(v) => set("consumption", v)} step={1} />
            </div>
            {fuelLive && num(f.fuelPrice) !== fuelLive.price && (
              <button type="button" onClick={() => set("fuelPrice", String(fuelLive.price).replace(".", ","))} className="text-xs font-semibold text-brand active:opacity-70">
                Güncel mazot {plain(fuelLive.price, 2)} ₺{fuelLive.date ? ` (${fuelLive.date})` : ""} · Uygula
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Otoyol / Köprü (₺)" value={f.tolls} onChange={(v) => set("tolls", v)} step={100} />
              <Stepper label="Şoför / Harcırah (₺)" value={f.driver} onChange={(v) => set("driver", v)} step={250} />
              <Stepper label="Ek masraf (₺)" value={f.extra} onChange={(v) => set("extra", v)} step={250} />
              <Stepper label="Bakım (₺ / km)" value={f.maintPerKm} onChange={(v) => set("maintPerKm", v)} step={0.5} />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-foreground/80">Hedef kâr</span>
                <span className="text-sm font-extrabold tabular-nums text-foreground">%{plain(num(f.margin), 0)}</span>
              </div>
              <input type="range" min={0} max={80} step={1} value={Math.min(80, num(f.margin))} onChange={(e) => set("margin", e.target.value)} aria-label="Hedef kâr oranı" className="h-2 w-full accent-[#e5522f]" />
              <div className="mt-2 flex gap-2">
                {MARGIN_PRESETS.map((m) => (
                  <button key={m} type="button" onClick={() => set("margin", String(m))} aria-pressed={num(f.margin) === m}
                    className={cn("h-9 flex-1 rounded-full border text-[12.5px] font-semibold tabular-nums active:scale-95", num(f.margin) === m ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground")}>
                    %{m}
                  </button>
                ))}
              </div>
            </div>

            <Stepper label="Yük tonajı (ton başı fiyat için, ops.)" value={f.tons} onChange={(v) => set("tons", v)} step={1} placeholder="Ton" />
          </div>
        )}
      </section>

      <p className="px-1 pb-2 text-center text-[11px] leading-relaxed text-muted-foreground">Hesap tahminidir; gerçek yakıt tüketimi, yol ve yük durumuna göre değişir.</p>
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={cn("flex h-12 items-center justify-between gap-2 rounded-xl border px-3.5 text-sm font-semibold active:scale-[0.98]", on ? "border-brand bg-brand/10 text-foreground" : "border-border bg-muted/50 text-muted-foreground")}>
      {label}
      <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-border")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
    </button>
  )
}

function Stepper({ label, value, onChange, step, placeholder }: { label: string; value: string; onChange: (v: string) => void; step: number; placeholder?: string }) {
  const bump = (dir: 1 | -1) => {
    const next = Math.max(0, Math.round((num(value) + dir * step) * 100) / 100)
    onChange(String(next).replace(".", ","))
  }
  return (
    <div className="min-w-0">
      <span className="mb-1 block truncate text-xs font-semibold text-foreground/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Azalt" onClick={() => bump(-1)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/50 text-foreground/80 active:scale-90">
          <Minus className="size-4" />
        </button>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "0"}
          className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-muted/50 px-1 text-center text-base font-semibold tabular-nums outline-none focus:border-primary focus:ring-4 focus:ring-ring/10" />
        <button type="button" aria-label="Artır" onClick={() => bump(1)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted/50 text-foreground/80 active:scale-90">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-2 py-2">
      <p className="truncate text-[10px] text-white/60">{label}</p>
      <p className="truncate text-sm font-bold tabular-nums">{value}</p>
    </div>
  )
}
