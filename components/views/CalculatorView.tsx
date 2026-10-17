"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CalculatorView() {
  const [km, setKm] = useState("500")
  const [fuelPrice, setFuelPrice] = useState("42")
  const [consumption, setConsumption] = useState("30")
  const [extraCost, setExtraCost] = useState("2000")
  const [margin, setMargin] = useState("35") // Dinamik kâr marjı seçeneği

  // Türkiye finans formatı (örn: 11.205,00 ₺)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val)
  }

  // Sayı formatlama (örn: 150 Litre)
  const formatNumber = (val: number) => {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val)
  }

  const calculation = useMemo(() => {
    const d = parseFloat(km) || 0
    const f = parseFloat(fuelPrice) || 0
    const c = parseFloat(consumption) || 0
    const e = parseFloat(extraCost) || 0
    const m = parseFloat(margin) || 0

    const totalFuelLiters = (d / 100) * c
    const totalFuelCost = totalFuelLiters * f
    const totalCost = totalFuelCost + e
    const profitAmount = totalCost * (m / 100)
    const recommendedPrice = totalCost + profitAmount
    const costPerKm = d > 0 ? totalCost / d : 0

    return {
      totalFuelLiters,
      totalFuelCost,
      totalCost,
      profitAmount,
      recommendedPrice,
      costPerKm
    }
  }, [km, fuelPrice, consumption, extraCost, margin])

  return (
    <div className="space-y-6">
      {/* Başlık Alanı */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Maliyet & Teklif Planlama</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#122c4a] sm:text-3xl">Sefer Hesaplama & Navlun Analizi</h1>
        <p className="mt-1 text-xs text-[#718397]">Giderlerinizi detaylıca inceleyin, hedef kâr marjınıza göre en ideal navlun teklifinizi oluşturun.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Sol Taraf: Girdi Formu */}
        <div className="rounded-2xl border border-[#e4e9ef] bg-white p-6 shadow-sm lg:col-span-6 space-y-4">
          <h2 className="text-sm font-bold text-[#122c4a] border-b border-[#e4e9ef] pb-3 flex items-center gap-2">
            <span>⚙️</span> Operasyonel Parametreler
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#486581]">Mesafe (KM)</Label>
              <Input
                type="number"
                value={km}
                onChange={e => setKm(e.target.value)}
                className="h-10 border-[#d9e2ec] bg-[#f8fafc] text-sm focus:bg-white"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#486581]">Mazot Litre Fiyatı (₺)</Label>
              <Input
                type="number"
                value={fuelPrice}
                onChange={e => setFuelPrice(e.target.value)}
                className="h-10 border-[#d9e2ec] bg-[#f8fafc] text-sm focus:bg-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#486581]">Ort. Ortam Tüketimi (100 KM / LT)</Label>
              <Input
                type="number"
                value={consumption}
                onChange={e => setConsumption(e.target.value)}
                className="h-10 border-[#d9e2ec] bg-[#f8fafc] text-sm focus:bg-white"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#486581]">Ek Masraflar (Otoyol, Harcırah ₺)</Label>
              <Input
                type="number"
                value={extraCost}
                onChange={e => setExtraCost(e.target.value)}
                className="h-10 border-[#d9e2ec] bg-[#f8fafc] text-sm focus:bg-white"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#f0f4f8]">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-[#486581]">Hedef Kâr Marjı (%)</Label>
              <span className="text-xs font-bold text-[#d64526]">%{margin}</span>
            </div>
            <Input
              type="number"
              value={margin}
              onChange={e => setMargin(e.target.value)}
              className="h-10 border-[#d9e2ec] bg-[#f8fafc] text-sm focus:bg-white"
              placeholder="35"
            />
          </div>
        </div>

        {/* Sağ Taraf: Finansal Rapor & Tavsiye Ekranı */}
        <div className="rounded-2xl border border-[#1e3a5f] bg-[#122c4a] p-6 text-white shadow-md lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#d64526]">Finansal Sefer Özeti</h3>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">Canlı Hesaplama</span>
            </div>

            {/* Metrik Kırılımları Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <p className="text-[11px] text-white/60 mb-0.5">Tahmini Tüketim</p>
                <p className="text-base font-semibold text-white">{formatNumber(calculation.totalFuelLiters)} LT</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <p className="text-[11px] text-white/60 mb-0.5">Birim Maliyet (KM Başı)</p>
                <p className="text-base font-semibold text-white">{formatCurrency(calculation.costPerKm)}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Toplam Yakıt Gideri:</span>
                <span className="font-semibold text-white">{formatCurrency(calculation.totalFuelCost)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Ek Otoyol & Harcırah Gideri:</span>
                <span className="font-semibold text-white">{formatCurrency(parseFloat(extraCost) || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2 font-medium">
                <span className="text-white/90">Net Operasyonel Maliyet:</span>
                <span className="font-bold text-amber-400">{formatCurrency(calculation.totalCost)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/70">Hesaplanan Kâr Payı (%{margin}):</span>
                <span className="font-semibold text-emerald-400">+{formatCurrency(calculation.profitAmount)}</span>
              </div>
            </div>
          </div>

          {/* Tavsiye Edilen Fiyat Paneli */}
          <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">Tavsiye Edilen Navlun Fiyatı</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{formatCurrency(calculation.recommendedPrice)}</p>
              </div>
            </div>
            <p className="text-[11px] text-white/50 mt-2 border-t border-white/10 pt-2">
              * Bu tutar net maliyetinizin üzerine belirlenen <strong>%{margin}</strong> kâr marjı eklenerek hesaplanmıştır.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
