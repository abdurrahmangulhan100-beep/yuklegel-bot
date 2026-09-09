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
  Filter, Sparkles, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Dynamic lazy imports — mobil ilk yüklemede paket boyutunu küçük tutmak için
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { ssr: false, loading: () => <ModuleLoader /> })
const MyListingsView = dynamic(() => import('@/components/my-listings-view').then(m => m.MyListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const UserListingsView = dynamic(() => import('@/components/user-listings-view').then(m => m.UserListingsView), { ssr: false, loading: () => <ModuleLoader /> })
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), { ssr: false, loading: () => <ModuleLoader /> })

function ModuleLoader() {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        <Loader2 className="size-5 animate-spin text-orange-500" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  )
}

// --- Dahili UI Bileşenleri (Harici Primitives Bağımlılığını Ortadan Kaldırır) ---
function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm backdrop-blur-sm", className)} {...props}>
      {children}
    </div>
  )
}

function Button({ className, variant = 'primary', size = 'md', children, ...props }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100",
    outline: "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
  }
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-xs",
    lg: "h-12 px-6 text-sm"
  }
  return (
    <button className={cn(base, variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props}>
      {children}
    </button>
  )
}

function Badge({ tone = 'orange', children, className }: any) {
  const tones = {
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
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
        "w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all",
        className
      )}
      {...props}
    />
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'profil'
type DriverStatus = 'garajda' | 'yuk-ariyor' | 'yolda'

const VALID_TABS: ModuleId[] = ['dashboard', 'pazar', 'ekle', 'ilanlarim', 'sizden-gelenler', 'finans', 'profil']

const STORAGE_KEYS = {
  theme: 'nakliye_theme',
  driverStatus: 'nakliye_driver_status',
} as const

const DRIVER_STATUS_OPTIONS: { id: DriverStatus; label: string; icon: typeof Compass; dot: string }[] = [
  { id: 'garajda', label: 'Garajda', icon: Compass, dot: 'bg-slate-400' },
  { id: 'yuk-ariyor', label: 'Yük Arıyor', icon: Radio, dot: 'bg-orange-500' },
  { id: 'yolda', label: 'Yolda', icon: Navigation, dot: 'bg-emerald-500' },
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
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [pazarCount, setPazarCount] = useState<number>(0)
  const [isCountLoading, setIsCountLoading] = useState(true)
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('yuk-ariyor')
  const [searchQuery, setSearchQuery] = useState('')

  const didInit = useRef(false)

  const fetchCounts = useCallback(async () => {
    setIsCountLoading(true)
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) {
        setPazarCount(count)
      } else {
        setPazarCount(0)
      }
    } catch {
      setPazarCount(0)
    } finally {
      setIsCountLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || didInit.current) return
    didInit.current = true

    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme)
    const shouldBeDark = storedTheme ? storedTheme === 'dark' : true
    document.documentElement.classList.toggle('dark', shouldBeDark)
    setIsDarkMode(shouldBeDark)

    const savedStatus = localStorage.getItem(STORAGE_KEYS.driverStatus)
    if (isDriverStatus(savedStatus)) setDriverStatus(savedStatus)

    fetchCounts()

    const channel = supabase
      .channel('public:listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      didInit.current = false
    }
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

  const updateDriverStatus = useCallback((status: DriverStatus) => {
    setDriverStatus(status)
    localStorage.setItem(STORAGE_KEYS.driverStatus, status)
  }, [])

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigateTo('pazar')
    }
  }

  const statusMeta = DRIVER_STATUS_OPTIONS.find(s => s.id === driverStatus)!

  return (
    <div
      suppressHydrationWarning
      className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased"
    >
      {toast && (
        <div
          role="status"
          className={cn(
            'fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl text-xs font-bold border',
            toast.type === 'error' ? 'bg-red-500 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-500'
          )}
        >
          {toast.type === 'error' ? <X className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 z-20 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {activeTab !== 'dashboard' ? (
            <Button variant="secondary" size="sm" onClick={() => navigateTo('dashboard')}>
              <ArrowLeft className="size-4 text-orange-500" />
              <span>Ana Sayfa</span>
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <Truck className="size-6" />
              </div>
              <div>
                <h1 className="font-black text-base tracking-tight leading-none text-white">NAKLİYE CEPTE</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn('size-2 rounded-full animate-pulse', statusMeta.dot)} />
                  <p className="text-[11px] font-bold text-slate-400 leading-none">{statusMeta.label}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white transition-colors"
            aria-label="Tema Değiştir"
          >
            {isDarkMode ? <Sun className="size-4 text-orange-400" /> : <Moon className="size-4" />}
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => navigateTo('profil')}
              className="relative flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 font-black text-xs border border-orange-500/30"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
            </button>
          ) : (
            <Button size="sm" onClick={() => openAuthModal()}>Giriş Yap</Button>
          )}
        </div>
      </header>

      {/* Main Container - Desktop Centered */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-4 pb-28 max-w-4xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-5">

            {/* 1. Sürücü Durum Seçici Header Bar */}
            <Card className="p-1.5 bg-slate-900/90 border-slate-800">
              <div className="grid grid-cols-3 gap-1">
                {DRIVER_STATUS_OPTIONS.map((st) => {
                  const Icon = st.icon
                  const isActive = driverStatus === st.id
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateDriverStatus(st.id)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer',
                        isActive
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* 2. Ana Arama & Filtreleme Kutusu */}
            <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-orange-500" />
                    <h2 className="text-sm font-black tracking-wide uppercase text-slate-200">Hızlı Yük & İlan Arama</h2>
                  </div>
                  <Badge tone="orange">Canlı Akış</Badge>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="İl, ilçe, dorse tipi veya yük detayına göre ara..."
                      className="pl-10 bg-slate-950/80 border-slate-800 h-11 text-sm"
                    />
                  </div>
                  <Button type="submit" size="lg" className="shrink-0">
                    <span>Arayın</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </form>

                {/* Popüler Filtre Etiketleri */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-thin">
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">Hızlı:</span>
                  {['Tüm Yükler', '13.60 Tente', 'Damperli', 'Frigo', 'Konteyner', 'Acil Yük'].map((tag, idx) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => navigateTo('pazar')}
                      className={cn(
                        'text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-orange-500/50 hover:text-orange-400 transition-colors whitespace-nowrap cursor-pointer',
                        idx === 0 && 'text-orange-400 border-orange-500/30'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* 3. Ana Aksiyon Kartları Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* İlan Pazarı Kartı */}
              <Card
                onClick={() => navigateTo('pazar')}
                className="p-5 border-slate-800 hover:border-orange-500/40 transition-all cursor-pointer group bg-slate-900/60 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div className="size-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Store className="size-6" />
                  </div>
                  <span className="text-2xl font-black font-mono text-white">
                    {isCountLoading ? '...' : pazarCount}
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    İlan Pazarı
                    <ArrowRight className="size-4 text-orange-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-xs text-slate-400">Aktif nakliye yüklerini ve boş araç ilanlarını inceleyin.</p>
                </div>
              </Card>

              {/* İlan Oluştur Kartı */}
              <Card
                onClick={() => navigateTo('ekle')}
                className="p-5 border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-900 hover:border-orange-500 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="size-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                    <PlusCircle className="size-6" />
                  </div>
                  <Badge tone="emerald">Anında Yayınla</Badge>
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Yük veya Araç İlanı Ver
                    <ArrowRight className="size-4 text-orange-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-xs text-slate-400">Yükünüzü veya boş aracınızı binlerce sürücüye anında duyurun.</p>
                </div>
              </Card>
            </div>

            {/* 4. İkincil Hızlı Erişim Kartları */}
            <div className="grid grid-cols-2 gap-3">
              <Card
                onClick={() => navigateTo('sizden-gelenler')}
                className="p-4 border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-center gap-3 bg-slate-900/40"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Sürücü İlanları</h4>
                  <p className="text-[10px] text-slate-400">Yoldaki araçlar</p>
                </div>
              </Card>

              <Card
                onClick={() => navigateTo('finans')}
                className="p-4 border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-center gap-3 bg-slate-900/40"
              >
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Finans & Cüzdan</h4>
                  <p className="text-[10px] text-slate-400">Gelir-Gider takibi</p>
                </div>
              </Card>
            </div>

            {/* Güvenlik Banner */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex items-center gap-3">
              <ShieldCheck className="size-8 text-orange-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Doğrulanmış Nakliye Ağı</h4>
                <p className="text-[11px] text-slate-400">Nakliye Cepte platformundaki tüm ilanlar topluluk ve sistem tarafından doğrulanır.</p>
              </div>
            </div>

          </div>
        )}

        {/* Dinamik Modül Alanı */}
        {activeTab === 'pazar' && <ListingsView />}
        {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('sizden-gelenler')} />}
        {activeTab === 'sizden-gelenler' && <UserListingsView />}
        {activeTab === 'ilanlarim' && <MyListingsView />}
        {activeTab === 'finans' && <FinanceView />}
        {activeTab === 'profil' && <ProfileView user={user} openAuthModal={openAuthModal} signOut={signOut} />}
      </main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-30 pb-safe">
        <div className="flex items-center justify-around max-w-4xl mx-auto px-2 h-16">
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
                  className="flex flex-col items-center justify-center -mt-6 focus:outline-none cursor-pointer group"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 group-active:scale-90 transition-transform">
                    <Icon className="size-7" />
                  </div>
                  <span className="text-[10px] font-black text-orange-500 mt-1">{item.title}</span>
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
                    ? 'text-orange-500 font-black'
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
          <div onClick={closeAuthModal} className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-slate-900 p-6 shadow-2xl border border-slate-800 z-10">
            <button
              onClick={closeAuthModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="size-5" />
            </button>

            <div className="text-center mb-5">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
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
}

function ProfileView({ user, openAuthModal, signOut }: ProfileViewProps) {
  if (!user) {
    return (
      <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center space-y-4 border-slate-800 bg-slate-900/50">
        <Truck className="size-10 text-orange-500" />
        <h3 className="text-sm font-black text-white">Profil Yönetimi</h3>
        <p className="text-xs text-slate-400">İlan vermek ve ilanlarınızı yönetmek için giriş yapın.</p>
        <Button onClick={() => openAuthModal()}>Giriş Yap / Kayıt Ol</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-white">Hesap Profiliniz</h2>
      <Card className="p-5 space-y-4 border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-orange-500/10 text-orange-400 font-black text-lg border border-orange-500/20 flex items-center justify-center">
            {(user.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">E-Posta Adresi</p>
            <p className="text-sm font-black text-white">{user.email}</p>
          </div>
        </div>
        <Button variant="danger" className="w-full" onClick={() => signOut()}>Oturumu Kapat</Button>
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
