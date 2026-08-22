'use client'

import { useState, useEffect } from 'react'
import { 
  Timer, 
  Play, 
  Pause, 
  Coffee, 
  Moon, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert 
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'surus' | 'mola' | 'dinlenme' | 'durduruldu'

export function TachographCalculator() {
  const [mode, setMode] = useState<Mode>('durduruldu')
  const [continuousSeconds, setContinuousSeconds] = useState(0) // Mola vermeden yapılan sürüş (Max 4.5 saat = 16200 sn)
  const [dailySeconds, setDailySeconds] = useState(0) // Günlük toplam sürüş (Max 9 saat = 32400 sn)
  const [breakSeconds, setBreakSeconds] = useState(0) // Mevcut mola süresi (Min 45 dk = 2700 sn)
  const [isExtendedDay, setIsExtendedDay] = useState(false) // 10 saatlik istisna sürüş hakkı (Haftada 2 kez)

  const MAX_CONTINUOUS = 4.5 * 3600 // 4 saat 30 dk
  const MAX_DAILY = (isExtendedDay ? 10 : 9) * 3600 // 9 veya 10 saat
  const REQUIRED_BREAK = 45 * 60 // 45 dk

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (mode === 'surus') {
      interval = setInterval(() => {
        setContinuousSeconds((prev) => prev + 1)
        setDailySeconds((prev) => prev + 1)
      }, 1000)
    } else if (mode === 'mola') {
      interval = setInterval(() => {
        setBreakSeconds((prev) => {
          const next = prev + 1
          // 45 dakikalık mola tamamlandığında kesintisiz sürüş sayacını sıfırla
          if (next >= REQUIRED_BREAK) {
            setContinuousSeconds(0)
          }
          return next
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [mode, REQUIRED_BREAK])

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleResetDay = () => {
    if (confirm('Günlük takograf verilerini sıfırlamak istediğinize emin misiniz?')) {
      setMode('durduruldu')
      setContinuousSeconds(0)
      setDailySeconds(0)
      setBreakSeconds(0)
    }
  }

  const continuousRemaining = Math.max(0, MAX_CONTINUOUS - continuousSeconds)
  const dailyRemaining = Math.max(0, MAX_DAILY - dailySeconds)

  const isContinuousWarning = continuousRemaining <= 15 * 60 && continuousRemaining > 0
  const isContinuousExceeded = continuousSeconds >= MAX_CONTINUOUS
  const isDailyExceeded = dailySeconds >= MAX_DAILY

  return (
    <div className="space-y-6">
      {/* İhlal / Uyarı Bildirimleri */}
      {(isContinuousExceeded || isDailyExceeded) && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <ShieldAlert className="size-6 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Yasal Sürüş Sınırı Aşıldı!</p>
            <p className="text-xs opacity-90">
              {isContinuousExceeded && '4.5 saatlik kesintisiz sürüş süreniz doldu. Derhal en az 45 dakika mola verin.'}
              {isDailyExceeded && ' Günlük toplam sürüş limitinize ulaştınız. Günlük dinlenmeye geçmelisiniz.'}
            </p>
          </div>
        </div>
      )}

      {isContinuousWarning && !isContinuousExceeded && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-6 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Mola Zamanı Yaklaşıyor!</p>
            <p className="text-xs opacity-90">Kesintisiz sürüş limitinize 15 dakikadan az kaldı. Uygun bir park alanı bulun.</p>
          </div>
        </div>
      )}

      {/* Ana Durum Kontrol Paneli */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setMode('surus')
            setBreakSeconds(0)
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-sm',
            mode === 'surus'
              ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
              : 'border-border bg-card hover:border-primary/50 text-card-foreground'
          )}
        >
          <Play className="mb-2 size-8" />
          <span className="font-bold text-base">Sürüş Modu</span>
          <span className="text-xs opacity-80">Direksiyon başında</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('mola')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-sm',
            mode === 'mola'
              ? 'border-amber-500 bg-amber-500 text-white ring-2 ring-amber-500 ring-offset-2'
              : 'border-border bg-card hover:border-amber-500/50 text-card-foreground'
          )}
        >
          <Coffee className="mb-2 size-8" />
          <span className="font-bold text-base">Mola (45 Dk)</span>
          <span className="text-xs opacity-80">Kısa dinlenme</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('dinlenme')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-sm',
            mode === 'dinlenme'
              ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2'
              : 'border-border bg-card hover:border-indigo-600/50 text-card-foreground'
          )}
        >
          <Moon className="mb-2 size-8" />
          <span className="font-bold text-base">Günlük Dinlenme</span>
          <span className="text-xs opacity-80">11 Saatlik yatış</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('durduruldu')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-sm',
            mode === 'durduruldu'
              ? 'border-muted-foreground bg-muted text-foreground'
              : 'border-border bg-card hover:bg-muted/50 text-card-foreground'
          )}
        >
          <Pause className="mb-2 size-8" />
          <span className="font-bold text-base">Durdur</span>
          <span className="text-xs opacity-80">Diğer işler / Bekleme</span>
        </button>
      </div>

      {/* Sayaç Kartları */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Kesintisiz Sürüş Kartı */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Kesintisiz Sürüş (Mola Sınırı)</h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Maks. 4s 30dk</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-muted-foreground">Tamamlanan: {formatTime(continuousSeconds)}</span>
                <span className={cn('font-bold', isContinuousExceeded ? 'text-destructive' : 'text-primary')}>
                  Kalan: {formatTime(continuousRemaining)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    isContinuousExceeded ? 'bg-destructive' : isContinuousWarning ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(100, (continuousSeconds / MAX_CONTINUOUS) * 100)}%` }}
                />
              </div>
            </div>

            {mode === 'mola' && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>Mola Sayacı: <strong>{formatTime(breakSeconds)}</strong> / 00:45:00</span>
                {breakSeconds >= REQUIRED_BREAK && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="size-4" /> Mola Tamam!
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Günlük Toplam Sürüş Kartı */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Günlük Toplam Sürüş</h3>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isExtendedDay}
                onChange={(e) => setIsExtendedDay(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary"
              />
              10 Saat Sınırı (İstisna)
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-muted-foreground">Tamamlanan: {formatTime(dailySeconds)}</span>
                <span className={cn('font-bold', isDailyExceeded ? 'text-destructive' : 'text-primary')}>
                  Kalan: {formatTime(dailyRemaining)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    isDailyExceeded ? 'bg-destructive' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(100, (dailySeconds / MAX_DAILY) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Günlük Limit: {isExtendedDay ? '10 Saat' : '9 Saat'}</span>
              <button
                type="button"
                onClick={handleResetDay}
                className="inline-flex items-center gap-1 text-destructive hover:underline"
              >
                <RotateCcw className="size-3.5" /> Günü Sıfırla
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Yasal Kural Bilgilendirme Kutusu */}
      <div className="rounded-2xl border border-border bg-card p-5 text-xs space-y-2 text-muted-foreground">
        <p className="font-bold text-foreground text-sm">📌 Yasal Takograf Sınırları (AETR Standartları):</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Kesintisiz Sürüş:</strong> En fazla 4.5 saat sürüş yapılabilir. Ardından en az 45 dakika mola verilmelidir (veya 15 dk + 30 dk şeklinde bölünebilir).</li>
          <li><strong>Günlük Sürüş:</strong> Günde en fazla 9 saattir. Haftada en fazla 2 kez 10 saate çıkarılabilir.</li>
          <li><strong>Haftalık Sürüş:</strong> Toplam haftalık sürüş süresi 56 saati geçemez.</li>
          <li><strong>Günlük Dinlenme:</strong> 24 saatlik dilim içerisinde en az 11 saat kesintisiz günlük dinlenme yapılmalıdır.</li>
        </ul>
      </div>
    </div>
  )
}
