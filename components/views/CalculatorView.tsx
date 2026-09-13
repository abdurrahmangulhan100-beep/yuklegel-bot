"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CalculatorView() {
  const [km, setKm] = useState("500")
  const [fuelPrice, setFuelPrice] = useState("42")
  const [consumption, setConsumption] = useState("30")
  const [extraCost, setExtraCost] = useState("2000")

  const calculation = useMemo(() => {
    const d = parseFloat(km) || 0
    const f = parseFloat(fuelPrice) || 0
    const c = parseFloat(consumption) || 0
    const e = parseFloat(extraCost) || 0

    const totalFuelLiters = (d / 100) * c
    const totalFuelCost = totalFuelLiters * f
    const totalCost = totalFuelCost + e
    const recommendedPrice = totalCost * 1.35

    return {
      fuelCost: totalFuelLiters ? totalFuelCost.toFixed(2) : "0",
      totalCost: totalCost.toFixed(2),
      recommendedPrice: recommendedPrice.toFixed(2)
    }
  }, [km, fuelPrice, consumption, extraCost])

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Maliyet & Teklif Planlama</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Sefer Hesapla</h1>
        <p className="mt-2 text-sm text-[#718397]">Maliyetlerinizi görün, en kârlı navlun teklifinizi anında oluşturun.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-6 grid gap-4">
          <div className="grid gap-2"><Label>Mesafe (Kilometre)</Label><Input type="number" value={km} onChange={e => setKm(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Mazot Litre Fiyatı (TL)</Label><Input type="number" value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Yakıt Tüketimi (100 km / Litre)</Label><Input type="number" value={consumption} onChange={e => setConsumption(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Ek Masraflar (Otoyol, Köprü, Harcırah vb. TL)</Label><Input type="number" value={extraCost} onChange={e => setExtraCost(e.target.value)} /></div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-[#122c4a] text-white p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-4 text-[#d64526]">Finansal Özet & Tavsiye Edilen Teklif</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Toplam Yakıt Maliyeti:</span><span className="font-bold">₺{calculation.fuelCost}</span></div>
              <div className="flex justify-between border-b border-white/10 pb-2"><span>Toplam Sefer Maliyeti:</span><span className="font-bold">₺{calculation.totalCost}</span></div>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-white/10 p-5 border border-white/10">
            <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Tavsiye Edilen Kârlı Navlun Fiyatı</div>
            <div className="text-3xl font-bold text-[#67c587]">₺{calculation.recommendedPrice}</div>
            <p className="text-xs text-white/50 mt-2">* %35 ortalama operasyonel kâr marjı eklenmiştir.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
