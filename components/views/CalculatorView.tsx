"use client"

import { useMemo, useState } from "react"
import { ArrowDownUp, Fuel, Gauge, MapPin, Navigation, RefreshCw, Route, Wallet } from "lucide-react"
import { CITY_LIST, getRouteDiag, placeKm } from "@/lib/distance"
import { useFuelPrice, agoLabel, getFuelDiag, provinceCode } from "@/lib/fuel"
import { cn } from "@/lib/utils"

const num = (value: string, fallback = 0) => {
  const parsed = Number(String(value).trim().replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
const tr = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 })
const tr1 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 })
const try0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })
const try2 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 })

// "kayseri" / "KAYSERİ" yazılsa da listedeki doğru yazımı bulur (yakıt fiyatı il koduyla eşleşsin diye)
const canon = (value: string) => {
  const v = value.trim().toLocaleLowerCase("tr-TR")
  return CITY_LIST.find((c) => c.toLocaleLowerCase("tr-TR") === v) ?? value.trim()
}

const PRESETS = ["28", "32", "35", "40"]

export function CalculatorView() {
  const [fromCity, setFromCity] = useState("Kayseri")
  const [fromDistrict, setFromDistrict] = useState("")
  const [toCity, setToCity] = useState("Bitlis")
  const [toDistrict, setToDistrict] = useState("Ahlat")
  const [consumption, setConsumption] = useState("32")
  const [km, setKm] = useState<number | null>(null)
  const [approx, setApprox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [label, setLabel] = useState("")
  const [diagText, setDiagText] = useState("")

  const fuel = useFuelPrice(canon(fromCity))
  const unit = fuel.price ?? fuel.lastPrice // taze yoksa son bilinen fiyat (etiketle gösterilir)
  const stale = fuel.price === null && fuel.lastPrice !== null
  const litres = useMemo(() => (km ? (km / 100) * num(consumption, 32) : null), [km, consumption])
  const cost = litres !== null && unit ? litres * unit : null

  const calculate = async () => {
    const a = canon(fromCity), b = canon(toCity)
    if (!a || !b) { setError("Çıkış ve varış ilini yazın."); return }
    if (a === b && !fromDistrict.trim() && !toDistrict.trim()) { setError("Çıkış ve varış aynı görünüyor."); return }
    setLoading(true); setError(""); setKm(null); setApprox(false)
    try {
      const r = await placeKm(a, fromDistrict.trim() || undefined, b, toDistrict.trim() || undefined)
      setDiagText(r && !r.approx ? "" : getRouteDiag())
      if (!r) setError("Yol mesafesi alınamadı. İl/ilçe adını kontrol edin ya da bağlantınızı kontrol edip tekrar deneyin.")
      else {
        setKm(r.km); setApprox(Boolean(r.approx))
        setFromCity(a); setToCity(b)
        setLabel(`${a}${fromDistrict.trim() ? ` / ${fromDistrict.trim()}` : ""} → ${b}${toDistrict.trim() ? ` / ${toDistrict.trim()}` : ""}`)
      }
    } catch {
      setError("Mesafe servisine şu anda ulaşılamıyor. Biraz sonra tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }

  const swap = () => {
    setFromCity(toCity); setToCity(fromCity)
    setFromDistrict(toDistrict); setToDistrict(fromDistrict)
    setKm(null); setError("")
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-4">
      <datalist id="calc-cities">{CITY_LIST.map((c) => <option key={c} value={c} />)}</datalist>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-brand">Yol & yakıt</p>
        <h1 className="mt-1 text-[26px] font-black tracking-tight text-foreground sm:text-3xl">Sefer Hesapla</h1>
      </header>

      {/* Sonuç: en üstte, tek bakışta */}
      <section aria-live="polite" className="overflow-hidden rounded-[28px] bg-navy-gradient p-5 text-white shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70"><Wallet className="size-4" /> Ortalama masraf</span>
          {loading && <RefreshCw className="size-4 animate-spin text-white/70" />}
        </div>
        <p className="mt-2 text-[44px] font-black leading-none tracking-tight tabular-nums sm:text-5xl">{cost !== null ? try0.format(cost) : "—"}</p>
        <p className="mt-2 min-h-4 truncate text-xs font-medium text-white/60">{km ? label : "Güzergâhı seçip Hesapla'ya basın"}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat icon={<Route className="size-4" />} label="Mesafe" value={km ? `${approx ? "≈ " : ""}${tr.format(km)} km` : "—"} />
          <Stat icon={<Fuel className="size-4" />} label="Yakıt" value={litres !== null ? `${tr1.format(litres)} L` : "—"} />
        </div>
      </section>

      {/* Canlı yakıt durumu */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
        <span className="inline-flex min-w-0 items-center gap-2.5 text-xs">
          <span className={cn("size-2.5 shrink-0 rounded-full", fuel.live ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.18)]" : fuel.loading ? "animate-pulse bg-amber-400" : "bg-amber-500")} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-foreground">
              {unit ? `Motorin ${try2.format(unit)} / L` : fuel.loading ? "Motorin fiyatı alınıyor…" : "Motorin fiyatı alınamadı"}
            </span>
            <span className="block truncate text-muted-foreground">
              {!unit && !fuel.loading && getFuelDiag(provinceCode(canon(fromCity))) ? `Neden: ${getFuelDiag(provinceCode(canon(fromCity)))}` : fuel.live ? `Opet · ${canon(fromCity)} · ${agoLabel(fuel.updatedAt)}` : stale ? `Güncel değil · son bilinen: ${agoLabel(fuel.lastUpdatedAt)}` : "Çıkış ilinin canlı fiyatı gerekli"}
            </span>
          </span>
        </span>
      </div>

      {/* Güzergâh */}
      <section className="rounded-[28px] border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="relative space-y-3">
          <Place title="Nereden" tone="from" city={fromCity} district={fromDistrict} onCity={setFromCity} onDistrict={setFromDistrict} />
          <button type="button" onClick={swap} aria-label="Yerleri değiştir" className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition active:scale-90">
            <ArrowDownUp className="size-4" />
          </button>
          <Place title="Nereye" tone="to" city={toCity} district={toDistrict} onCity={setToCity} onDistrict={setToDistrict} />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Gauge className="size-4" /> Tüketim (L / 100 km)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setConsumption(p)} className={cn("h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-95", consumption === p ? "bg-brand text-white shadow-sm" : "bg-muted text-foreground/80")}>{p}</button>
              ))}
            </div>
            <input value={consumption} onChange={(e) => setConsumption(e.target.value)} inputMode="decimal" aria-label="Tüketim" className="h-11 w-20 rounded-xl border border-input bg-muted/40 px-3 text-center text-base font-bold text-foreground outline-none focus:border-brand" />
          </div>
        </div>

        {!error && approx && <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">Canlı yol servisine ulaşılamadı; mesafe yaklaşık (≈) hesaplandı. Gerçek rota biraz farklı olabilir.</p>}

        {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-600">{error}{diagText && <span className="mt-1 block text-[10px] font-normal opacity-80">Neden: {diagText}</span>}</p>}

        <button type="button" onClick={calculate} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-[#d64526]/25 transition active:scale-[.98] disabled:opacity-60">
          {loading ? <RefreshCw className="size-5 animate-spin" /> : <Navigation className="size-5" />}
          {loading ? "Hesaplanıyor…" : "Hesapla"}
        </button>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        Mesafe OpenStreetMap yol ağından (ulaşılamazsa yaklaşık), motorin fiyatı Opet'ten (çıkış ili) alınır. Masraf yalnızca yakıttır; otoyol, köprü ve diğer giderler dahil değildir.
      </p>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/65">{icon}{label}</span>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  )
}

function Place({ title, tone, city, district, onCity, onDistrict }: { title: string; tone: "from" | "to"; city: string; district: string; onCity: (v: string) => void; onDistrict: (v: string) => void }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 pr-14">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <MapPin className={cn("size-4", tone === "from" ? "text-emerald-600" : "text-brand")} /> {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input list="calc-cities" aria-label={`${title} il`} value={city} onChange={(e) => onCity(e.target.value)} placeholder="İl" autoComplete="off" className="h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-bold text-foreground outline-none focus:border-brand" />
        <input aria-label={`${title} ilçe`} value={district} onChange={(e) => onDistrict(e.target.value)} placeholder="İlçe (ops.)" autoComplete="off" className="h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-brand" />
      </div>
    </div>
  )
}
