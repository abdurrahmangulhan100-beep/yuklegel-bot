'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  ShieldAlert,
  Volume2,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'surus' | 'mola' | 'dinlenme' | 'durduruldu'

interface TachoState {
  mode: Mode
  modeStartTime: number | null // Modun başladığı zaman damgası (Date.now())
  baseContinuousSeconds: number
  baseDailySeconds: number
  baseBreakSeconds: number
  isExtendedDay: boolean
}

const STORAGE_KEY = 'nakliye_takograf_state_v2'

export function TachographCalculator() {
  const [mode, setMode] = useState<Mode>('durduruldu')
  const [modeStartTime, setModeStartTime] = useState<number | null>(null)
  
  const [baseContinuousSeconds, setBaseContinuousSeconds] = useState(0)
  const [baseDailySeconds, setBaseDailySeconds] = useState(0)
  const [baseBreakSeconds, setBaseBreakSeconds] = useState(0)
  
  const [isExtendedDay, setIsExtendedDay] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Canlı Ekran Değerleri
  const [continuousSeconds, setContinuousSeconds] = useState(0)
  const [dailySeconds, setDailySeconds] = useState(0)
  const [breakSeconds, setBreakSeconds] = useState(0)

  const MAX_CONTINUOUS = 4.5 * 3600 // 4 saat 30 dk = 16200 sn
  const MAX_DAILY = (isExtendedDay ? 10 : 9) * 3600 // 9 veya 10 saat
  const REQUIRED_BREAK = 45 * 60 // 45 dk = 2700 sn

  const hasNotified15m = useRef(false)
  const hasNotifiedExceeded = useRef(false)

  // Web Audio API ile Sesli Uyarı Çalma
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      
      // Siren Etkisi
      const playBeep = (freq: number, delay: number, duration: number) => {
        setTimeout(() => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + duration)
        }, delay)
      }

      playBeep(880, 0, 0.3)
      playBeep(1100, 350, 0.3)
      playBeep(880, 700, 0.4)
    } catch (e) {
      console.error('Ses çalınamadı:', e)
    }
  }, [soundEnabled])

  // Masaüstü / Mobil Bildirim Gönderme
  const sendNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'takograf-alert'
      })
    }
  }, [])

  // 1. Verileri LocalStorage'dan Yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: TachoState = JSON.parse(saved)
        setMode(parsed.mode || 'durduruldu')
        setModeStartTime(parsed.modeStartTime || null)
        setBaseContinuousSeconds(parsed.baseContinuousSeconds || 0)
        setBaseDailySeconds(parsed.baseDailySeconds || 0)
        setBaseBreakSeconds(parsed.baseBreakSeconds || 0)
        setIsExtendedDay(!!parsed.isExtendedDay)
      }
    } catch (err) {
      console.error('Takograf verisi okunamadı:', err)
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 2. Durum Değiştiğinde LocalStorage'a Kaydet
  useEffect(() => {
    const stateToSave: TachoState = {
      mode,
      modeStartTime,
      baseContinuousSeconds,
      baseDailySeconds,
      baseBreakSeconds,
      isExtendedDay
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  }, [mode, modeStartTime, baseContinuousSeconds, baseDailySeconds, baseBreakSeconds, isExtendedDay])

  // 3. Zaman Damgasına Dayalı Gerçek Zamanlı Sayaç Güncelleme
  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now()
      const elapsed = modeStartTime ? Math.floor((now - modeStartTime) / 1000) : 0

      if (mode === 'surus') {
        const currentContinuous = baseContinuousSeconds + elapsed
        const currentDaily = baseDailySeconds + elapsed

        setContinuousSeconds(currentContinuous)
        setDailySeconds(currentDaily)
        setBreakSeconds(baseBreakSeconds)

        // Sekme Başlığında Canlı Geri Sayım Göster
        const continuousRemaining = Math.max(0, MAX_CONTINUOUS - currentContinuous)
        document.title = `(${formatTime(continuousRemaining)}) 🚛 Sürüş Modu | Takograf`

        // 15 Dakika Kala Uyarısı
        if (continuousRemaining <= 15 * 60 && continuousRemaining > 0 && !hasNotified15m.current) {
          hasNotified15m.current = true
          playAlertSound()
          sendNotification('⚠️ Mola Zamanı Yaklaşıyor!', 'Kesintisiz sürüş limitinize 15 dakikadan az kaldı. Park yeri arayın.')
        }

        // Limit Aşıldı Uyarısı
        if (currentContinuous >= MAX_CONTINUOUS && !hasNotifiedExceeded.current) {
          hasNotifiedExceeded.current = true
          playAlertSound()
          sendNotification('🚨 Sürüş Limiti Aşıldı!', '4.5 saatlik sürüş süreniz doldu. Derhal en az 45 dakika mola verin.')
        }

      } else if (mode === 'mola') {
        const currentBreak = baseBreakSeconds + elapsed
        setBreakSeconds(currentBreak)
        setContinuousSeconds(baseContinuousSeconds)
        setDailySeconds(baseDailySeconds)

        const breakRemaining = Math.max(0, REQUIRED_BREAK - currentBreak)
        document.title = `(${formatTime(breakRemaining)}) ☕ Mola | Takograf`

        // 45 Dk Mola Tamamlandığında Kesintisiz Sürüşü Sıfırla
        if (currentBreak >= REQUIRED_BREAK && baseContinuousSeconds > 0) {
          setBaseContinuousSeconds(0)
          setContinuousSeconds(0)
          playAlertSound()
          sendNotification('✅ Mola Tamamlandı!', '45 dakikalık zorunlu molanız tamamlandı. Sürüşe hazırsınız.')
        }

      } else if (mode === 'dinlenme') {
        document.title = `🌙 Günlük Dinlenme | Takograf`
        setContinuousSeconds(baseContinuousSeconds)
        setDailySeconds(baseDailySeconds)
        setBreakSeconds(baseBreakSeconds)
      } else {
        document.title = `⏸️ Durduruldu | Takograf`
        setContinuousSeconds(baseContinuousSeconds)
        setDailySeconds(baseDailySeconds)
        setBreakSeconds(baseBreakSeconds)
      }
    }

    updateTimers()
    const interval = setInterval(updateTimers, 1000)

    return () => {
      clearInterval(interval)
      document.title = 'Takograf Asistanı'
    }
  }, [mode, modeStartTime, baseContinuousSeconds, baseDailySeconds, baseBreakSeconds, MAX_CONTINUOUS, REQUIRED_BREAK, playAlertSound, sendNotification])

  // Mod Değiştirme Fonksiyonu
  const handleModeChange = (newMode: Mode) => {
    if (mode === newMode) return

    const now = Date.now()
    const elapsed = modeStartTime ? Math.floor((now - modeStartTime) / 1000) : 0

    // Eski modun süresini tabana sabitle
    if (mode === 'surus') {
      setBaseContinuousSeconds(prev => prev + elapsed)
      setBaseDailySeconds(prev => prev + elapsed)
    } else if (mode === 'mola') {
      setBaseBreakSeconds(prev => prev + elapsed)
    }

    // Yeni moda geç
    if (newMode === 'mola') {
      setBaseBreakSeconds(0) // Yeni mola başlangıcında mola sayacını sıfırla
    } else if (newMode === 'surus') {
      // Eğer mola 45 dk dolmuşsa sürüş sayacı zaten sıfırlanmıştır
      hasNotified15m.current = false
      hasNotifiedExceeded.current = false
    }

    setMode(newMode)
    setModeStartTime(now)
  }

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleResetDay = () => {
    if (confirm('Günlük takograf verilerini sıfırlamak istediğinize emin misiniz?')) {
      setMode('durduruldu')
      setModeStartTime(null)
      setBaseContinuousSeconds(0)
      setBaseDailySeconds(0)
      setBaseBreakSeconds(0)
      setContinuousSeconds(0)
      setDailySeconds(0)
      setBreakSeconds(0)
      hasNotified15m.current = false
      hasNotifiedExceeded.current = false
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const continuousRemaining = Math.max(0, MAX_CONTINUOUS - continuousSeconds)
  const dailyRemaining = Math.max(0, MAX_DAILY - dailySeconds)

  const isContinuousWarning = continuousRemaining <= 15 * 60 && continuousRemaining > 0
  const isContinuousExceeded = continuousSeconds >= MAX_CONTINUOUS
  const isDailyExceeded = dailySeconds >= MAX_DAILY

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Üst Ayar Barı */}
      <div className="flex items-center justify-between bg-card p-3.5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Arka Plan Takip Aktif</span>
        </div>
        
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            soundEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground"
          )}
        >
          <Volume2 className="size-3.5" />
          <span>{soundEnabled ? 'Sesli Alarm Açık' : 'Ses Sessizde'}</span>
        </button>
      </div>

      {/* İhlal / Uyarı Bildirimleri */}
      {(isContinuousExceeded || isDailyExceeded) && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-pulse">
          <ShieldAlert className="size-6 shrink-0" />
          <div className="text-sm">
            <p className="font-extrabold">Yasal Sürüş Sınırı Aşıldı!</p>
            <p className="text-xs opacity-90">
              {isContinuousExceeded && '4.5 saatlik kesintisiz sürüş süreniz doldu. Derhal en az 45 dakika mola verin.'}
              {isDailyExceeded && ' Günlük toplam sürüş limitinize ulaştınız. Günlük dinlenmeye geçmelisiniz.'}
            </p>
          </div>
        </div>
      )}

      {isContinuousWarning && !isContinuousExceeded && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-6 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Mola Zamanı Yaklaşıyor!</p>
            <p className="text-xs opacity-90">Kesintisiz sürüş limitinize 15 dakikadan az kaldı. Uygun bir park alanı bulun.</p>
          </div>
        </div>
      )}

      {/* Ana Durum Kontrol Paneli */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => handleModeChange('surus')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-xs cursor-pointer active:scale-95',
            mode === 'surus'
              ? 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-600/20'
              : 'border-border bg-card hover:border-blue-500/50 text-card-foreground'
          )}
        >
          <Play className="mb-2 size-7" />
          <span className="font-extrabold text-sm">Sürüş Modu</span>
          <span className="text-[11px] opacity-80">Direksiyon başında</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('mola')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-xs cursor-pointer active:scale-95',
            mode === 'mola'
              ? 'border-amber-500 bg-amber-500 text-white ring-4 ring-amber-500/20'
              : 'border-border bg-card hover:border-amber-500/50 text-card-foreground'
          )}
        >
          <Coffee className="mb-2 size-7" />
          <span className="font-extrabold text-sm">Mola (45 Dk)</span>
          <span className="text-[11px] opacity-80">Kısa dinlenme</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('dinlenme')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-xs cursor-pointer active:scale-95',
            mode === 'dinlenme'
              ? 'border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-600/20'
              : 'border-border bg-card hover:border-indigo-600/50 text-card-foreground'
          )}
        >
          <Moon className="mb-2 size-7" />
          <span className="font-extrabold text-sm">Günlük Dinlenme</span>
          <span className="text-[11px] opacity-80">11 Saatlik yatış</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('durduruldu')}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border p-5 transition-all shadow-xs cursor-pointer active:scale-95',
            mode === 'durduruldu'
              ? 'border-zinc-700 bg-zinc-800 text-white ring-4 ring-zinc-500/20'
              : 'border-border bg-card hover:bg-muted/50 text-card-foreground'
          )}
        >
          <Pause className="mb-2 size-7" />
          <span className="font-extrabold text-sm">Durdur</span>
          <span className="text-[11px] opacity-80">Diğer işler / Bekleme</span>
        </button>
      </div>

      {/* Sayaç Kartları */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Kesintisiz Sürüş Kartı */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              <h3 className="font-bold text-sm text-foreground">Kesintisiz Sürüş (Mola Sınırı)</h3>
            </div>
            <span className="text-[11px] font-extrabold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Maks. 4s 30dk</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-muted-foreground">Tamamlanan: {formatTime(continuousSeconds)}</span>
                <span className={cn('font-black', isContinuousExceeded ? 'text-destructive' : 'text-blue-600 dark:text-blue-400')}>
                  Kalan: {formatTime(continuousRemaining)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    isContinuousExceeded ? 'bg-destructive' : isContinuousWarning ? 'bg-amber-500' : 'bg-blue-600'
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="size-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-foreground">Günlük Toplam Sürüş</h3>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isExtendedDay}
                onChange={(e) => setIsExtendedDay(e.target.checked)}
                className="rounded border-input text-indigo-600 focus:ring-indigo-600"
              />
              10 Saat Sınırı (İstisna)
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-muted-foreground">Tamamlanan: {formatTime(dailySeconds)}</span>
                <span className={cn('font-black', isDailyExceeded ? 'text-destructive' : 'text-indigo-600 dark:text-indigo-400')}>
                  Kalan: {formatTime(dailyRemaining)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    isDailyExceeded ? 'bg-destructive' : 'bg-indigo-600'
                  )}
                  style={{ width: `${Math.min(100, (dailySeconds / MAX_DAILY) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Günlük Limit: <strong>{isExtendedDay ? '10 Saat' : '9 Saat'}</strong></span>
              <button
                type="button"
                onClick={handleResetDay}
                className="inline-flex items-center gap-1 text-destructive font-bold hover:underline cursor-pointer"
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
        <ul className="list-disc list-inside space-y-1 leading-relaxed">
          <li><strong>Kesintisiz Sürüş:</strong> En fazla 4.5 saat sürüş yapılabilir. Ardından en az 45 dakika mola verilmelidir (15 dk + 30 dk şeklinde bölünebilir).</li>
          <li><strong>Günlük Sürüş:</strong> Günde en fazla 9 saattir. Haftada en fazla 2 kez 10 saate çıkarılabilir.</li>
          <li><strong>Haftalık Sürüş:</strong> Toplam haftalık sürüş süresi 56 saati geçemez.</li>
          <li><strong>Günlük Dinlenme:</strong> 24 saatlik dilim içerisinde en az 11 saat kesintisiz günlük dinlenme yapılmalıdır.</li>
        </ul>
      </div>
    </div>
  )
}
