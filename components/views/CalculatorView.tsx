"use client"

import { useMemo, useState } from "react"
import { ArrowLeftRight, Fuel, MapPin, Navigation, RefreshCw, Route, Truck } from "lucide-react"
import { placeKm } from "@/lib/distance"
import { useFuelPrice, agoLabel } from "@/lib/fuel"
import { cn } from "@/lib/utils"

const number = (value: string, fallback = 0) => {
  const parsed = Number(String(value).trim().replace(",", "."))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}
const kmText = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)
const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value)

export function CalculatorView() {
  const [fromCity, setFromCity] = useState("Kayseri")
  const [fromDistrict, setFromDistrict] = useState("")
  const [toCity, setToCity] = useState("Bitlis")
  const [toDistrict, setToDistrict] = useState("Ahlat")
  const [consumption, setConsumption] = useState("32")
  const [route, setRoute] = useState<{ km: number; hours: number } | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState("")
  const [lastRoute, setLastRoute] = useState("")

  const fuel = useFuelPrice(fromCity.trim())
  const litres = useMemo(() => route ? (route.km / 100) * number(consumption, 32) : 0, [route, consumption])
  const fuelCost = fuel.price && route ? litres * fuel.price : null

  const calculate = async () => {
    if (!fromCity.trim() || !toCity.trim()) {
      setRouteError("Çıkış ve varış ilini girin.")
      return
    }
    setRouteLoading(true)
    setRouteError("")
    setRoute(null)
    try {
      const result = await placeKm(fromCity.trim(), fromDistrict.trim() || undefined, toCity.trim(), toDistrict.trim() || undefined)
      if (!result) {
        setRouteError("Bu güzergâhın yol mesafesi alınamadı. İl ve ilçe adlarını kontrol edip tekrar deneyin.")
      } else {
        setRoute(result)
        setLastRoute(`${fromCity}${fromDistrict ? ` / ${fromDistrict}` : ""} → ${toCity}${toDistrict ? ` / ${toDistrict}` : ""}`)
      }
    } catch {
      setRouteError("Mesafe servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.")
    } finally {
      setRouteLoading(false)
    }
  }

  const swap = () => {
    setFromCity(toCity); setToCity(fromCity)
    setFromDistrict(toDistrict); setToDistrict(fromDistrict)
    setRoute(null); setRouteError("")
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-brand">Yol & yakıt</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Sefer Hesapla</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerçek yol mesafesi ve güncel motorin fiyatı.</p>
        </div>
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Route className="size-6" />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Güzergâh</h2>
          <button type="button" onClick={swap} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground active:scale-95">
            <ArrowLeftRight className="size-3.5" /> Yer değiştir
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <PlaceFields title="Nereden" city={fromCity} district={fromDistrict} onCity={setFromCity} onDistrict={setFromDistrict} icon="from" />
          <div className="hidden h-10 items-center justify-center text-muted-foreground sm:flex"><ArrowLeftRight className="size-4" /></div>
          <PlaceFields title="Nereye" city={toCity} district={toDistrict} onCity={setToCity} onDistrict={setToDistrict} icon="to" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Ortalama tüketim (L / 100 km)</span>
            <div className="relative">
              <input value={consumption} onChange={(e) => setConsumption(e.target.value)} inputMode="decimal" className="h-12 w-full rounded-xl border border-input bg-muted/40 px-3.5 pr-12 text-base font-bold text-foreground outline-none focus:border-brand" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">L / 100</span>
            </div>
          </label>
          <button type="button" onClick={calculate} disabled={routeLoading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition active:scale-[.98] disabled:opacity-60">
            {routeLoading ? <RefreshCw className="size-4 animate-spin" /> : <Navigation className="size-4" />}
            {routeLoading ? "Hesaplanıyor" : "Hesapla"}
          </button>
        </div>
        {routeError && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-600">{routeError}</p>}
      </section>

      <section aria-live="polite" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResultCard icon={<Route className="size-5" />} label="Mesafe" value={route ? `${kmText(route.km)} km` : "—"} detail={route ? "Karayolu güzergâhı" : "Güzergâhı hesaplayın"} />
        <ResultCard icon={<Fuel className="size-5" />} label="Yakıt" value={route ? `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(litres)} L` : "—"} detail={fuel.price ? `${money(fuel.price)} / litre` : fuel.loading ? "Motorin fiyatı alınıyor…" : "Canlı fiyat alınamadı"} />
        <ResultCard icon={<Truck className="size-5" />} label="Ortalama Masraf" value={fuelCost !== null ? money(fuelCost) : "—"} detail={fuelCost !== null ? "Yakıt maliyeti" : "Canlı fiyat ve mesafe gerekli"} accent />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card/70 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className={cn("size-2 rounded-full", fuel.live ? "bg-emerald-500" : "bg-amber-500")} />
          {fuel.live ? `Opet motorin · ${agoLabel(fuel.updatedAt)}` : fuel.loading ? "Motorin fiyatı kontrol ediliyor" : "Motorin fiyatı güncel değil"}
        </span>
        {lastRoute && <span className="max-w-full truncate">{lastRoute}</span>}
      </div>
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">Masraf, seçilen tüketim ve çıkış ilinin güncel motorin fiyatıyla hesaplanır. Otoyol, köprü ve diğer giderler dahil değildir.</p>
    </div>
  )
}

function PlaceFields({ title, city, district, onCity, onDistrict, icon }: { title: string; city: string; district: string; onCity: (v: string) => void; onDistrict: (v: string) => void; icon: "from" | "to" }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/45 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <MapPin className={cn("size-4", icon === "from" ? "text-emerald-600" : "text-brand")} /> {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input aria-label={`${title} il`} value={city} onChange={(e) => onCity(e.target.value)} placeholder="İl" className="h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-brand" />
        <input aria-label={`${title} ilçe`} value={district} onChange={(e) => onDistrict(e.target.value)} placeholder="İlçe (isteğe bağlı)" className="h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-brand" />
      </div>
    </div>
  )
}

function ResultCard({ icon, label, value, detail, accent = false }: { icon: React.ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", accent ? "border-brand/25 bg-brand/5" : "border-border bg-card")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground">{label}</span>
        <span className={cn("grid size-9 place-items-center rounded-xl", accent ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground")}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{detail}</p>
    </div>
  )
}
