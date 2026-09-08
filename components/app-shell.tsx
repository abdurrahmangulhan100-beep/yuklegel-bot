'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Truck, Store, PlusCircle, Wallet, X, Loader2,
  Sun, Moon, ArrowLeft, Search, CheckCircle2, ShieldCheck,
  Users, MapPin, Navigation, Compass, Radio, Fuel, Calendar,
  Play, Timer, Route as RouteIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Dynamic lazy imports with ssr false for maximum performance
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
    <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-[#171A1F]/40">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        <Loader2 className="size-4 animate-spin text-[#FF7A29]" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar' | 'profil'
type DriverStatus = 'garajda' | 'yuk-ariyor' | 'yolda'

const VALID_TABS: ModuleId[] = ['dashboard', 'pazar', 'ekle', 'ilanlarim', 'sizden-gelenler', 'finans', 'takograf', 'sefer', 'yakit', 'notlar', 'profil']

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

const DRIVER_STATUS_META: Record<DriverStatus, { label: string; dot: string }> = {
  'garajda': { label: 'Garajda', dot: 'bg-zinc-400' },
  'yuk-ariyor': { label: 'Yük Arıyor', dot: 'bg-[#FF7A29]' },
  'yolda': { label: 'Yolda', dot: 'bg-[#3E6B96]' },
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

  // Real-time & Interactive States
  const [pazarCount, setPazarCount] = useState<number>(0)
  const [isCountLoading, setIsCountLoading] = useState(true)
  const [countError, setCountError] = useState(false)
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('yuk-ariyor')

  // Sefer Yönetimi State'leri
  const [activeTrip, setActiveTrip] = useState<ActiveTripData | null>(null)
  const [isTripModalOpen, setIsTripModalOpen] = useState(false)
  const [tripForm, setTripForm] = useState({ from: '', to: '', totalKm: '', price: '' })

  // Tema: kayıtlı tercih > mevcut class > sistem teması
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('nakliye_theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored ? stored === 'dark' : (document.documentElement.classList.contains('dark') || !!prefersDark)

    document.documentElement.classList.toggle('dark', shouldBeDark)
    setIsDarkMode(shouldBeDark)

    // LocalStorage'dan aktif seferi çek
    const savedTrip = localStorage.getItem('nakliye_active_trip')
    if (savedTrip) {
      try { setActiveTrip(JSON.parse(savedTrip)) } catch (e) { console.error(e) }
    }

    fetchCounts()

    // Real-time Supabase Aboneliği
    const channel = supabase
      .channel('public:listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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

  const fetchCounts = async () => {
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
  }

  const showToast = useCallback((type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
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
        localStorage.setItem('nakliye_theme', next ? 'dark' : 'light')
      }
      return next
    })
  }, [])

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tripForm.from || !tripForm.to) return
    const newTrip: ActiveTripData = {
      from: tripForm.from,
      to: tripForm.to,
      totalKm: Number(tripForm.totalKm) || 300,
      completedKm: 0,
      price: tripForm.price || '0'
    }
    setActiveTrip(newTrip)
    localStorage.setItem('nakliye_active_trip', JSON.stringify(newTrip))
    setIsTripModalOpen(false)
    setTripForm({ from: '', to: '', totalKm: '', price: '' })
    setDriverStatus('yolda')
    showToast('success', 'Yeni sefer başarıyla başlatıldı!')
  }

  const handleEndTrip = () => {
    setActiveTrip(null)
    localStorage.removeItem('nakliye_active_trip')
    setDriverStatus('garajda')
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

  const statusMeta = DRIVER_STATUS_META[driverStatus]

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#EEF0F3] dark:bg-[#0E1013] text-zinc-900 dark:text-zinc-100 font-sans antialiased">

      {/* Toast Alert */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl text-xs font-bold border motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2",
            toast.type === 'error' ? 'bg-[#C34A36] text-white border-[#a83c2b]' : 'bg-[#2F9E5B] text-white border-[#267f4a]'
          )}
        >
          {toast.type === 'error' ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#14171B]/90 backdrop-blur-md px-4 z-20">
        <div className="flex items-center gap-2.5">
          {activeTab !== 'dashboard' ? (
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
            >
              <ArrowLeft className="size-4 text-[#FF7A29]" />
              <span>Geri</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#FF7A29] text-white shadow-md shadow-[#FF7A29]/25">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight leading-none">Nakliye Cepte</h1>
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn("size-1.5 rounded-full motion-safe:animate-pulse", statusMeta.dot)} />
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">{statusMeta.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('pazar')}
            aria-label="İlan ara"
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
          >
            <Search className="size-4" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Aydınlık temaya geç' : 'Karanlık temaya geç'}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => navigateTo('profil')}
              aria-label="Profilim"
              className="relative flex size-9 items-center justify-center rounded-xl bg-[#FF7A29]/10 text-[#FF7A29] font-black text-xs border border-[#FF7A29]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#2F9E5B] ring-2 ring-white dark:ring-[#0E1013]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="rounded-xl bg-[#FF7A29] hover:bg-[#E8650F] text-white px-3.5 py-1.5 text-xs font-black shadow-md shadow-[#FF7A29]/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] focus-visible:ring-offset-2"
            >
              Giriş
            </button>
          )}
        </div>
      </header>

      {/* Body Area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mx-auto max-w-md space-y-4">

          {activeTab === 'dashboard' && (
            <>
              {/* 1. Sürücü Durum Selector */}
              <div className="flex items-center justify-between p-1 rounded-2xl bg-white dark:bg-[#171A1F] border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                {[
                  { id: 'garajda', label: 'Garajda', icon: Compass },
                  { id: 'yuk-ariyor', label: 'Yük Arıyor', icon: Radio },
                  { id: 'yolda', label: 'Yolda', icon: Navigation },
                ].map((st) => {
                  const Icon = st.icon
                  const isActive = driverStatus === st.id
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDriverStatus(st.id as DriverStatus)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]",
                        isActive
                          ? "bg-[#FF7A29] text-white shadow-md shadow-[#FF7A29]/20"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{st.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* 2. Aktif Sefer Bilgisayarı */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#171A1F] p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "size-2.5 rounded-full",
                      activeTrip ? "bg-[#3E6B96] motion-safe:animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"
                    )} />
                    <h3 className="text-xs font-black text-zinc-700 dark:text-zinc-300">Aktif Sefer</h3>
                  </div>
                  {activeTrip && (
                    <span className="text-[10px] font-black font-mono tabular-nums bg-[#3E6B96]/10 text-[#3E6B96] dark:text-[#7fb0d8] px-2 py-0.5 rounded-md">
                      ₺{activeTrip.price}
                    </span>
                  )}
                </div>

                {activeTrip ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <span className="size-2 rounded-full bg-[#3E6B96]" />
                        <span className="w-px flex-1 min-h-[18px] border-l border-dashed border-zinc-300 dark:border-zinc-700" />
                        <MapPin className="size-3 text-[#FF7A29]" />
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
                        <div
                          className="h-full rounded-full bg-[#3E6B96] transition-[width] duration-500"
                          style={{ width: `${tripProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                        <span>{activeTrip.completedKm} km tamamlandı</span>
                        <span>%{tripProgress}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigateTo('sefer')}
                        className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold active:scale-95 transition-transform text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                      >
                        Maliyet Hesabı
                      </button>
                      <button
                        type="button"
                        onClick={handleEndTrip}
                        className="py-2 px-4 rounded-xl bg-[#C34A36]/10 text-[#C34A36] dark:text-[#e08a7a] text-xs font-bold active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C34A36]"
                      >
                        Seferi Tamamla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center space-y-2">
                    <p className="text-xs font-medium text-zinc-500">Şu anda aktif bir seferiniz bulunmuyor.</p>
                    <button
                      type="button"
                      onClick={() => setIsTripModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-[#FF7A29] hover:bg-[#E8650F] text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] focus-visible:ring-offset-2"
                    >
                      <Play className="size-3.5 fill-current" /> Yeni Sefer Başlat
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Ana Metrikler & İlan Pazarı */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('pazar')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('pazar') }}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#171A1F] p-3.5 space-y-1 shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-bold">İlan Pazarı</span>
                    <Store className="size-4 text-[#FF7A29]" />
                  </div>
                  {isCountLoading ? (
                    <div className="h-7 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded my-0.5" />
                  ) : (
                    <p className="text-2xl font-black font-mono tabular-nums text-zinc-900 dark:text-white">
                      {countError ? '—' : pazarCount}
                    </p>
                  )}
                  <span className="text-[10px] font-bold text-[#2F9E5B] flex items-center gap-1">
                    {countError ? 'Veri alınamadı' : '• Güncel İlanlar'}
                  </span>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('finans')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('finans') }}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#171A1F] p-3.5 space-y-1 shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-bold">Cüzdan</span>
                    <Wallet className="size-4 text-[#2F9E5B]" />
                  </div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">Finans</p>
                  <span className="text-[10px] font-bold text-zinc-400">Gelir & Gider Yönetimi</span>
                </div>
              </div>

              {/* 4. Sürücü Araçları */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-1">Sürücü araçları</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'takograf', title: 'Takograf', desc: 'Mola Sayacı', icon: Timer, color: 'text-[#FF7A29] bg-[#FF7A29]/10 border-[#FF7A29]/20' },
                    { id: 'sefer', title: 'Sefer Hesabı', desc: 'Net Kâr', icon: RouteIcon, color: 'text-[#3E6B96] bg-[#3E6B96]/10 border-[#3E6B96]/20' },
                    { id: 'yakit', title: 'Yakıt Hesabı', desc: 'Menzil Testi', icon: Fuel, color: 'text-[#2F9E5B] bg-[#2F9E5B]/10 border-[#2F9E5B]/20' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo(item.id as ModuleId)}
                        className="flex flex-col items-center text-center p-3 rounded-2xl bg-white dark:bg-[#171A1F] border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                      >
                        <div className={cn("size-9 rounded-xl flex items-center justify-center mb-1.5 border", item.color)}>
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('yakit')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('yakit') }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#171A1F] border border-zinc-200/80 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                >
                  <div className="p-2.5 rounded-xl bg-[#FF7A29]/10 text-[#FF7A29]">
                    <Fuel className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Mazot Fiyatı</h4>
                    <p className="text-[10px] text-zinc-400 font-mono tabular-nums">Anlık: ₺44.50/Lt</p>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateTo('notlar')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigateTo('notlar') }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#171A1F] border border-zinc-200/80 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]"
                >
                  <div className="p-2.5 rounded-xl bg-[#3E6B96]/10 text-[#3E6B96]">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Hatırlatıcılar</h4>
                    <p className="text-[10px] text-zinc-400">Muayene & Bakım</p>
                  </div>
                </div>
              </div>

              {/* Hızlı İlan Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-[#171A1F] p-4 text-white shadow-lg">
                <div
                  className="absolute inset-y-0 right-0 w-16 opacity-[0.15]"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #FF7A29 0 10px, transparent 10px 20px)' }}
                  aria-hidden="true"
                />
                <div className="relative z-10 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    <ShieldCheck className="size-3 text-[#FF7A29]" /> Güvenli Portföy
                  </span>
                  <h2 className="text-base font-black">Yük veya Araç İlanı Yayınlayın</h2>
                  <p className="text-xs text-zinc-300 font-medium">Binlerce sürücü ve yük verene anında ulaşın.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('ekle')}
                  className="relative z-10 mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A29] hover:bg-[#E8650F] text-white py-2.5 text-xs font-black shadow-md active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <PlusCircle className="size-4" />
                  <span>İlan Oluştur</span>
                </button>
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
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-[#171A1F] p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setIsTripModalOpen(false)} aria-label="Kapat" className="absolute right-4 top-4 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] rounded-md">
              <X className="size-5" />
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-[#FF7A29]/10 text-[#FF7A29]">
                <Navigation className="size-5" />
              </div>
              <h3 id="trip-modal-title" className="text-base font-black">Yeni Sefer Başlat</h3>
            </div>

            <form onSubmit={handleStartTrip} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400">Nereden</label>
                <input
                  type="text"
                  required
                  value={tripForm.from}
                  onChange={(e) => setTripForm({ ...tripForm, from: e.target.value })}
                  placeholder="Örn: İstanbul"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400">Nereye</label>
                <input
                  type="text"
                  required
                  value={tripForm.to}
                  onChange={(e) => setTripForm({ ...tripForm, to: e.target.value })}
                  placeholder="Örn: Ankara"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400">Mesafe (KM)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={tripForm.totalKm}
                    onChange={(e) => setTripForm({ ...tripForm, totalKm: e.target.value })}
                    placeholder="450"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400">Navlun (₺)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={tripForm.price}
                    onChange={(e) => setTripForm({ ...tripForm, price: e.target.value })}
                    placeholder="35000"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-xl bg-[#FF7A29] hover:bg-[#E8650F] py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] focus-visible:ring-offset-2"
              >
                Seferi Kaydet & Başlat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#14171B]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2 z-30">
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
                <div className="flex size-12 items-center justify-center rounded-full bg-[#FF7A29] text-white shadow-lg shadow-[#FF7A29]/35 active:scale-90 transition-transform">
                  <Icon className="size-6" />
                </div>
                <span className="text-[10px] font-black text-[#FF7A29] mt-1">{item.title}</span>
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
                "relative flex flex-col items-center justify-center w-14 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29]",
                isActive
                  ? "text-[#FF7A29] font-black"
                  : "text-zinc-400 dark:text-zinc-500 font-medium hover:text-zinc-600"
              )}
            >
              {isActive && (
                <>
                  <span className="absolute top-0 h-0.5 w-6 rounded-full bg-[#FF7A29]" />
                  <span className="absolute inset-0 rounded-xl bg-[#FF7A29]/5 dark:bg-[#FF7A29]/10" />
                </>
              )}
              <Icon className={cn("size-5 mb-0.5 z-10", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] tracking-tight z-10">{item.title}</span>
            </button>
          )
        })}
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-[#171A1F] p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={closeAuthModal} aria-label="Kapat" className="absolute right-4 top-4 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] rounded-md">
              <X className="size-5" />
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-[#FF7A29]/10 text-[#FF7A29]">
                <Truck className="size-5" />
              </div>
              <h3 id="auth-modal-title" className="text-base font-black">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-[#FF7A29] focus:ring-1 focus:ring-[#FF7A29]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#FF7A29] hover:bg-[#E8650F] py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] focus-visible:ring-offset-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-[#FF7A29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] rounded-md"
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
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#171A1F] p-8 text-center space-y-3">
        <Truck className="size-8 text-[#FF7A29]" />
        <h3 className="text-sm font-black">Profil Yönetimi</h3>
        <button
          type="button"
          onClick={() => openAuthModal()}
          className="rounded-xl bg-[#FF7A29] hover:bg-[#E8650F] px-5 py-2 text-xs font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A29] focus-visible:ring-offset-2"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black">Hesap Bilgileri</h2>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#171A1F] p-4 space-y-3">
        <p className="text-xs font-bold">E-Posta: {user.email}</p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-xl bg-[#C34A36] px-4 py-2 text-xs font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C34A36] focus-visible:ring-offset-2"
        >
          Oturumu Kapat
        </button>
      </div>
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
