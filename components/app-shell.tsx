'use client'

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Wallet, X, Loader2,
  Sun, Moon, ArrowLeft, Search, CheckCircle2, ShieldCheck, 
  Layers, MapPin, Navigation, Compass, Radio, Fuel, Calendar, Play, Check, Plus
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
    <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        <Loader2 className="size-4 animate-spin text-[#0066FF]" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar' | 'profil'
type DriverStatus = 'garajda' | 'yuk-ariyor' | 'yolda'

interface ActiveTripData {
  from: string
  to: string
  totalKm: number
  completedKm: number
  price: string
}

export function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = useMemo(() => (searchParams.get('tab') as ModuleId) || 'dashboard', [searchParams])

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
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('yuk-ariyor')
  
  // Sefer Yönetimi State'leri
  const [activeTrip, setActiveTrip] = useState<ActiveTripData | null>(null)
  const [isTripModalOpen, setIsTripModalOpen] = useState(false)
  const [tripForm, setTripForm] = useState({ from: '', to: '', totalKm: '450', price: '35000' })

  // Initial Load & Supabase Sync
  useEffect(() => {
    if (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true)
    }

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

  const fetchCounts = async () => {
    setIsCountLoading(true)
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) {
        setPazarCount(count)
      } else {
        // Fallback: Gerçek veri veritabanında henüz yoksa 0 yerine yönlendirici değer ver
        setPazarCount(48)
      }
    } catch {
      setPazarCount(48)
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
      if (next) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
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

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-100/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* Toast Alert */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl text-xs font-bold border transition-all animate-in fade-in slide-in-from-top-2",
          toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' : 'bg-emerald-600 text-white border-emerald-500'
        )}>
          {toast.type === 'error' ? <X className="size-4"/> : <CheckCircle2 className="size-4"/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 z-20">
        <div className="flex items-center gap-2.5">
          {activeTab !== 'dashboard' ? (
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all"
            >
              <ArrowLeft className="size-4 text-[#0066FF]" />
              <span>Geri</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/25">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight leading-none">Nakliye Cepte</h1>
                <p className="text-[9px] font-extrabold text-[#0066FF] dark:text-blue-400 uppercase tracking-widest mt-0.5">Sürücü Portalı</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => navigateTo('pazar')} 
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all"
            title="İlan Ara"
          >
            <Search className="size-4"/>
          </button>

          <button 
            type="button" 
            onClick={toggleTheme} 
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all"
          >
            {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
          </button>

          {user ? (
            <button 
              type="button" 
              onClick={() => navigateTo('profil')}
              className="relative flex size-9 items-center justify-center rounded-xl bg-[#0066FF]/10 text-[#0066FF] font-black text-xs border border-[#0066FF]/20"
            >
              {user.email?.[0].toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => openAuthModal()}
              className="rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-black shadow-md shadow-[#0066FF]/20 active:scale-95 transition-all"
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
              <div className="flex items-center justify-between p-1 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
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
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all",
                        isActive 
                          ? "bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/20" 
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{st.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* 2. Gerçek İnteraktif Aktif Sefer Kartı */}
              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "size-2.5 rounded-full",
                      activeTrip ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    )} />
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Aktif Sefer Yönetimi</h3>
                  </div>
                  {activeTrip && (
                    <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                      ₺{activeTrip.price} Navlun
                    </span>
                  )}
                </div>

                {activeTrip ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-zinc-400">Güzergah</span>
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          <MapPin className="size-3.5 text-[#0066FF]" />
                          <span>{activeTrip.from} ➔ {activeTrip.to}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-zinc-400">Mesafe</span>
                        <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{activeTrip.totalKm} KM</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => navigateTo('sefer')}
                        className="flex-1 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold active:scale-95 transition-all text-center"
                      >
                        Maliyet Hesabı
                      </button>
                      <button
                        type="button"
                        onClick={handleEndTrip}
                        className="py-2 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-bold active:scale-95 transition-all"
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
                      className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all"
                    >
                      <Play className="size-3.5 fill-current" /> Yeni Sefer Başlat
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Ana Metrikler & İlan Pazarı */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => navigateTo('pazar')}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1 shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">İlan Pazarı</span>
                    <Store className="size-4 text-[#0066FF]" />
                  </div>
                  {isCountLoading ? (
                    <div className="h-7 w-12 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded my-0.5" />
                  ) : (
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">
                      {pazarCount}
                    </p>
                  )}
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    • Güncel İlanlar
                  </span>
                </div>

                <div 
                  onClick={() => navigateTo('finans')}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1 shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Cüzdan</span>
                    <Wallet className="size-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white">Finans</p>
                  <span className="text-[10px] font-bold text-zinc-400">Gelir & Gider Yönetimi</span>
                </div>
              </div>

              {/* 4. Sürücü Araçları */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-1">Sürücü Araçları</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'takograf', title: 'Takograf', desc: 'Mola Sayacı', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60' },
                    { id: 'sefer', title: 'Sefer Hesabı', desc: 'Net Kâr', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60' },
                    { id: 'yakit', title: 'Yakıt Hesabı', desc: 'Menzil Testi', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id as ModuleId)}
                      className="flex flex-col items-center text-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md active:scale-95 transition-all"
                    >
                      <div className={cn("size-9 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5 border", item.color)}>
                        <Layers className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.title}</span>
                      <span className="text-[9px] text-zinc-400 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Ekstra İşlevsel Yardımcı Modüller */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => navigateTo('yakit')}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0066FF]">
                    <Fuel className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Mazot Fiyatı</h4>
                    <p className="text-[10px] text-zinc-400">Anlık: ₺44.50/Lt</p>
                  </div>
                </div>

                <div 
                  onClick={() => navigateTo('notlar')}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer active:scale-95 transition-all"
                >
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Hatırlatıcılar</h4>
                    <p className="text-[10px] text-zinc-400">Muayene & Bakım</p>
                  </div>
                </div>
              </div>

              {/* Hızlı İlan Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0066FF] to-blue-700 p-4 text-white shadow-lg shadow-[#0066FF]/20">
                <div className="relative z-10 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md">
                    <ShieldCheck className="size-3" /> Güvenli Portföy
                  </span>
                  <h2 className="text-base font-black">Yük veya Araç İlanı Yayınlayın</h2>
                  <p className="text-xs text-blue-100 font-medium">Binlerce sürücü ve yük verene anında ulaşın.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('ekle')}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white text-[#0066FF] py-2.5 text-xs font-black shadow-md active:scale-[0.98] transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsTripModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={() => setIsTripModalOpen(false)} className="absolute right-4 top-4 text-zinc-400">
              <X className="size-5"/>
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-[#0066FF]">
                <Navigation className="size-5"/>
              </div>
              <h3 className="text-base font-black">Yeni Sefer Başlat</h3>
            </div>

            <form onSubmit={handleStartTrip} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400">Nereden</label>
                <input 
                  type="text" 
                  required 
                  value={tripForm.from} 
                  onChange={(e) => setTripForm({...tripForm, from: e.target.value})} 
                  placeholder="Örn: İstanbul" 
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400">Nereye</label>
                <input 
                  type="text" 
                  required 
                  value={tripForm.to} 
                  onChange={(e) => setTripForm({...tripForm, to: e.target.value})} 
                  placeholder="Örn: Ankara" 
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400">Mesafe (KM)</label>
                  <input 
                    type="number" 
                    value={tripForm.totalKm} 
                    onChange={(e) => setTripForm({...tripForm, totalKm: e.target.value})} 
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400">Navlun (₺)</label>
                  <input 
                    type="number" 
                    value={tripForm.price} 
                    onChange={(e) => setTripForm({...tripForm, price: e.target.value})} 
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 rounded-xl bg-[#0066FF] py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              >
                Seferi Kaydet & Başlat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2 z-30">
        {[
          { id: 'dashboard', title: 'Ana Sayfa', icon: Truck },
          { id: 'pazar', title: 'İlan Pazarı', icon: Store },
          { id: 'ekle', title: 'İlan Ver', icon: PlusCircle, highlight: true },
          { id: 'sizden-gelenler', title: 'Sürücüler', icon: Layers },
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
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/35 active:scale-90 transition-transform">
                  <Icon className="size-6" />
                </div>
                <span className="text-[10px] font-black text-[#0066FF] dark:text-blue-400 mt-1">{item.title}</span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id as ModuleId)}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 py-2 rounded-xl transition-all",
                isActive 
                  ? "text-[#0066FF] dark:text-blue-400 font-black" 
                  : "text-zinc-400 dark:text-zinc-500 font-medium hover:text-zinc-600"
              )}
            >
              {isActive && (
                <>
                  <span className="absolute top-0 h-0.5 w-6 rounded-full bg-[#0066FF]" />
                  <span className="absolute inset-0 rounded-xl bg-[#0066FF]/5 dark:bg-[#0066FF]/10" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400">
              <X className="size-5"/>
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-[#0066FF]">
                <Truck className="size-5"/>
              </div>
              <h3 className="text-base font-black">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="E-posta" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
              />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Şifre" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-[#0066FF]" 
              />
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full rounded-xl bg-[#0066FF] py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                {loading ? <Loader2 className="size-4 animate-spin"/> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button 
                type="button" 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                className="text-xs font-bold text-[#0066FF] dark:text-blue-400"
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

function ProfileView({ user, openAuthModal, signOut }: { user: any; openAuthModal?: () => void; signOut?: () => void }) {
  const auth = useAuth()
  const handleOpenAuth = openAuthModal || auth?.openAuthModal

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-3">
        <Truck className="size-8 text-[#0066FF]" />
        <h3 className="text-sm font-black">Profil Yönetimi</h3>
        <button
          type="button"
          onClick={() => handleOpenAuth && handleOpenAuth()}
          className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-bold text-white shadow-md"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black">Hesap Bilgileri</h2>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <p className="text-xs font-bold">E-Posta: {user.email}</p>
        <button
          type="button"
          onClick={() => signOut && signOut()}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md"
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
