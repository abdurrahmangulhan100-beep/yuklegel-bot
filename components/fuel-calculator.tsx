'use client'

import { useMemo, useState } from 'react'
import { Field, TextInput } from '@/components/form-controls'
import { formatTL, formatNumber } from '@/lib/format'
import { Fuel, Gauge } from 'lucide-react'

function num(v: string): number {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function FuelCalculator() {
  const [km, setKm] = useState('')
  const [tuketim, setTuketim] = useState('') // litre / 100 km
  const [fiyat, setFiyat] = useState('')

  const { litre, maliyet, aktif } = useMemo(() => {
    const litre = (num(km) / 100) * num(tuketim)
    const maliyet = litre * num(fiyat)
    const aktif = num(km) > 0 && num(tuketim) > 0 && num(fiyat) > 0
    return { litre, maliyet, aktif }
  }, [km, tuketim, fiyat])

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
            <Fuel className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Hızlı Yakıt Hesaplama</h2>
            <p className="text-sm text-muted-foreground">Yolda ne kadar mazot yakacağınızı anında görün.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Mesafe (km)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="420"
            />
          </Field>
          <Field label="100 km Tüketim (L)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={tuketim}
              onChange={(e) => setTuketim(e.target.value)}
              placeholder="32"
            />
          </Field>
          <Field label="Litre Fiyatı (TL)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fiyat}
              onChange={(e) => setFiyat(e.target.value)}
              placeholder="43.50"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl bg-muted p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Gauge className="size-4" />
              Yakılacak Mazot
            </span>
            <span className="font-mono text-2xl font-bold text-foreground">
              {aktif ? `${formatNumber(litre, 1)} L` : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-primary/10 p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Fuel className="size-4" />
              Yakıt Maliyeti
            </span>
            <span className="font-mono text-2xl font-bold text-primary">
              {aktif ? formatTL(maliyet) : '—'}
            </span>
          </div>
        </div>

        {!aktif ? (
          <p className="text-center text-xs text-muted-foreground">
            Üç alanı da doldurduğunuzda sonuç otomatik hesaplanır.
          </p>
        ) : null}
      </div>
    </div>
  )
}
