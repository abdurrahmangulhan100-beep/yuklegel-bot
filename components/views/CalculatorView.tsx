"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Bookmark, Check, ChevronDown, Copy, Fuel, MessageCircle, Minus, Plus, RotateCcw, Wallet, Receipt, Scale, Share2, TrendingUp, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { cn } from "@/lib/utils"

type Form = {
  from: string
  to: string
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
  from: "",
  to: "",
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
const SAVED_KEY = "calc_saved_v1"

// Ortalama yakıt tüketimi (LT / 100 KM): sadece başlangıç önerisi, her zaman değiştirilebilir
const VEHICLES: { label: string; kind: VehicleKind; lt: string }[] = [
  { label: "Kapalı Dorse", kind: "tir", lt: "32" },
  { label: "13.60 Açık Dorse", kind: "acikdorse", lt: "32" },
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

type Saved = { id: string; label: string; form: Form }

export function CalculatorView() {
  const [f, setF] = useState<Form>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [saved, setSaved] = useState<Saved[]>([])
  const resultRef = useRef<HTMLDivElement | null>(null)
  const [fuelLive, setFuelLive] = useState<{ price: number; date: string } | null>(null)

  // Güncel mazot fiyatı (Supabase app_settings tablosu; yoksa sessizce elle giriş kalır)
  useEffect(() => {
    if (!supabase) return
    supabase.from("app_settings").select("value,updated_at").eq("key", "fuel_diesel").maybeSingle().then(({ data }) => {
      const v = data ? num(String(data.value)) : 0
      if (v > 0) setFuelLive({ price: v, date: String(data.updated_at || "").slice(0, 10) })
    })
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Form
        setF(parsed)
        if (num(parsed.tolls) > 0 || num(parsed.driver) > 0 || num(parsed.maintPerKm) > 0) setMoreOpen(true)
      }
      const s = localStorage.getItem(SAVED_KEY)
      if (s) setSaved(JSON.parse(s))
    } catch {
      // bozuk kayıt varsa varsayılanlarla devam
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
    } catch {
      // depolama kapalıysa sessizce geç
    }
  }, [f, saved, ready])

  const toFinance = (kind: "income" | "expense") => {
    const route = "Sefer"
    const amount = kind === "income" ? (c.offer > 0 ? c.offer : c.finalPrice) : c.totalCost
    const payload = {
      type: kind,
      category: kind === "income" ? "Navlun Bedeli" : "Sefer Masrafı",
      amount: Math.round(amount),
      description: `${route} · ${plain(c.loadedKm, 0)} km`,
    }
    try { localStorage.setItem("fin_prefill", JSON.stringify(payload)) } catch { /* depolama kapalı */ }
    window.dispatchEvent(new CustomEvent("nc:tab", { detail: "Gelir Gider" }))
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((p) => ({ ...p, [key]: value }))

  const c = useMemo(() => {
    const loadedKm = num(f.km)
    const returnKm = f.emptyReturn ? (f.returnKm.trim() ? num(f.returnKm) : loadedKm) : 0
    const totalKm = loadedKm + returnKm
    const liters = (totalKm / 100) * num(f.consumption)
    const fuelCost = liters * num(f.fuelPrice)
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
    const offerProfit = offer - totalCost
    const parts = [
      { key: "fuel", label: "Yakıt", value: fuelCost, color: COST_COLORS.fuel },
      { key: "tolls", label: "Otoyol / Köprü", value: tolls, color: COST_COLORS.tolls },
      { key: "driver", label: "Şoför", value: driver, color: COST_COLORS.driver },
      { key: "maint", label: "Bakım · Lastik", value: maint, color: COST_COLORS.maint },
      { key: "extra", label: "Ek masraf", value: extra, color: COST_COLORS.extra },
    ].filter((p) => p.value > 0)
    return {
      loadedKm, returnKm, totalKm, liters, fuelCost, totalCost, margin, profit, price, finalPrice, tons, offer, offerProfit, parts,
      costPerKm: loadedKm > 0 ? totalCost / loadedKm : 0,
      pricePerKm: loadedKm > 0 ? price / loadedKm : 0,
      perTon: tons > 0 ? price / tons : 0,
      floorPrice: totalCost * 1.1, // pazarlıkta inilebilecek en alt (%10 kâr)
      openPrice: price * 1.1, // ilk söylenecek fiyat (pazarlığa yer bırakır)
      offerMargin: totalCost > 0 ? (offerProfit / totalCost) * 100 : 0,
    }
  }, [f])

  const verdict = useMemo(() => {
    if (c.offer <= 0) return null
    if (c.offer < c.totalCost) return { tone: "red" as const, title: "Zararına", text: `Bu fiyata giderlerini bile karşılayamazsın (${moneyR(c.totalCost - c.offer)} zarar).` }
    if (c.offer < c.price) return { tone: "amber" as const, title: "Hedefin altında", text: `Kâr ediyorsun ama hedefin ${moneyR(c.price - c.offer)} daha yüksek. Karşı teklif: ${moneyR(c.price)}.` }
    return { tone: "green" as const, title: "Kârlı", text: `Hedef kârını karşılıyor (+${moneyR(c.offerProfit)} kazanç).` }
  }, [c])

  const shareText = () =>
    [
      `🚛 Navlun teklifi: ${moneyR(c.finalPrice)}${f.vat ? " (KDV dahil)" : ""}`,
      `Mesafe: ${plain(c.loadedKm, 0)} km${c.tons > 0 ? ` • Yük: ${plain(c.tons, 1)} ton` : ""}`,
      c.perTon > 0 ? `Ton başı: ${moneyR(c.perTon)}` : "",
      "— Nakliye Cepte",
    ].filter(Boolean).join("\n")

  const handleShare = async () => {
    const text = shareText()
    try {
      if (typeof navigator.share === "function") { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // paylaşım iptal edildi
    }
  }

  const saveCurrent = () => {
    const item: Saved = { id: String(Date.now()), label: `${plain(c.loadedKm, 0)} km · ${moneyR(c.finalPrice)}`, form: f }
    setSaved((s) => [item, ...s].slice(0, 6))
  }

  const other = c.parts.filter((p) => p.key !== "fuel").reduce((a, p) => a + p.value, 0)

  return (
    <div className="space-y-5 pb-4">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Maliyet & Teklif Planlama</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#122c4a] sm:text-3xl">Sefer Hesapla & Navlun Analizi</h1>
        <p className="mt-1 text-xs text-[#718397]">Km'yi yaz, ne kadara taşıman gerektiğini gör; gelen teklif kârlı mı hemen anla. Değerler cihazında saklanır.</p>
      </div>

      {saved.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]"><Bookmark className="size-3" /> Kayıtlı</span>
          {saved.map((s) => (
            <span key={s.id} className="flex shrink-0 items-center overflow-hidden rounded-full border border-[#e0e6ed] bg-white text-xs font-semibold text-[#334e68]">
              <button type="button" onClick={() => { setF({ ...DEFAULTS, ...s.form }); resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }} className="px-3 py-1.5 hover:bg-[#f0f4f8]">{s.label}</button>
              <button type="button" aria-label="Sil" onClick={() => setSaved((a) => a.filter((x) => x.id !== s.id))} className="border-l border-[#eef2f6] px-2 py-1.5 text-[#8da0b2] hover:bg-[#fdecea] hover:text-[#d64526]"><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-12">
        {/* ============ GİRDİLER ============ */}
        <div className="space-y-4 lg:col-span-7">
          {/* 1. Mesafe & Araç */}
          <Step n={1} title="Mesafe & Araç" icon={<Scale className="size-4" />}>
            <Label2>Kaç km yüklü gideceksin?</Label2>
            <div className="relative">
              <Input inputMode="decimal" value={f.km} onChange={(e) => set("km", e.target.value)} placeholder="0" className="h-14 border-[#d9e2ec] bg-[#f8fafc] pr-12 text-2xl font-black text-[#122c4a] focus:bg-white" />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8da0b2]">km</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {KM_PRESETS.map((k) => <Pill key={k} active={num(f.km) === k} onClick={() => set("km", String(k))}>{plain(k, 0)} km</Pill>)}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e4e9ef] bg-[#fafbfd] px-3.5 py-3">
              <input type="checkbox" checked={f.emptyReturn} onChange={(e) => set("emptyReturn", e.target.checked)} className="size-5 accent-[#d64526]" />
              <span className="text-sm font-bold text-[#122c4a]">Boş dönüyorum <span className="font-medium text-[#8da0b2]">(dönüş km'si de sayılır)</span></span>
            </label>
            {f.emptyReturn && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#f3d9d2] bg-[#fff6f3] p-3">
                <p className="min-w-0 flex-1 text-[11px] text-[#b5654f]">Boş dönüş km (boşsa gidiş kadar: {plain(c.loadedKm, 0)})</p>
                <Input inputMode="decimal" value={f.returnKm} onChange={(e) => set("returnKm", e.target.value)} placeholder={String(c.loadedKm || 0)} className="h-10 w-24 border-[#f0cfc6] bg-white text-right text-base font-bold" />
              </div>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {VEHICLES.map((v) => {
                const active = f.vehicle === v.label
                return (
                  <button key={v.label} type="button" aria-pressed={active} onClick={() => setF((p) => ({ ...p, vehicle: v.label, consumption: v.lt }))}
                    className={cn("flex h-[84px] flex-col items-center justify-between rounded-2xl border-2 px-1.5 pb-1.5 pt-2 text-[10.5px] font-bold leading-tight transition-all active:scale-95", active ? "border-[#122c4a] bg-[#eaf1f8] text-[#122c4a]" : "border-[#e4e9ef] bg-white text-[#4a6178] hover:border-[#c4d0dc]")}>
                    <span className="flex h-9 w-full items-center justify-center"><VehicleIcon kind={v.kind} className="h-full w-full" /></span>
                    <span className="text-center">{v.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4">
              <Stepper label="Yakıt tüketimi" unit="lt / 100 km" value={f.consumption} onChange={(v) => set("consumption", v)} step={1} />
            </div>
          </Step>

          {/* 3. Yakıt ve giderler */}
          <Step n={2} title="Yakıt & Giderler" icon={<Fuel className="size-4" />}>
            <Stepper label="Mazot litre fiyatı" unit="₺ / lt" value={f.fuelPrice} onChange={(v) => set("fuelPrice", v)} step={0.5} />
            {fuelLive && num(f.fuelPrice) !== fuelLive.price && (
              <button type="button" onClick={() => set("fuelPrice", String(fuelLive.price).replace(".", ","))} className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 py-1.5 pl-2.5 pr-3.5 text-xs font-bold text-[#9a3a22] ring-1 ring-orange-200 active:scale-95">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-orange-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-orange-500" /></span>
                Güncel mazot {plain(fuelLive.price)} ₺ · Uygula
              </button>
            )}

            <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#e4e9ef] bg-[#fafbfd] px-3.5 py-3 text-left">
              <span>
                <span className="block text-sm font-bold text-[#122c4a]">Diğer giderler</span>
                <span className="block text-[11px] text-[#8da0b2]">Otoyol, şoför, bakım, ek masraf · toplam {moneyR(other)}</span>
              </span>
              <ChevronDown className={cn("size-5 text-[#627d98] transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Stepper label="Otoyol / Köprü / HGS" unit="₺" value={f.tolls} onChange={(v) => set("tolls", v)} step={100} />
                <Stepper label="Şoför / Harcırah" unit="₺" value={f.driver} onChange={(v) => set("driver", v)} step={250} />
                <Stepper label="Bakım · Lastik · Amortisman" unit="₺ / km" value={f.maintPerKm} onChange={(v) => set("maintPerKm", v)} step={0.5} />
                <Stepper label="Ek masraflar" unit="₺" value={f.extra} onChange={(v) => set("extra", v)} step={250} />
              </div>
            )}
          </Step>

          {/* 4. Kâr */}
          <Step n={3} title="Hedef Kâr" icon={<TrendingUp className="size-4" />}>
            <div className="flex items-baseline justify-between">
              <Label2>Maliyetin üzerine</Label2>
              <span className="text-3xl font-black text-[#d64526]">%{f.margin || 0}</span>
            </div>
            <input type="range" min={0} max={80} step={1} value={Math.min(80, num(f.margin))} onChange={(e) => set("margin", e.target.value)} aria-label="Hedef kâr oranı" className="mt-1 h-2 w-full cursor-pointer accent-[#d64526]" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MARGIN_PRESETS.map((m) => <Pill key={m} active={num(f.margin) === m} onClick={() => set("margin", String(m))}>%{m}</Pill>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Stepper label="Yük tonajı (ops.)" unit="ton" value={f.tons} onChange={(v) => set("tons", v)} step={1} placeholder="Ton başı için" />
              <label className="flex min-h-[74px] cursor-pointer items-center gap-3 rounded-xl border border-[#e4e9ef] bg-[#fafbfd] px-3.5">
                <input type="checkbox" checked={f.vat} onChange={(e) => set("vat", e.target.checked)} className="size-5 accent-[#d64526]" />
                <span>
                  <span className="block text-sm font-bold text-[#122c4a]">KDV (%20) ekle</span>
                  <span className="block text-[11px] text-[#8da0b2]">Teklif KDV dahil gösterilir</span>
                </span>
              </label>
            </div>
          </Step>

          <button type="button" onClick={() => { setF(DEFAULTS); setMoreOpen(false) }} className="mx-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#627d98] hover:bg-[#f0f4f8]">
            <RotateCcw className="size-3.5" /> Tüm değerleri sıfırla
          </button>

          {/* Mobilde sürekli görünen fiyat çubuğu */}
          <div className="sticky bottom-[84px] z-20 lg:hidden">
            <button type="button" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex w-full items-center justify-between rounded-2xl bg-[#122c4a] px-4 py-3 text-left text-white shadow-[0_12px_28px_-10px_rgba(18,44,74,0.8)]">
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#ff8a65]">Önerilen navlun</span>
                <span className="block text-xl font-black leading-tight text-emerald-300">{moneyR(c.finalPrice)}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-white/80">Detay <ChevronDown className="size-4" /></span>
            </button>
          </div>
        </div>

        {/* ============ SONUÇ ============ */}
        <div ref={resultRef} className="scroll-mt-4 space-y-4 lg:sticky lg:top-24 lg:col-span-5 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="overflow-hidden rounded-3xl border border-[#1e3a5f] bg-white shadow-md">
            {/* Fiyat başlığı */}
            <div className="bg-gradient-to-br from-[#122c4a] to-[#1d4268] p-5 text-white">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff8a65]">Önerilen navlun fiyatı</p>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/80">{f.vat ? "KDV dahil" : "KDV hariç"}</span>
              </div>
              <p className="mt-1 text-4xl font-black tracking-tight text-emerald-300 sm:text-5xl">{moneyR(c.finalPrice)}</p>
              <p className="mt-1 text-xs text-white/60">
                {plain(c.loadedKm, 0)} km{c.returnKm > 0 ? ` + ${plain(c.returnKm, 0)} km boş dönüş` : ""} · {plain(c.liters, 0)} lt yakıt{!f.vat ? ` · KDV dahil ${moneyR(c.price * 1.2)}` : ""}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Tile label="Masraf toplamı" value={moneyR(c.totalCost)} />
                <Tile label="KM başı" value={money(c.pricePerKm)} />
                <Tile label="Ton başı" value={c.perTon > 0 ? moneyR(c.perTon) : "—"} />
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Maliyet dağılımı */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#486581]">Maliyet dağılımı</h3>
                  <span className="text-xs font-bold text-[#122c4a]">{moneyR(c.totalCost)}</span>
                </div>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#eef2f6]">
                  {c.parts.map((p) => <div key={p.key} title={`${p.label}: ${moneyR(p.value)}`} style={{ width: `${(p.value / c.totalCost) * 100}%`, background: p.color }} />)}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {c.parts.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex min-w-0 items-center gap-1.5 text-[#486581]"><i className="size-2 shrink-0 rounded-full" style={{ background: p.color }} /><span className="truncate">{p.label}</span></span>
                      <span className="shrink-0 font-bold text-[#122c4a]">%{plain((p.value / c.totalCost) * 100, 0)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-emerald-800">Hedef kâr (%{f.margin || 0})</span>
                  <span className="font-black text-emerald-700">+{moneyR(c.profit)}</span>
                </div>
              </div>

              {/* Teklif ölçer */}
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-[#486581]">Gelen teklifi değerlendir</h3>
                <div className="relative">
                  <Input inputMode="decimal" value={f.offer} onChange={(e) => set("offer", e.target.value)} placeholder="Karşı tarafın teklifi (₺)" className="h-12 border-[#d9e2ec] bg-[#f8fafc] pr-10 text-lg font-bold focus:bg-white" />
                  {f.offer && <button type="button" aria-label="Temizle" onClick={() => set("offer", "")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#8da0b2] hover:bg-[#eef2f6]"><X className="size-4" /></button>}
                </div>
                <Meter cost={c.totalCost} price={c.price} offer={c.offer} />
                {verdict && (
                  <div className={cn("mt-3 rounded-xl border p-3", verdict.tone === "red" && "border-red-200 bg-red-50 text-red-800", verdict.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900", verdict.tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                    <p className="text-sm font-black">{verdict.title}</p>
                    <p className="mt-0.5 text-xs font-medium">{verdict.text}</p>
                  </div>
                )}
              </div>

              {/* Pazarlık rehberi */}
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#486581]">Pazarlık rehberi</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#e4e9ef] bg-[#fafbfd] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8da0b2]">İlk söyleyeceğin</p>
                    <p className="mt-0.5 text-lg font-black text-[#122c4a]">{moneyR(c.openPrice)}</p>
                    <p className="text-[10px] text-[#8da0b2]">%10 pazarlık payı bırakır</p>
                  </div>
                  <div className="rounded-xl border border-[#e4e9ef] bg-[#fafbfd] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8da0b2]">İnebileceğin en alt</p>
                    <p className="mt-0.5 text-lg font-black text-[#d64526]">{moneyR(c.floorPrice)}</p>
                    <p className="text-[10px] text-[#8da0b2]">Maliyet + %10 kâr</p>
                  </div>
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText())}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#059669] text-sm font-bold text-white transition-colors hover:bg-[#047857]">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
                <button type="button" onClick={handleShare} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#122c4a] text-sm font-bold text-white transition-colors hover:bg-[#1d4268]">
                  {copied ? <Check className="size-4 text-emerald-300" /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Kopyalandı" : "Paylaş / Kopyala"}
                </button>
              </div>
              <div className="rounded-2xl bg-[#f3f7fb] p-3 ring-1 ring-[#e3ebf3]">
                <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">Gelir Gider'e aktar</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => toFinance("income")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(5,150,105,0.8)] active:scale-95">
                    <Wallet className="size-4" /> Gelir
                  </button>
                  <button type="button" onClick={() => toFinance("expense")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[#c13a1c] ring-1 ring-[#f0cfc6] active:scale-95">
                    <Receipt className="size-4" /> Masraf
                  </button>
                </div>
              </div>
              <button type="button" onClick={saveCurrent} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e0e6ed] bg-white text-sm font-bold text-[#334e68] hover:bg-[#f6f8fb]">
                <Bookmark className="size-4" /> Bu hesabı kaydet
              </button>
              <p className="text-[11px] leading-snug text-[#8da0b2]">* Kâr, maliyetin üzerine eklenen orandır. Tutarlar tahminidir; yol ve piyasa koşullarına göre değişebilir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- küçük bileşenler ---------- */

function Step({ n, title, icon, children }: { n: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-full bg-[#122c4a] text-xs font-black text-white">{n}</span>
        <h2 className="text-sm font-bold text-[#122c4a]">{title}</h2>
        <span className="ml-auto text-[#b0bfcd]">{icon}</span>
      </div>
      {children}
    </section>
  )
}

function Label2({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-[#486581]">{children}</p>
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition-colors", active ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#627d98] hover:border-[#c4d0dc]")}>
      {children}
    </button>
  )
}

/** − [değer] + : parmakla hızlı ayar; elle de yazılabilir */
function Stepper({ label, unit, value, onChange, step, placeholder }: { label: string; unit: string; value: string; onChange: (v: string) => void; step: number; placeholder?: string }) {
  const bump = (dir: 1 | -1) => {
    const next = Math.max(0, Math.round((num(value) + dir * step) * 100) / 100)
    onChange(String(next).replace(".", ","))
  }
  return (
    <div>
      <Label2>{label}</Label2>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Azalt" onClick={() => bump(-1)} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#e0e6ed] bg-white text-[#486581] active:scale-95"><Minus className="size-4" /></button>
        <div className="relative min-w-0 flex-1">
          <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "0"} className="h-11 border-[#d9e2ec] bg-[#f8fafc] pr-[4.5rem] text-center text-base font-bold focus:bg-white" />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#8da0b2]">{unit}</span>
        </div>
        <button type="button" aria-label="Artır" onClick={() => bump(1)} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#e0e6ed] bg-white text-[#486581] active:scale-95"><Plus className="size-4" /></button>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2.5 py-2">
      <p className="text-[10px] text-white/55">{label}</p>
      <p className="truncate text-sm font-bold text-white">{value}</p>
    </div>
  )
}

/** Kırmızı (zarar) → sarı (kâr ama hedefin altı) → yeşil (hedef üstü). Gelen teklif çubuk üzerinde işaretlenir. */
function Meter({ cost, price, offer }: { cost: number; price: number; offer: number }) {
  const lo = cost * 0.85
  const hi = Math.max(price * 1.15, lo + 1)
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
  const pCost = pos(cost)
  const pPrice = pos(price)
  const keep = (p: number) => Math.min(88, Math.max(12, p))
  return (
    <div className={cn("relative mb-9 mt-3", offer > 0 ? "pt-9" : "pt-1")}>
      {offer > 0 && (
        <div className="absolute top-0 -translate-x-1/2" style={{ left: `${keep(pos(offer))}%` }}>
          <div className="rounded-lg bg-[#122c4a] px-2 py-1 text-[11px] font-black text-white shadow">{moneyR(offer)}</div>
          <div className="mx-auto size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#122c4a]" />
        </div>
      )}
      <div className="flex h-3.5 overflow-hidden rounded-full">
        <div className="bg-red-400" style={{ width: `${pCost}%` }} />
        <div className="bg-amber-400" style={{ width: `${Math.max(0, pPrice - pCost)}%` }} />
        <div className="bg-emerald-500" style={{ width: `${100 - pPrice}%` }} />
      </div>
      <div className="absolute -translate-x-1/2 text-center" style={{ left: `${keep(pCost)}%`, top: offer > 0 ? "3.1rem" : "1.6rem" }}>
        <p className="text-[10px] font-bold text-red-500">Zarar etmeme sınırı</p>
        <p className="text-[10px] font-semibold text-[#627d98]">{moneyR(cost)}</p>
      </div>
      <div className="absolute -translate-x-1/2 text-center" style={{ left: `${keep(pPrice)}%`, top: offer > 0 ? "3.1rem" : "1.6rem" }}>
        <p className="text-[10px] font-bold text-emerald-600">Hedef</p>
        <p className="text-[10px] font-semibold text-[#627d98]">{moneyR(price)}</p>
      </div>
    </div>
  )
}
