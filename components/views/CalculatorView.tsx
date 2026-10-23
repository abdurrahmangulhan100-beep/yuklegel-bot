"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, RotateCcw, Share2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Form = {
  km: string
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
  km: "500",
  returnKm: "0",
  fuelPrice: "42",
  consumption: "30",
  tolls: "0",
  driver: "0",
  extra: "2000",
  maintPerKm: "0",
  margin: "35",
  tons: "",
  vat: false,
  offer: "",
}

const STORAGE_KEY = "calc_v2"

// Ortalama yakıt tüketimi (LT / 100 KM) - sadece başlangıç önerisi, kendi değerinizi yazabilirsiniz
const VEHICLE_PRESETS = [
  { label: "Tır", value: "32" },
  { label: "Kamyon", value: "24" },
  { label: "Kamyonet", value: "12" },
]
const MARGIN_PRESETS = ["10", "20", "30", "35"]

/**
 * "42,5" ve "42.5" yazımlarının ikisini de kabul eder.
 * Türkçe binlik ayracını da anlar: "1.500" -> 1500, "1.500,50" -> 1500.5
 */
const num = (v: string) => {
  let s = String(v).trim().replace(/\s/g, "")
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "")
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

const money = (val: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

const plain = (val: number, digits = 2) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(val)

export function CalculatorView() {
  const [f, setF] = useState<Form>(DEFAULTS)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)

  // Girilen değerleri cihazda hatırla
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setF({ ...DEFAULTS, ...JSON.parse(saved) })
    } catch {
      // bozuk kayıt varsa varsayılanlarla devam
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
    } catch {
      // depolama kapalıysa sessizce geç
    }
  }, [f, ready])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((prev) => ({ ...prev, [key]: value }))

  const c = useMemo(() => {
    const loadedKm = num(f.km)
    const totalKm = loadedKm + num(f.returnKm)
    const liters = (totalKm / 100) * num(f.consumption)
    const fuelCost = liters * num(f.fuelPrice)
    const tolls = num(f.tolls)
    const driver = num(f.driver)
    const extra = num(f.extra)
    const maint = totalKm * num(f.maintPerKm)
    const totalCost = fuelCost + tolls + driver + extra + maint
    const profit = totalCost * (num(f.margin) / 100)
    const price = totalCost + profit
    const priceWithVat = price * 1.2
    const finalPrice = f.vat ? priceWithVat : price
    const tons = num(f.tons)
    const offer = num(f.offer)
    const offerProfit = offer - totalCost
    return {
      loadedKm, totalKm, liters, fuelCost, tolls, driver, extra, maint, totalCost, profit, price, priceWithVat, finalPrice,
      costPerKm: loadedKm > 0 ? totalCost / loadedKm : 0,
      pricePerKm: loadedKm > 0 ? price / loadedKm : 0,
      perTon: tons > 0 ? price / tons : 0,
      tons,
      offer,
      offerProfit,
      offerMargin: totalCost > 0 ? (offerProfit / totalCost) * 100 : 0,
    }
  }, [f])

  const targetMargin = num(f.margin)
  const verdict =
    c.offer <= 0
      ? null
      : c.offerProfit < 0
        ? { text: "Zararına", tone: "bg-red-500/15 text-red-300 border-red-400/30" }
        : c.offerMargin < targetMargin
          ? { text: "Hedefin altında", tone: "bg-amber-500/15 text-amber-300 border-amber-400/30" }
          : { text: "Kârlı", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" }

  const shareText = () =>
    [
      `Navlun teklifi: ${money(c.finalPrice)}${f.vat ? " (KDV dahil)" : ""}`,
      `Mesafe: ${plain(c.loadedKm, 0)} km${c.tons > 0 ? ` • Yük: ${plain(c.tons, 1)} ton` : ""}`,
      c.perTon > 0 ? `Ton başı: ${money(c.perTon)}` : "",
      "— Nakliye Cepte",
    ]
      .filter(Boolean)
      .join("\n")

  const handleShare = async () => {
    const text = shareText()
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

  const inputClass = "h-11 border-[#d9e2ec] bg-[#f8fafc] text-base focus:bg-white md:text-sm"

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Maliyet & Teklif Planlama</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#122c4a] sm:text-3xl">Sefer Hesaplama & Navlun Analizi</h1>
        <p className="mt-1 text-xs text-[#718397]">Giderlerinizi girin, hedef kâr marjınıza göre navlun teklifinizi görün. Girdiğiniz değerler cihazınızda saklanır.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Girdi formu */}
        <div className="space-y-5 rounded-2xl border border-[#e4e9ef] bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#e4e9ef] pb-3">
            <h2 className="text-sm font-bold text-[#122c4a]">Sefer Bilgileri</h2>
            <button
              type="button"
              onClick={() => setF(DEFAULTS)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#627d98] hover:bg-[#f0f4f8]"
            >
              <RotateCcw className="size-3.5" /> Sıfırla
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Yüklü Mesafe (KM)">
              <Input inputMode="decimal" value={f.km} onChange={(e) => set("km", e.target.value)} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Boş Dönüş Mesafesi (KM)" hint="Dönüşte yük bulamazsanız yazın">
              <Input inputMode="decimal" value={f.returnKm} onChange={(e) => set("returnKm", e.target.value)} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Mazot Litre Fiyatı (₺)">
              <Input inputMode="decimal" value={f.fuelPrice} onChange={(e) => set("fuelPrice", e.target.value)} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Yakıt Tüketimi (LT / 100 KM)">
              <Input inputMode="decimal" value={f.consumption} onChange={(e) => set("consumption", e.target.value)} className={inputClass} placeholder="0" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {VEHICLE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set("consumption", p.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      f.consumption === p.value ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#627d98] hover:border-[#c4d0dc]"
                    )}
                  >
                    {p.label} ~{p.value}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="space-y-4 border-t border-[#f0f4f8] pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">Diğer Giderler</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Otoyol / Köprü / HGS (₺)">
                <Input inputMode="decimal" value={f.tolls} onChange={(e) => set("tolls", e.target.value)} className={inputClass} placeholder="0" />
              </Field>
              <Field label="Şoför Ücreti / Harcırah (₺)">
                <Input inputMode="decimal" value={f.driver} onChange={(e) => set("driver", e.target.value)} className={inputClass} placeholder="0" />
              </Field>
              <Field label="Bakım · Lastik · Amortisman (₺ / KM)">
                <Input inputMode="decimal" value={f.maintPerKm} onChange={(e) => set("maintPerKm", e.target.value)} className={inputClass} placeholder="0" />
              </Field>
              <Field label="Ek Masraflar (₺)">
                <Input inputMode="decimal" value={f.extra} onChange={(e) => set("extra", e.target.value)} className={inputClass} placeholder="0" />
              </Field>
            </div>
          </div>

          <div className="space-y-4 border-t border-[#f0f4f8] pt-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#486581]">Hedef Kâr Oranı (maliyetin %)</Label>
                <span className="text-xs font-bold text-[#d64526]">%{f.margin || 0}</span>
              </div>
              <Input inputMode="decimal" value={f.margin} onChange={(e) => set("margin", e.target.value)} className={inputClass} placeholder="35" />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {MARGIN_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("margin", m)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      f.margin === m ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#627d98] hover:border-[#c4d0dc]"
                    )}
                  >
                    %{m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Yük Tonajı (ops.)" hint="Ton başı fiyatı hesaplar">
                <Input inputMode="decimal" value={f.tons} onChange={(e) => set("tons", e.target.value)} className={inputClass} placeholder="Örn: 24" />
              </Field>
              <Field label="Gelen Teklif (ops.)" hint="Karşı tarafın verdiği fiyat">
                <Input inputMode="decimal" value={f.offer} onChange={(e) => set("offer", e.target.value)} className={inputClass} placeholder="Örn: 12000" />
              </Field>
            </div>

            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#e4e9ef] bg-[#fafbfd] px-3.5">
              <input type="checkbox" checked={f.vat} onChange={(e) => set("vat", e.target.checked)} className="size-5 accent-[#d64526]" />
              <span className="text-sm font-semibold text-[#122c4a]">Teklife KDV (%20) ekle</span>
            </label>
          </div>
        </div>

        {/* Özet */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e3a5f] bg-[#122c4a] p-5 text-white shadow-md sm:p-6 lg:col-span-6">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#ff8a65]">Finansal Sefer Özeti</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">Canlı Hesaplama</span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <Metric label="Tahmini Tüketim" value={`${plain(c.liters)} LT`} />
              <Metric label="Maliyet (KM Başı)" value={money(c.costPerKm)} />
            </div>

            <div className="space-y-2.5 text-xs">
              <Row label="Toplam Yakıt Gideri" value={money(c.fuelCost)} />
              {c.tolls > 0 && <Row label="Otoyol / Köprü" value={money(c.tolls)} />}
              {c.driver > 0 && <Row label="Şoför / Harcırah" value={money(c.driver)} />}
              {c.maint > 0 && <Row label="Bakım · Lastik · Amortisman" value={money(c.maint)} />}
              {c.extra > 0 && <Row label="Ek Masraflar" value={money(c.extra)} />}
              <Row label="Net Operasyonel Maliyet" value={money(c.totalCost)} strong valueClass="text-amber-400" />
              <Row label={`Hesaplanan Kâr Payı (%${f.margin || 0})`} value={`+${money(c.profit)}`} valueClass="text-emerald-400" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                Tavsiye Edilen Navlun Fiyatı{f.vat ? " (KDV dahil)" : ""}
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400 sm:text-3xl">{money(c.finalPrice)}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-[11px] text-white/70">
                <div>
                  <div className="text-white/50">Başabaş</div>
                  <div className="font-bold text-white">{money(c.totalCost)}</div>
                </div>
                <div>
                  <div className="text-white/50">KM başı</div>
                  <div className="font-bold text-white">{money(c.pricePerKm)}</div>
                </div>
                <div>
                  <div className="text-white/50">Ton başı</div>
                  <div className="font-bold text-white">{c.perTon > 0 ? money(c.perTon) : "—"}</div>
                </div>
              </div>
              {!f.vat && <p className="mt-2 text-[11px] text-white/50">KDV dahil: {money(c.priceWithVat)}</p>}
            </div>

            {verdict && (
              <div className={cn("rounded-xl border p-4", verdict.tone)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">Gelen teklif: {money(c.offer)}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold">{verdict.text}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">
                  {c.offerProfit >= 0 ? "Kazanç" : "Zarar"}: {money(Math.abs(c.offerProfit))}
                  <span className="ml-2 text-xs font-medium opacity-80">(maliyetin %{plain(c.offerMargin, 1)}&apos;i)</span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
            >
              {copied ? <Check className="size-4 text-emerald-300" /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Kopyalandı" : "Teklifi Paylaş / Kopyala"}
            </button>
            <p className="text-[11px] text-white/45">* Kâr, maliyetin üzerine eklenen orandır. Tutarlar tahminidir; yol ve piyasa koşullarına göre değişebilir.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#486581]">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-[#8da0b2]">{hint}</p>}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <p className="mb-0.5 text-[11px] text-white/60">{label}</p>
      <p className="text-base font-semibold text-white">{value}</p>
    </div>
  )
}

function Row({ label, value, strong, valueClass }: { label: string; value: string; strong?: boolean; valueClass?: string }) {
  return (
    <div className={cn("flex justify-between gap-3 border-b border-white/10 pb-2", strong && "font-medium")}>
      <span className={strong ? "text-white/90" : "text-white/70"}>{label}</span>
      <span className={cn("shrink-0 font-semibold text-white", strong && "font-bold", valueClass)}>{value}</span>
    </div>
  )
}
