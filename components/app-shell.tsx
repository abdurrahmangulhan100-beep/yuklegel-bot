'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Truck, Store, PlusCircle, Wallet, X, Loader2,
  Sun, Moon, ArrowLeft, Search, CheckCircle2, ShieldCheck,
  Users, MapPin, Navigation, Compass, Radio, Fuel, Calendar,
  Play, Timer, Route as RouteIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, IconButton, Card, Badge, Input } from '@/components/ui/primitives'

// Dynamic lazy imports — mobil ilk yüklemede paket boyutunu küçük tutmak için
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { ssr: false, loading: () => <ModuleLoader /> })
const MyListingsView = dynamic(() => import('@/components/my-listings-view').then(m => m.MyListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const UserListingsView = dynamic(() => import('@/components/user-listings-view').then(m => m.UserListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), { ssr: false, loading: () => <ModuleLoader /> })
const TachographCalculator = dynamic(() => import('@/components/tachograph-calculator').then(m => m.TachographCalculator), { ssr: false, loading: () => <ModuleLoader /> })
const TripCalculator = dynamic(() => import('@/components/trip-calculator').then(m => m.TripCalculator), { ssr: false, loading: () => <ModuleLoader /> })
const FuelCalculator = dynamic(() => import('@/components/fuel-calculator').then(m => m.FuelCalculator), { ssr: false, loading: () => <ModuleLoader /> })
const NotesView = dynamic(() => import('@/components/notes-view').then(m => m.NotesView), { ssr: false, loading: () => <ModuleLoader /> })

function ModuleLoader() {
  return (
    <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-ink-600 bg-white/40 dark:bg-ink-800/40">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        <Loader2 className="size-4 animate-spin text-accent" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar' | 'profil'
type DriverStatus = 'garajda' | 'yuk-ariyor' | 'yolda'

const VALID_TABS: ModuleId[] = ['dashboard', 'pazar', 'ekle', 'ilanlarim', 'sizden-gelenler', 'finans', 'takograf', 'sefer', 'yakit', 'notlar', 'profil']

const STORAGE_KEYS = {
  theme: 'nakliye_theme',
  trip: 'nakliye_active_trip',
  driverStatus: 'nakliye_driver_status',
} as const

interface ActiveTripData {
  from: string
  to: string
  totalKm: number
  completedKm: number
  price: string
}

interface AuthUser {
  email?: string | null
}

// Tek kaynak: sürücü durumu seçenekleri hem header rozetinde hem seçicide kullanılır.
// Önceki sürümde bu liste iki ayrı yerde (DRIVER_STATUS_META + JSX içi array) tekrar
// ediyordu; artık tek bir tanım var, ikisi de senkron kalıyor.
const DRIVER_STATUS_OPTIONS: { id: DriverStatus; label: string; icon: typeof Compass; dot: string }[] = [
  { id: 'garajda', label: 'Garajda', icon: Compass, dot: 'bg-zinc-400' },
  { id: 'yuk-ariyor', label: 'Yük Arıyor', icon: Radio, dot: 'bg-accent' },
  { id: 'yolda', label: 'Yolda', icon: Navigation, dot: 'bg-trust' },
]

function isDriverStatus(value: string | null): value is DriverStatus {
  return value === 'garajda' || value === 'yuk-ariyor' || value === 'yolda'
}

export function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = useMemo<ModuleId>(
    () => (VALID_TABS.includes(tabParam as ModuleId) ? (tabParam as ModuleId) : 'dashboard'),
    [tabParam]
  )

  const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [pazarCount, setPazarCount] = useState<number>(0)
  const [isCountLoading, setIsCountLoading] = useState(true)
  const [countError, setCountError] = useState(false)
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('yuk-ariyor')

  const [activeTrip, setActiveTrip] = useState<ActiveTripData | null>(null)
  const [isTripModalOpen, setIsTripModalOpen] = useState(false)
  const [tripForm, setTripForm] = useState({ from: '', to: '', totalKm: '', price: '' })

  // React 18 StrictMode geliştirme modunda efekti iki kez çalıştırır; bu ref
  // olmadan real-time kanal iki kez açılıp yalnızca biri temizlenebiliyordu.
  const didInit = useRef(false)

  const fetchCounts = useCallback(async () => {
    setIsCountLoading(true)
    setCountError(false)
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) {
        setPazarCount(count)
      } else {
        setPazarCount(0)
        setCountError(true)
      }
    } catch {
      setPazarCount(0)
      setCountError(true)
    } finally {
      setIsCountLoading(false)
    }
  }, [])

  // İlk yükleme: tema tercihi, kayıtlı sefer/durum ve real-time abonelik
  useEffect(() => {
    if (typeof window === 'undefined' || didInit.current) return
    didInit.current = true

    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const shouldBeDark = storedTheme ? storedTheme === 'dark' : (document.documentElement.classList.contains('dark') || !!prefersDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
    setIsDarkMode(shouldBeDark)

    const savedTrip = localStorage.getItem(STORAGE_KEYS.trip)
    if (savedTrip) {
      try {
        setActiveTrip(JSON.parse(savedTrip))
      } catch {
        // Bozuk/eski formatlı veri varsa sessizce temizle, uygulamayı bozma
        localStorage.removeItem(STORAGE_KEYS.trip)
      }
    }

    const savedStatus = localStorage.getItem(STORAGE_KEYS.driverStatus)
    if (isDriverStatus(savedStatus)) setDriverStatus(savedStatus)

    fetchCounts()

    const channel = supabase
      .channel('public:listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        fetchCounts()
      })
      .subscribe()

    // Aynı hesap birden fazla sekmede açıksa (örn. telefon + tablet), tema ve
    // aktif sefer değişikliklerini diğer sekmelerle senkronla.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.theme) {
        const next = e.newValue === 'dark'
        document.documentElement.classList.toggle('dark', next)
        setIsDarkMode(next)
      }
      if (e.key === STORAGE_KEYS.trip) {
        if (!e.newValue) {
          setActiveTrip(null)
        } else {
          try { setActiveTrip(JSON.parse(e.newValue)) } catch { /* yoksay */ }
        }
      }
      if (e.key === STORAGE_KEYS.driverStatus && isDriverStatus(e.newValue)) {
        setDriverStatus(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('storage', onStorage)
      didInit.current = false
    }
  }, [fetchCounts])

  // Modallar açıkken ESC ile kapat
  useEffect(() => {
    if (!isTripModalOpen && !isAuthModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isTripModalOpen) setIsTripModalOpen(false)
      if (isAuthModalOpen) closeAuthModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isTripModalOpen, isAuthModalOpen, closeAuthModal])

  const showToast = useCallback((type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const navigateTo = useCallback((tab: ModuleId) => {
    if (tab === 'dashboard') router.push('/', { scroll: false })
    else router.push(`?tab=${tab}`, { scroll: false })
  }, [router])

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.theme, next ? 'dark' : 'light')
      }
      return next
    })
  }, [])

  // Sürücü durumunu artık kalıcı olarak da saklıyoruz — önceki sürümde
  // sayfa yenilendiğinde her zaman "Yük Arıyor" durumuna sıfırlanıyordu.
  const updateDriverStatus = useCallback((status: DriverStatus) => {
    setDriverStatus(status)
    localStorage.setItem(STORAGE_KEYS.driverStatus, status)
  }, [])

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tripForm.from || !tripForm.to) return
    const newTrip: ActiveTripData = {
      from: tripForm.from,
      to: tripForm.to,
      totalKm: Number(tripForm.totalKm) || 300,
      completedKm: 0,
      price: tripForm.price || '0',
    }
    setActiveTrip(newTrip)
    localStorage.setItem(STORAGE_KEYS.trip, JSON.stringify(newTrip))
    setIsTripModalOpen(false)
    setTripForm({ from: '', to: '', totalKm: '', price: '' })
    updateDriverStatus('yolda')
    showToast('success', 'Yeni sefer başarıyla başlatıldı!')
  }

  const handleEndTrip = () => {
    setActiveTrip(null)
    localStorage.removeItem(STORAGE_KEYS.trip)
    updateDriverStatus('garajda')
    showToast('success', 'Sefer tamamlandı ve veriler temizlendi.')
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        showToast('success', 'Giriş başarılı!')
        closeAuthModal()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showToast('success', 'Kayıt oluşturuldu!')
        closeAuthModal()
      }
    } catch (err: unknown) {
      const error = err as Error
      showToast('error', error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const tripProgress = activeTrip && activeTrip.totalKm > 0
    ? Math.min(100, Math.round((activeTrip.completedKm / activeTrip.totalKm) * 100))
    : 0

  const statusMeta = DRIVER_STATUS_OPTIONS.find(s => s.id === driverStatus)!

  return (
    // Tema class'ı ilk boyamadan sonra useEffect içinde uygulandığı için tek
    // karelik bir renk sıçraması olabilir; kalıcı çözüm için layout.tsx'e bu
    // dosyanın altındaki not'ta verilen engelleyici (blocking) betiği ekleyin.
    <div
      suppressHydrationWarning
      className="flex h-dvh w-full flex-col overflow-hidden bg-surface-light dark:bg-ink-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased"
    >
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl text-xs font-bold border motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2',
            toast.type === 'error' ? 'bg-danger text-white border-danger-hover' : 'bg-finance text-white border-finance-hover'
          )}
        >
          {toast.type === 'error' ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 dark:border-ink-600 bg-white/90 dark:bg-ink-900/90 backdrop-blur-md px-4 z-20 pt-safe">
        <div className="flex items-center gap-2.5">
          {activeTab !== 'dashboard' ? (
            <Button variant="secondary" size="sm" onClick={() => navigateTo('dashboard')}>
              <ArrowLeft className="size-4 text-accent" />
              <span>Geri</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/25">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight leading-none">Nakliye Cepte</h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn('size-1.5 rounded-full motion-safe:animate-pulse', statusMeta.dot)} />
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">{statusMeta.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <IconButton aria-label="İlan ara" size="header" onClick={() => navigateTo('pazar')}>
            <Search className="size-4" />
          </IconButton>
          <IconButton
            aria-label={isDarkMode ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
            size="header"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
          {user ? (
            <button
              type="button"
              onClick={() => navigateTo('profil')}
              aria-label="Profilim"
              className="relative flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent font-black text-xs border border-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-finance ring-2 ring-white dark:ring-ink-950" />
            </button>
          ) : (
            <Button size="sm" onClick={() => openAuthModal()}>Giriş</Button>
          )}
        </div>
      </header>

      {/* Body Area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-4 pb-24">
        <div className="mx-auto max-w-md space-y-4">
          {activeTab === 'dashboard' && (
            <>
              {/* 1. Sürücü Durum Seçici */}
              <Card className="flex items-center justify-between p-1">
                {DRIVER_STATUS_OPTIONS.map((st) => {
                  const Icon = st.icon
                  const isActive = driverStatus === st.id
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateDriverStatus(st.id)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        isActive
                          ? 'bg-accent text-white shadow-md shadow-accent/20'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{st.label}</span>
                    </button>
                  )
                })}
              </Card>

              {/* 2. Aktif Sefer Bilgisayarı */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-ink-600 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('size-2.5 rounded-full', activeTrip ? 'bg-trust motion-safe:animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700')} />
                    <h3 className="text-xs font-black text-zinc-700 dark:text-zinc-300">Aktif Sefer</h3>
                  </div>
                  {activeTrip && <Badge tone="trust">₺{activeTrip.price}</Badge>}
                </div>

                {activeTrip ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <span className="size-2 rounded-full bg-trust" />
                        <span className="w-px flex-1 min-h-[18px] border-l border-dashed border-zinc-300 dark:border-zinc-700" />
                        <MapPin className="size-3 text-accent" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-xs font-black leading-none">{activeTrip.from}</p>
                        <p className="text-xs font-black leading-none">{activeTrip.to}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black font-mono tabular-nums leading-none">{activeTrip.totalKm}</p>
                        <span className="text-[10px] font-bold text-zinc-400">KM</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-trust transition-[width] duration-500" style={{ width: `${tripProgress}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400 font-mono tabular-nums">
                        <span>{activeTrip.completedKm} km tamamlandı</span>
                        <span>%{tripProgress}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="secondary" className="flex-1" onClick={() => navigateTo('sefer')}>Maliyet Hesabı</Button>
                      <Button variant="danger" onClick={handleEndTrip}>Seferi Tamamla</Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center space-y-2">
                    <p className="text-xs font-medium text-zinc-500">Şu anda aktif bir seferiniz bulunmuyor.</p>
                    <Button onClick={() => setIsTripModalOpen(true)}>
                      <Play className="size-3.5 fill-current" /> Yeni Sefer Başlat
                    </Button>
                  </div>
                )}
              </Card>

              {/* 3. Ana Metrikler & İlan Pazarı */}
              <div className="grid grid-cols-2 gap-3">
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('pazar')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('pazar') }}
                  className="p-3.5 space-y-1 hover:shadow-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-bold">İlan Pazarı</span>
                    <Store className="size-4 text-accent" />
                  </div>
                  {isCountLoading ? (
                    <div className="h-7 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded my-0.5" />
                  ) : (
                    <p className="text-2xl font-black font-mono tabular-nums text-zinc-900 dark:text-white">{countError ? '—' : pazarCount}</p>
                  )}
                  <span className="text-[10px] font-bold text-finance flex items-center gap-1">{countError ? 'Veri alınamadı' : '• Güncel İlanlar'}</span>
                </Card>

                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('finans')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('finans') }}
                  className="p-3.5 space-y-1 hover:shadow-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-bold">Cüzdan</span>
                    <Wallet className="size-4 text-finance" />
                  </div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">Finans</p>
                  <span className="text-[10px] font-bold text-zinc-400">Gelir & Gider Yönetimi</span>
                </Card>
              </div>

              {/* 4. Sürücü Araçları */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">Sürücü araçları</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'takograf', title: 'Takograf', desc: 'Mola Sayacı', icon: Timer, tone: 'accent' as const },
                    { id: 'sefer', title: 'Sefer Hesabı', desc: 'Net Kâr', icon: RouteIcon, tone: 'trust' as const },
                    { id: 'yakit', title: 'Yakıt Hesabı', desc: 'Menzil Testi', icon: Fuel, tone: 'finance' as const },
                  ].map((item) => {
                    const Icon = item.icon
                    const toneClasses = {
                      accent: 'text-accent bg-accent-soft',
                      trust: 'text-trust bg-trust-soft',
                      finance: 'text-finance bg-finance-soft',
                    }[item.tone]
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.id as ModuleId)}
                        className="flex flex-col items-center text-center p-3 min-h-[48px] rounded-2xl bg-white dark:bg-ink-800 border border-zinc-200/80 dark:border-ink-600 shadow-xs hover:shadow-md active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className={cn('size-9 rounded-xl flex items-center justify-center mb-1.5', toneClasses)}>
                          <Icon className="size-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.title}</span>
                        <span className="text-[9px] text-zinc-400 mt-0.5">{item.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. Ekstra İşlevsel Yardımcı Modüller */}
              <div className="grid grid-cols-2 gap-3">
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('yakit')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('yakit') }}
                  className="flex items-center gap-3 p-3 cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="p-2.5 rounded-xl bg-accent-soft text-accent">
                    <Fuel className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Mazot Fiyatı</h4>
                    <p className="text-[10px] text-zinc-400 font-mono tabular-nums">Anlık: ₺44.50/Lt</p>
                  </div>
                </Card>

                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('notlar')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('notlar') }}
                  className="flex items-center gap-3 p-3 cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="p-2.5 rounded-xl bg-trust-soft text-trust">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Hatırlatıcılar</h4>
                    <p className="text-[10px] text-zinc-400">Muayene & Bakım</p>
                  </div>
                </Card>
              </div>

              {/* Hızlı İlan Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-ink-800 p-4 text-white shadow-lg">
                <div
                  className="absolute inset-y-0 right-0 w-16 opacity-[0.15]"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #FF7A29 0 10px, transparent 10px 20px)' }}
                  aria-hidden="true"
                />
                <div className="relative z-10 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    <ShieldCheck className="size-3 text-accent" /> Güvenli Portföy
                  </span>
                  <h2 className="text-base font-black">Yük veya Araç İlanı Yayınlayın</h2>
                  <p className="text-xs text-zinc-300 font-medium">Binlerce sürücü ve yük verene anında ulaşın.</p>
                </div>
                <Button onClick={() => navigateTo('ekle')} className="relative z-10 mt-3 w-full">
                  <PlusCircle className="size-4" />
                  <span>İlan Oluştur</span>
                </Button>
              </div>
            </>
          )}

          {/* Dinamik Modüller */}
          <div>
            {activeTab === 'pazar' && <ListingsView />}
            {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('sizden-gelenler')} />}
            {activeTab === 'sizden-gelenler' && <UserListingsView />}
            {activeTab === 'ilanlarim' && <MyListingsView />}
            {activeTab === 'finans' && <FinanceView />}
            {activeTab === 'takograf' && <TachographCalculator />}
            {activeTab === 'sefer' && <TripCalculator />}
            {activeTab === 'yakit' && <FuelCalculator />}
            {activeTab === 'notlar' && <NotesView />}
            {activeTab === 'profil' && <ProfileView user={user} openAuthModal={openAuthModal} signOut={signOut} />}
          </div>
        </div>
      </main>

      {/* Sefer Başlatma Modalı */}
      {isTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
          <div onClick={() => setIsTripModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-ink-800 p-5 shadow-2xl border border-zinc-200 dark:border-ink-600">
            <IconButton
              aria-label="Kapat"
              size="header"
              tone="plain"
              onClick={() => setIsTripModalOpen(false)}
              className="absolute right-4 top-4 bg-transparent"
            >
              <X className="size-5" />
            </IconButton>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Navigation className="size-5" />
              </div>
              <h3 id="trip-modal-title" className="text-base font-black">Yeni Sefer Başlat</h3>
            </div>

            <form onSubmit={handleStartTrip} className="space-y-3">
              <div>
                <label htmlFor="trip-from" className="text-[10px] font-bold text-zinc-400">Nereden</label>
                <Input id="trip-from" required value={tripForm.from} onChange={(e) => setTripForm({ ...tripForm, from: e.target.value })} placeholder="Örn: İstanbul" />
              </div>

              <div>
                <label htmlFor="trip-to" className="text-[10px] font-bold text-zinc-400">Nereye</label>
                <Input id="trip-to" required value={tripForm.to} onChange={(e) => setTripForm({ ...tripForm, to: e.target.value })} placeholder="Örn: Ankara" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="trip-km" className="text-[10px] font-bold text-zinc-400">Mesafe (KM)</label>
                  <Input id="trip-km" type="number" inputMode="numeric" value={tripForm.totalKm} onChange={(e) => setTripForm({ ...tripForm, totalKm: e.target.value })} placeholder="450" />
                </div>
                <div>
                  <label htmlFor="trip-price" className="text-[10px] font-bold text-zinc-400">Navlun (₺)</label>
                  <Input id="trip-price" type="number" inputMode="numeric" value={tripForm.price} onChange={(e) => setTripForm({ ...tripForm, price: e.target.value })} placeholder="35000" />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2">Seferi Kaydet & Başlat</Button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-ink-600 flex items-center justify-around px-2 pb-safe pt-2 z-30">
        {[
          { id: 'dashboard', title: 'Ana Sayfa', icon: Truck },
          { id: 'pazar', title: 'İlan Pazarı', icon: Store },
          { id: 'ekle', title: 'İlan Ver', icon: PlusCircle, highlight: true },
          { id: 'sizden-gelenler', title: 'Sürücüler', icon: Users },
          { id: 'finans', title: 'Finans', icon: Wallet },
        ].map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if (item.highlight) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id as ModuleId)}
                aria-label={item.title}
                className="flex flex-col items-center justify-center -mt-5 focus-visible:outline-none"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/35 active:scale-90 transition-transform">
                  <Icon className="size-6" />
                </div>
                <span className="text-[10px] font-black text-accent mt-1">{item.title}</span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id as ModuleId)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center w-14 min-h-[48px] py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive
                  ? 'text-accent font-black'
                  : 'text-zinc-400 dark:text-zinc-500 font-medium hover:text-zinc-600'
              )}
            >
              {isActive && (
                <>
                  <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent" />
                  <span className="absolute inset-0 rounded-xl bg-accent-soft dark:bg-accent/10" />
                </>
              )}
              <Icon className={cn('size-5 mb-0.5 z-10', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] tracking-tight z-10">{item.title}</span>
            </button>
          )
        })}
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-ink-800 p-5 shadow-2xl border border-zinc-200 dark:border-ink-600">
            <IconButton
              aria-label="Kapat"
              size="header"
              tone="plain"
              onClick={closeAuthModal}
              className="absolute right-4 top-4 bg-transparent"
            >
              <X className="size-5" />
            </IconButton>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Truck className="size-5" />
              </div>
              <h3 id="auth-modal-title" className="text-base font-black">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" />
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md min-h-[44px] px-2"
              >
                {authMode === 'login' ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProfileViewProps {
  user: AuthUser | null
  openAuthModal: () => void
  signOut: () => void
}

function ProfileView({ user, openAuthModal, signOut }: ProfileViewProps) {
  if (!user) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center space-y-3">
        <Truck className="size-8 text-accent" />
        <h3 className="text-sm font-black">Profil Yönetimi</h3>
        <Button onClick={() => openAuthModal()}>Giriş Yap / Kayıt Ol</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black">Hesap Bilgileri</h2>
      <Card className="p-4 space-y-3">
        <p className="text-xs font-bold">E-Posta: {user.email}</p>
        <Button variant="danger" onClick={() => signOut()}>Oturumu Kapat</Button>
      </Card>
    </div>
  )
}

export function AppShell() {
  return (
    <Suspense fallback={<ModuleLoader />}>
      <AppShellContent />
    </Suspense>
  )
}
