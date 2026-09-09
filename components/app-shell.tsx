'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Truck, Store, PlusCircle, Wallet, X, Loader2,
  Sun, Moon, ArrowLeft, Search, CheckCircle2, ShieldCheck,
  Users, MapPin, Navigation, Radio, Compass, ArrowRight,
  Calculator, Gauge, Fuel, StickyNote, FileText, Sparkles,
  ChevronRight, Layers, Bell, Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Dosya Ağacındaki Tüm Modüllerin Dinamik Yüklenmesi
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { ssr: false, loading: () => <ModuleLoader title="İlan Pazarı" /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { ssr: false, loading: () => <ModuleLoader title="İlan Formu" /> })
const MyListingsView = dynamic(() => import('@/components/my-listings-view').then(m => m.MyListingsView), { ssr: false, loading: () => <ModuleLoader title="İlanlarım" /> })
const UserListingsView = dynamic(() => import('@/components/user-listings-view').then(m => m.UserListingsView), { ssr: false, loading: () => <ModuleLoader title="Sürücüler" /> })
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), { ssr: false, loading: () => <ModuleLoader title="Finans & Cüzdan" /> })

// Kamyoncu Araçları Modülleri
const FuelCalculator = dynamic(() => import('@/components/fuel-calculator').then(m => m.FuelCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Mazot Hesabı" /> })
const TachographCalculator = dynamic(() => import('@/components/tachograph-calculator').then(m => m.TachographCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Takograf" /> })
const TripCalculator = dynamic(() => import('@/components/trip-calculator').then(m => m.TripCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Sefer Hesabı" /> })
const NotesView = dynamic(() => import('@/components/notes-view').then(m => m.NotesView || m.default), { ssr: false, loading: () => <ModuleLoader title="Notlar" /> })

function ModuleLoader({ title }: { title?: string }) {
  return (
    <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-xs font-bold text-slate-400">
        <Loader2 className="size-6 animate-spin text-orange-500" />
        <span>{title ? `${title} Yükleniyor...` : 'Yükleniyor...'}</span>
      </div>
    </div>
  )
}

function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-lg backdrop-blur-md transition-all duration-200", className)} {...props}>
      {children}
    </div>
  )
}

function Button({ className, variant = 'primary', size = 'md', children, ...props }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20",
    secondary: "bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700/80",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-300",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
  }
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-xs",
    lg: "h-11 px-5 text-sm"
  }
  return (
    <button className={cn(base, variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props}>
      {children}
    </button>
  )
}

function Badge({ tone = 'orange', children, className }: any) {
  const tones = {
    orange: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    slate: "bg-slate-800 text-slate-400 border-slate-700",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", tones[tone as keyof typeof tones], className)}>
      {children}
    </span>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full h-10 px-3.5 rounded-xl border border-slate-700/80 bg-slate-950/80 text-white placeholder:text-slate-500 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all",
        className
      )}
      {...props}
    />
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'araclar' | 'finans' | 'notlar' | 'profil'
type DriverStatus = 'garajda' | 'yuk-ariyor' | 'yolda'

const VALID_TABS: ModuleId[] = ['dashboard', 'pazar', 'ekle', 'ilanlarim', 'sizden-gelenler', 'araclar', 'finans', 'notlar', 'profil']

const DRIVER_STATUS_OPTIONS: { id: DriverStatus; label: string; icon: typeof Compass; dot: string }[] = [
  { id: 'garajda', label: 'Garajda', icon: Compass, dot: 'bg-slate-400' },
  { id: 'yuk-ariyor', label: 'Yük Arıyor', icon: Radio, dot: 'bg-orange-500' },
  { id: 'yolda', label: 'Yolda', icon: Navigation, dot: 'bg-emerald-500' },
]

export function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = useMemo<ModuleId>(
    () => (VALID_TABS.includes(tabParam as ModuleId) ? (tabParam as ModuleId) : 'dashboard'),
    [tabParam]
  )

  const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Durumlar ve Arama
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [pazarCount, setPazarCount] = useState<number>(0)
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('yuk-ariyor')
  const [activeToolTab, setActiveToolTab] = useState<'fuel' | 'tacho' | 'trip'>('fuel')

  const didInit = useRef(false)

  const fetchCounts = useCallback(async () => {
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) setPazarCount(count)
    } catch {
      setPazarCount(0)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || didInit.current) return
    didInit.current = true
    fetchCounts()
  }, [fetchCounts])

  const showToast = useCallback((type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  const navigateTo = useCallback((tab: ModuleId) => {
    if (tab === 'dashboard') router.push('/', { scroll: false })
    else router.push(`?tab=${tab}`, { scroll: false })
  }, [router])

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

  const statusMeta = DRIVER_STATUS_OPTIONS.find(s => s.id === driverStatus)!

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {toast && (
        <div
          role="status"
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl text-xs font-bold border',
            toast.type === 'error' ? 'bg-red-600 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-500'
          )}
        >
          {toast.type === 'error' ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Modern Üst Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-4 z-20 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {activeTab !== 'dashboard' ? (
            <Button variant="secondary" size="sm" onClick={() => navigateTo('dashboard')}>
              <ArrowLeft className="size-4 text-orange-400" />
              <span>Ana Panel</span>
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                  NAKLİYE CEPTE
                  <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded-md font-bold">LOJİSTİK</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('size-2 rounded-full animate-pulse', statusMeta.dot)} />
                  <p className="text-[10px] font-bold text-slate-400 leading-none">{statusMeta.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => navigateTo('profil')}
              className="relative flex size-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-orange-400 font-black text-xs hover:border-orange-500/50 transition-colors"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </button>
          ) : (
            <Button size="sm" onClick={() => openAuthModal()}>Giriş Yap</Button>
          )}
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-4 pb-28 max-w-6xl w-full mx-auto space-y-5">
        {activeTab === 'dashboard' && (
          <div className="space-y-5">

            {/* 1. Sürücü Durum Seçim Barı */}
            <Card className="p-1.5 bg-slate-900/90 border-slate-800">
              <div className="grid grid-cols-3 gap-1.5">
                {DRIVER_STATUS_OPTIONS.map((st) => {
                  const Icon = st.icon
                  const isActive = driverStatus === st.id
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDriverStatus(st.id)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{st.label}</span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* 2. Akıllı Rota Arama Modülü */}
            <Card className="p-4 md:p-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-100 uppercase tracking-wide">Yük ve Rota Arama</h2>
                    <p className="text-[10px] text-slate-400">Çıkış ve varış noktasına göre anında eşleşin</p>
                  </div>
                </div>
                <Badge tone="orange">
                  <span className="size-1.5 rounded-full bg-orange-400 animate-ping" />
                  {pazarCount} Aktif Yük
                </Badge>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); navigateTo('pazar'); }} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-5 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">Çıkış:</span>
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ankara, İstanbul, Mersin..."
                    className="pl-14 bg-slate-950/90 border-slate-800 h-11 text-xs"
                  />
                </div>
                <div className="md:col-span-5 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">Varış:</span>
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="İzmir, Adana, Tüm Türkiye..."
                    className="pl-14 bg-slate-950/90 border-slate-800 h-11 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full h-11">
                    <Search className="size-4" />
                    <span>Yük Bul</span>
                  </Button>
                </div>
              </form>
            </Card>

            {/* 3. Ana Sistem Modülleri (4'lü Grid Hub) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Hub 1: Yük & İlan Pazarı */}
              <Card className="p-4 border-slate-800 hover:border-orange-500/40 transition-all bg-gradient-to-b from-slate-900 to-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                      <Store className="size-5" />
                    </div>
                    <Badge tone="orange">İlan Pazarı</Badge>
                  </div>
                  <h3 className="text-sm font-black text-white">Yük & Araç İlanları</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Yayınlanan güncel navlun ve boş araç ilanlarını inceleyin veya ilan açın.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <Button variant="primary" className="w-full justify-between" onClick={() => navigateTo('pazar')}>
                    <span>İlan Pazarına Git</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <Button variant="secondary" className="w-full justify-between text-slate-300" onClick={() => navigateTo('ekle')}>
                    <span className="flex items-center gap-1.5">
                      <PlusCircle className="size-3.5 text-orange-400" />
                      İlan Oluştur
                    </span>
                    <ChevronRight className="size-3 text-slate-500" />
                  </Button>
                </div>
              </Card>

              {/* Hub 2: Sürücü Araçları (Mazot, Takograf, Sefer) */}
              <Card className="p-4 border-slate-800 hover:border-indigo-500/40 transition-all bg-gradient-to-b from-slate-900 to-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Calculator className="size-5" />
                    </div>
                    <Badge tone="indigo">Kamyoncu Aletleri</Badge>
                  </div>
                  <h3 className="text-sm font-black text-white">Hesaplama Araçları</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Mazot tüketimi, takograf sürüş süreleri ve sefer maliyeti hesaplayın.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <Button variant="indigo" className="w-full justify-between" onClick={() => navigateTo('araclar')}>
                    <span>Araç Kutusu</span>
                    <Wrench className="size-3.5" />
                  </Button>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button onClick={() => { setActiveToolTab('fuel'); navigateTo('araclar'); }} className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1">
                      <Fuel className="size-3 text-amber-400" /> Mazot
                    </button>
                    <button onClick={() => { setActiveToolTab('tacho'); navigateTo('araclar'); }} className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1">
                      <Gauge className="size-3 text-indigo-400" /> Takograf
                    </button>
                    <button onClick={() => { setActiveToolTab('trip'); navigateTo('araclar'); }} className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1">
                      <Calculator className="size-3 text-emerald-400" /> Sefer
                    </button>
                  </div>
                </div>
              </Card>

              {/* Hub 3: Finans & Cüzdan */}
              <Card className="p-4 border-slate-800 hover:border-emerald-500/40 transition-all bg-gradient-to-b from-slate-900 to-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Wallet className="size-5" />
                    </div>
                    <Badge tone="emerald">Bakiye & Gider</Badge>
                  </div>
                  <h3 className="text-sm font-black text-white">Finans Yönetimi</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Sefer başı kazançlarınızı, mazot harcamalarınızı ve giderlerinizi tutun.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <Button variant="emerald" className="w-full justify-between" onClick={() => navigateTo('finans')}>
                    <span>Finans Cüzdanım</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </Card>

              {/* Hub 4: Sefer Notları & Sürücü Vitrini */}
              <Card className="p-4 border-slate-800 hover:border-purple-500/40 transition-all bg-gradient-to-b from-slate-900 to-slate-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <StickyNote className="size-5" />
                    </div>
                    <Badge tone="purple">Notlar & Topluluk</Badge>
                  </div>
                  <h3 className="text-sm font-black text-white">Notlar & Sürücüler</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Önemli yük notlarınızı kaydedin ve yoldaki diğer meslektaşlarınızı görün.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  <Button variant="secondary" className="w-full justify-between text-slate-200" onClick={() => navigateTo('notlar')}>
                    <span className="flex items-center gap-1.5">
                      <StickyNote className="size-3.5 text-purple-400" />
                      Sefer Notlarım
                    </span>
                    <ChevronRight className="size-3 text-slate-500" />
                  </Button>
                  <Button variant="secondary" className="w-full justify-between text-slate-200" onClick={() => navigateTo('sizden-gelenler')}>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5 text-blue-400" />
                      Sürücü İlanları
                    </span>
                    <ChevronRight className="size-3 text-slate-500" />
                  </Button>
                </div>
              </Card>

            </div>

            {/* Güvenlik Banner */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center gap-3">
              <ShieldCheck className="size-7 text-orange-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Dijital Lojistik Güvenliği</h4>
                <p className="text-[10px] text-slate-400">Tüm navlun ve yük ilanlarında doğrudan yük veren ve sürücü iletişim bilgileri teyit edilir.</p>
              </div>
            </div>

          </div>
        )}

        {/* Sekme Modülleri */}
        {activeTab === 'pazar' && <ListingsView />}
        {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('pazar')} />}
        {activeTab === 'sizden-gelenler' && <UserListingsView />}
        {activeTab === 'ilanlarim' && <MyListingsView />}
        {activeTab === 'finans' && <FinanceView />}
        {activeTab === 'notlar' && <NotesView />}

        {/* Kamyoncu Alet Kutusu Modülü */}
        {activeTab === 'araclar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Calculator className="size-4 text-indigo-400" />
                Sürücü Hesaplama Araçları
              </h2>
            </div>

            <Card className="p-1.5 bg-slate-900 border-slate-800">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveToolTab('fuel')}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    activeToolTab === 'fuel' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <Fuel className="size-4 text-amber-400" />
                  <span>Mazot Hesabı</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolTab('tacho')}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    activeToolTab === 'tacho' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <Gauge className="size-4 text-indigo-300" />
                  <span>Takograf</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToolTab('trip')}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    activeToolTab === 'trip' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'
                  )}
                >
                  <Calculator className="size-4 text-emerald-400" />
                  <span>Sefer Hesabı</span>
                </button>
              </div>
            </Card>

            <div>
              {activeToolTab === 'fuel' && <FuelCalculator />}
              {activeToolTab === 'tacho' && <TachographCalculator />}
              {activeToolTab === 'trip' && <TripCalculator />}
            </div>
          </div>
        )}

        {/* Profil Modülü */}
        {activeTab === 'profil' && <ProfileView user={user} openAuthModal={openAuthModal} signOut={signOut} navigateTo={navigateTo} />}
      </main>

      {/* Sabit Alt Navigasyon Barı */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 z-30 pb-safe">
        <div className="flex items-center justify-around max-w-6xl mx-auto px-2 h-16">
          {[
            { id: 'dashboard', title: 'Ana Panel', icon: Truck },
            { id: 'pazar', title: 'İlan Pazarı', icon: Store },
            { id: 'ekle', title: 'İlan Ver', icon: PlusCircle, highlight: true },
            { id: 'araclar', title: 'Araç Kutusu', icon: Calculator },
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
                  className="flex flex-col items-center justify-center -mt-5 focus:outline-none cursor-pointer group"
                >
                  <div className="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 group-active:scale-90 transition-transform">
                    <Icon className="size-6" />
                  </div>
                  <span className="text-[10px] font-black text-orange-400 mt-1">{item.title}</span>
                </button>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id as ModuleId)}
                className={cn(
                  'flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors cursor-pointer',
                  isActive
                    ? 'text-orange-400 font-black'
                    : 'text-slate-400 font-medium hover:text-slate-200'
                )}
              >
                <Icon className={cn('size-5 mb-0.5', isActive && 'stroke-[2.5]')} />
                <span className="text-[10px] tracking-tight">{item.title}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs rounded-3xl bg-slate-900 p-6 shadow-2xl border border-slate-800 z-10">
            <button onClick={closeAuthModal} className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>

            <div className="text-center mb-5">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                <Truck className="size-6" />
              </div>
              <h3 className="text-base font-black text-white">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" />
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" />
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? <Loader2 className="size-4 animate-spin" /> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-orange-400 hover:underline cursor-pointer"
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
  user: any
  openAuthModal: () => void
  signOut: () => void
  navigateTo: (tab: ModuleId) => void
}

function ProfileView({ user, openAuthModal, signOut, navigateTo }: ProfileViewProps) {
  if (!user) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center space-y-4 border-slate-800 bg-slate-900/50">
        <Truck className="size-10 text-orange-400" />
        <h3 className="text-sm font-black text-white">Profil Yönetimi</h3>
        <p className="text-xs text-slate-400">İlan vermek ve kayıtlı verilerinize ulaşmak için oturum açın.</p>
        <Button onClick={() => openAuthModal()}>Giriş Yap / Kayıt Ol</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black text-white uppercase tracking-wider">Hesap Profili</h2>
      <Card className="p-5 space-y-4 border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-orange-500/10 text-orange-400 font-black text-lg border border-orange-500/20 flex items-center justify-center">
            {(user.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Kullanıcı Hesabı</p>
            <p className="text-xs font-black text-white">{user.email}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <Button variant="secondary" className="w-full justify-start" onClick={() => navigateTo('ilanlarim')}>
            <FileText className="size-4 text-orange-400" />
            <span>Verdiğim İlanları Yönet</span>
          </Button>
          <Button variant="secondary" className="w-full justify-start" onClick={() => navigateTo('notlar')}>
            <StickyNote className="size-4 text-purple-400" />
            <span>Sefer Notlarım</span>
          </Button>
          <Button variant="danger" className="w-full" onClick={() => signOut()}>
            Oturumu Kapat
          </Button>
        </div>
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
