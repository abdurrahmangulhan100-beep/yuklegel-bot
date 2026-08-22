'use client'

import { useMemo, useState } from 'react'
import { Field, TextInput } from '@/components/form-controls'
import { formatTL, formatNumber } from '@/lib/format'
import { Calculator, Fuel, Receipt, Wallet, TrendingUp, TrendingDown, Banknote, Scale, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

type TuketimModu = 'litre100' | 'kmBasi'
type NavlunModu = 'goturu' | 'tonBasi'
type KdvModu = 'haric' | 'dahil'

function num(v: string): number {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function TripCalculator() {
  const [km, setKm] = useState('')
  const [mazotFiyat, setMazotFiyat] = useState('')
  const [tuketimModu, setTuketimModu] = useState<TuketimModu>('litre100')
  const [tuketim100, setTuketim100] = useState('') // litre / 100km
  const [kmBasiTutar, setKmBasiTutar] = useState('') // TL / km
  const [gecisUcret, setGecisUcret] = useState('')
  const [ekMasraf, setEkMasraf] = useState('')
  
  // Navlun modları ve değerleri
  const [navlunModu, setNavlunModu] = useState<NavlunModu>('goturu')
  const [navlun, setNavlun] = useState('')
  const [ton, setTon] = useState('')
  const [tonFiyati, setTonFiyati] = useState('')

  // KDV Ayarları
  const [kdvModu, setKdvModu] = useState<KdvModu>('haric')
  const [kdvOrani, setKdvOrani] = useState('20') // varsayılan %20 KDV

  const [hesaplandi, setHesaplandi] = useState(false)

  const sonuc = useMemo(() => {
    const kmVal = num(km)
    const yakitMaliyet =
      tuketimModu === 'litre100'
        ? (kmVal / 100) * num(tuketim100) * num(mazotFiyat)
        : kmVal * num(kmBasiTutar)
    const gecis = num(gecisUcret)
    const ek = num(ekMasraf)
    const toplamGider = yakitMaliyet + gecis + ek
    
    // Temel (Matrah) Gelir Hesaplama
    const hamGelir = navlunModu === 'goturu' ? num(navlun) : num(ton) * num(tonFiyati)
    const kOran = num(kdvOrani) / 100

    let matrah = 0
    let kdvTutari = 0
    let kdvDahilToplam = 0

    if (kdvModu === 'haric') {
      matrah = hamGelir
      kdvTutari = matrah * kOran
      kdvDahilToplam = matrah + kdvTutari
    } else {
      kdvDahilToplam = hamGelir
      matrah = kOran > 0 ? kdvDahilToplam / (1 + kOran) : kdvDahilToplam
      kdvTutari = kdvDahilToplam - matrah
    }

    // Net Kâr, Matrah (KDV'siz tutar) üzerinden hesaplanır (KDV devletin parası olduğu için kâra eklenmez)
    const netKar = matrah - toplamGider
    const litre = tuketimModu === 'litre100' ? (kmVal / 100) * num(tuketim100) : 0
    const karMarji = matrah > 0 ? (netKar / matrah) * 100 : 0

    return { 
      yakitMaliyet, 
      gecis, 
      ek, 
      toplamGider, 
      matrah, 
      kdvTutari, 
      kdvDahilToplam, 
      netKar, 
      litre, 
      karMarji 
    }
  }, [km, mazotFiyat, tuketimModu, tuketim100, kmBasiTutar, gecisUcret, ekMasraf, navlunModu, navlun, ton, tonFiyati, kdvModu, kdvOrani])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHesaplandi(true)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        document.getElementById('sefer-ozet')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const karda = sonuc.netKar >= 0

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sefer Maliyet & Kâr Hesabı</h2>
            <p className="text-sm text-muted-foreground">Net verilerle gerçek kârınızı görün.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tahmini Mesafe (km)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="Örn: 420"
            />
          </Field>
          <Field label="Mazot Litre Fiyatı (TL)">
            <TextInput
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={mazotFiyat}
              onChange={(e) => setMazotFiyat(e.target.value)}
              placeholder="Örn: 43.50"
            />
          </Field>
        </div>

        {/* Tüketim modu */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Yakıt Tüketim Hesabı</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTuketimModu('litre100')}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                tuketimModu === 'litre100'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )}
            >
              100 km'de Litre
            </button>
            <button
              type="button"
              onClick={() => setTuketimModu('kmBasi')}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                tuketimModu === 'kmBasi'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )}
            >
              Km Başı Tutar
            </button>
          </div>
          {tuketimModu === 'litre100' ? (
            <Field label="100 km'de Ortalama Tüketim (Litre)">
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={tuketim100}
                onChange={(e) => setTuketim100(e.target.value)}
                placeholder="Örn: 32"
              />
            </Field>
          ) : (
            <Field label="Km Başına Yakıt Tutarı (TL/km)">
              <TextInput
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={kmBasiTutar}
                onChange={(e) => setKmBasiTutar(e.target.value)}
                placeholder="Örn: 13.90"
              />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Otoyol / Köprü Geçiş (TL)">
            <TextInput
              type="number"
              inputMode="numeric"
              min="0"
              value={gecisUcret}
              onChange={(e) => setGecisUcret(e.target.value)}
              placeholder="Örn: 850"
            />
          </Field>
          <Field label="Ek Masraflar (TL)" hint="Yemek, harcırah, yükleme/boşaltma...">
            <TextInput
              type="number"
              inputMode="numeric"
              min="0"
              value={ekMasraf}
              onChange={(e) => setEkMasraf(e.target.value)}
              placeholder="Örn: 1500"
            />
          </Field>
        </div>

        {/* Navlun Tipi Seçimi & Inputlar */}
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Alınacak Navlun / Taşıma Ücreti Hesabı</span>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNavlunModu('goturu')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                navlunModu === 'goturu'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )}
            >
              <Banknote className="size-4" />
              Götürü (Toplam TL)
            </button>
            <button
              type="button"
              onClick={() => setNavlunModu('tonBasi')}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                navlunModu === 'tonBasi'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )}
            >
              <Scale className="size-4" />
              Ton Başı Fiyat
            </button>
          </div>

          {navlunModu === 'goturu' ? (
            <Field label="Anlaşılan Navlun Tutarı (TL)">
              <TextInput
                type="number"
                inputMode="numeric"
                min="0"
                value={navlun}
                onChange={(e) => setNavlun(e.target.value)}
                placeholder="Örn: 18500"
              />
            </Field>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Yük Miktarı (Ton)">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={ton}
                  onChange={(e) => setTon(e.target.value)}
                  placeholder="Örn: 26.5"
                />
              </Field>
              <Field label="Ton Başı Fiyat (TL)">
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={tonFiyati}
                  onChange={(e) => setTonFiyati(e.target.value)}
                  placeholder="Örn: 750"
                />
              </Field>
            </div>
          )}

          {/* KDV Ayarları */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">KDV Durumu</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setKdvModu('haric')}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    kdvModu === 'haric'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                  )}
                >
                  + KDV Hariç
                </button>
                <button
                  type="button"
                  onClick={() => setKdvModu('dahil')}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    kdvModu === 'dahil'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                  )}
                >
                  KDV Dâhil
                </button>
              </div>
            </div>

            <Field label="KDV Oranı (%)">
              <TextInput
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                value={kdvOrani}
                onChange={(e) => setKdvOrani(e.target.value)}
                placeholder="20"
              />
            </Field>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Calculator className="size-4" />
          Hesapla
        </button>
      </form>

      {/* Özet */}
      <div id="sefer-ozet" className="lg:col-span-2">
        <div className="sticky top-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Sefer Özeti</h3>

          <div
            className={cn(
              'rounded-xl p-4 transition-colors',
              !hesaplandi
                ? 'bg-muted'
                : karda
                  ? 'bg-success/10'
                  : 'bg-destructive/10',
            )}
          >
            <div className="flex items-center gap-2">
              {hesaplandi ? (
                karda ? (
                  <TrendingUp className="size-5 text-success" />
                ) : (
                  <TrendingDown className="size-5 text-destructive" />
                )
              ) : (
                <Wallet className="size-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {hesaplandi ? (karda ? 'Net Kâr (KDV Hariç)' : 'Net Zarar') : 'Net Kâr / Zarar'}
              </span>
            </div>
            <p
              className={cn(
                'mt-1 font-mono text-3xl font-bold',
                !hesaplandi
                  ? 'text-muted-foreground'
                  : karda
                    ? 'text-success'
                    : 'text-destructive',
              )}
            >
              {hesaplandi ? formatTL(sonuc.netKar) : '—'}
            </p>
            {hesaplandi && sonuc.matrah > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kâr marjı: %{formatNumber(sonuc.karMarji, 1)}
              </p>
            ) : null}
          </div>

          <dl className="flex flex-col divide-y divide-border text-sm">
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Fuel className="size-4" />
                Yakıt Maliyeti
              </dt>
              <dd className="font-mono font-semibold text-foreground">
                {hesaplandi ? formatTL(sonuc.yakitMaliyet) : '—'}
              </dd>
            </div>
            {hesaplandi && sonuc.litre > 0 ? (
              <div className="flex items-center justify-between py-2.5">
                <dt className="pl-6 text-xs text-muted-foreground">Tahmini yakılacak mazot</dt>
                <dd className="font-mono text-xs text-muted-foreground">
                  {formatNumber(sonuc.litre, 1)} L
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Geçiş Ücretleri</dt>
              <dd className="font-mono font-semibold text-foreground">
                {hesaplandi ? formatTL(sonuc.gecis) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Ek Masraflar</dt>
              <dd className="font-mono font-semibold text-foreground">
                {hesaplandi ? formatTL(sonuc.ek) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 font-medium text-foreground">
                <Receipt className="size-4" />
                Toplam Gider
              </dt>
              <dd className="font-mono font-bold text-destructive">
                {hesaplandi ? formatTL(sonuc.toplamGider) : '—'}
              </dd>
            </div>

            {/* Navlun ve KDV Detayı */}
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground">Navlun Matrahı (Net)</dt>
              <dd className="font-mono font-semibold text-foreground">
                {hesaplandi ? formatTL(sonuc.matrah) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <Percent className="size-3.5" />
                KDV Tutarı (%{kdvOrani})
              </dt>
              <dd className="font-mono text-xs font-semibold text-muted-foreground">
                {hesaplandi ? formatTL(sonuc.kdvTutari) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 font-medium text-foreground">
                <Wallet className="size-4" />
                Fatura / Tahsilat Tutarı (KDV Dâhil)
              </dt>
              <dd className="font-mono font-bold text-primary">
                {hesaplandi ? formatTL(sonuc.kdvDahilToplam) : '—'}
              </dd>
            </div>
          </dl>

          {!hesaplandi ? (
            <p className="text-center text-xs text-muted-foreground">
              Bilgileri doldurup "Hesapla" butonuna basın.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
