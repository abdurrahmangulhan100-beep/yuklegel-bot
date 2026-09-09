'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  Truck, Store, PlusCircle, Wallet, X, Loader2,
  ArrowLeft, CheckCircle2, ShieldCheck,
  Users, ArrowRight,
  Calculator, Gauge, Fuel, StickyNote, FileText,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Dinamik Yüklemeler (Lazy Load)
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { ssr: false, loading: () => <ModuleLoader title="İlan Pazarı" /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { ssr: false, loading: () => <ModuleLoader title="İlan Formu" /> })
const MyListingsView = dynamic(() => import('@/components/my-listings-view').then(m => m.MyListingsView), { ssr: false, loading: () => <ModuleLoader title="İlanlarım" /> })
const UserListingsView = dynamic(() => import('@/components/user-listings-view').then(m => m.UserListingsView), { ssr: false, loading: () => <ModuleLoader title="Sürücüler" /> })
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), { ssr: false, loading: () => <ModuleLoader title="Finans" /> })
const FuelCalculator = dynamic(() => import('@/components/fuel-calculator').then(m => m.FuelCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Mazot Hesabı" /> })
const TachographCalculator = dynamic(() => import('@/components/tachograph-calculator').then(m => m.TachographCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Takograf" /> })
const TripCalculator = dynamic(() => import('@/components/trip-calculator').then(m => m.TripCalculator || m.default), { ssr: false, loading: () => <ModuleLoader title="Sefer Hesabı" /> })
const NotesView = dynamic(() => import('@/components/notes-view').then(m => m.NotesView || m.default), { ssr: false, loading: () => <ModuleLoader title="Notlar" /> })

function ModuleLoader({ title }: { title?: string }) {
  return (
    <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60">
      <div className="flex flex-col items-center gap-2 text-xs font-bold text-slate-500">
        <Loader2 className="size-6 animate-spin text-blue-600" />
        <span>{title ? `${title} Yükleniyor...` : 'Yükleniyor...'}</span>
      </div>
    </div>
  )
}

function Card({ className, children, hoverEffect = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { hoverEffect?: boolean }) {
  return (
    <div 
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 transform-gpu", 
        hoverEffect && "hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 cursor-pointer active:scale-[0.99]",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

function Button({ className, variant = 'primary', size = 'md', children, ...props }: any) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all transform-gpu active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    outline: "border border-slate-200 hover:bg-slate-50 text-slate-700",
    danger: "bg-rose-50 hover:bg-rose-100 text-rose-600"
  }
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-sm"
  }
  return (
    <button className={cn(base, variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props}>
      {children}
    </button>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all",
        className
      )}
      {...props}
    />
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'araclar' | 'finans' | 'notlar' | 'profil'
const VALID_TABS: ModuleId[] = ['dashboard', 'pazar', 'ekle', 'ilanlarim', 'sizden-gelenler', 'araclar', 'finans', 'notlar', 'profil']

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

  const [pazarCount, setPazarCount] = useState<number>(0)
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

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-50/80 text-slate-900 font-sans antialiased selection:bg-blue-100">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all transform-gpu">
          <div className={cn(
            'flex items-center gap-2.5 rounded-full px-5 py-3 shadow-lg text-sm font-bold border',
            toast.type === 'error' ? 'bg-white border-rose-200 text-rose-600' : 'bg-white border-emerald-200 text-emerald-600'
          )}>
            {toast.type === 'error' ? <X className="size-5" /> : <CheckCircle2 className="size-5" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Modern Üst Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 xl:px-8 z-20 w-full">
        <div className="flex items-center gap-3">
          {activeTab !== 'dashboard' ? (
            <button 
              onClick={() => navigateTo('dashboard')}
              className="flex items-center justify-center size-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('dashboard')}>
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  NAKLİYE CEPTE
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">PRO</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">Dijital Lojistik Ağı</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => navigateTo('profil')}
              className="relative flex size-10 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-black text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {(user.email?.[0] ?? '?').toUpperCase()}
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-white" />
            </button>
          ) : (
            <Button size="sm" onClick={() => openAuthModal()}>Giriş Yap</Button>
          )}
        </div>
      </header>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 overflow-y-auto scrollbar-none p-4 md:p-6 lg:p-8 pb-28 max-w-7xl w-full mx-auto space-y-6">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Üst Banner / Hoş Geldiniz Bilgisi */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm">
              <div>
                <h2 className="text-lg font-black tracking-tight">Lojistik Operasyon Merkezi</h2>
                <p className="text-xs text-blue-100 mt-1">Anlık yük akışı, canlı navlun fiyatları ve sürücü araçları tek panelde.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                {pazarCount > 0 ? `${pazarCount} İlan Yayında` : 'Canlı Veri Aktif'}
              </div>
            </div>

            {/* 4'lü Ana Menü Grid'i */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <Card hoverEffect className="p-5 flex flex-col justify-between" onClick={() => navigateTo('pazar')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                      <Store className="size-6" />
                    </div>
                    <ArrowRight className="size-4 text-slate-300" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">İlan Pazarı</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Güncel navlun ve boş araç ilanlarını inceleyin, doğrudan yük verenle eşleşin.</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm font-bold text-blue-600">
                  İlanlara Git <ChevronRight className="size-4 ml-1" />
                </div>
              </Card>

              <Card hoverEffect className="p-5 flex flex-col justify-between" onClick={() => navigateTo('araclar')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600">
                      <Calculator className="size-6" />
                    </div>
                    <ArrowRight className="size-4 text-slate-300" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Araç Kutusu</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Mazot tüketimi, takograf sürüş süreleri ve sefer maliyet hesabı yapın.</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm font-bold text-indigo-600">
                  Hesapla <ChevronRight className="size-4 ml-1" />
                </div>
              </Card>

              <Card hoverEffect className="p-5 flex flex-col justify-between" onClick={() => navigateTo('finans')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                      <Wallet className="size-6" />
                    </div>
                    <ArrowRight className="size-4 text-slate-300" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Finans Yönetimi</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Kazançlarınızı, harcamalarınızı ve mazot fişlerinizi dijital cüzdanda tutun.</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm font-bold text-emerald-600">
                  Cüzdanı Aç <ChevronRight className="size-4 ml-1" />
                </div>
              </Card>

              <Card hoverEffect className="p-5 flex flex-col justify-between" onClick={() => navigateTo('notlar')}>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                      <Users className="size-6" />
                    </div>
                    <ArrowRight className="size-4 text-slate-300" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">Notlar & Topluluk</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Yol notlarınızı kaydedin ve diğer sürücülerin paylaşımlarını görün.</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center text-sm font-bold text-purple-600">
                  Notlara Bak <ChevronRight className="size-4 ml-1" />
                </div>
              </Card>

            </div>

            {/* Güvenlik Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-4 shadow-xs">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Güvenli Lojistik Doğrulaması</h4>
                <p className="text-xs text-slate-500 mt-0.5">Tüm navlun ve yük ilanlarında doğrudan yük veren ve sürücü telefonları doğrulanmaktadır.</p>
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

        {/* Araç Kutusu */}
        {activeTab === 'araclar' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Calculator className="size-5 text-indigo-600" />
              Hesaplama Araçları
            </h2>
            <Card className="p-2">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fuel', icon: Fuel, label: 'Mazot', color: 'text-blue-600' },
                  { id: 'tacho', icon: Gauge, label: 'Takograf', color: 'text-indigo-600' },
                  { id: 'trip', icon: Calculator, label: 'Sefer', color: 'text-emerald-600' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveToolTab(tab.id as any)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer transform-gpu',
                      activeToolTab === tab.id 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <tab.icon className={cn("size-4", activeToolTab !== tab.id && tab.color)} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </Card>
            <div>
              {activeToolTab === 'fuel' && <FuelCalculator />}
              {activeToolTab === 'tacho' && <TachographCalculator />}
              {activeToolTab === 'trip' && <TripCalculator />}
            </div>
          </div>
        )}

        {activeTab === 'profil' && <ProfileView user={user} openAuthModal={openAuthModal} signOut={signOut} navigateTo={navigateTo} />}
      </main>

      {/* Sabit Alt Navigasyon Barı */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-30 pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto px-2 h-16">
          {[
            { id: 'dashboard', title: 'Ana Sayfa', icon: Truck },
            { id: 'pazar', title: 'İlanlar', icon: Store },
            { id: 'ekle', title: 'İlan Ver', icon: PlusCircle, highlight: true },
            { id: 'araclar', title: 'Araçlar', icon: Calculator },
            { id: 'finans', title: 'Cüzdan', icon: Wallet },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            if (item.highlight) {
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id as ModuleId)}
                  className="flex flex-col items-center justify-center -mt-6 focus:outline-none group transform-gpu"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 group-active:scale-95 transition-all border-4 border-white">
                    <Icon className="size-6" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 mt-1">{item.title}</span>
                </button>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as ModuleId)}
                className={cn(
                  'flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all transform-gpu',
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <div className={cn("p-1 rounded-full transition-all", isActive && "bg-blue-50")}>
                  <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
                </div>
                <span className={cn("text-[10px] font-medium mt-0.5", isActive && "font-bold")}>{item.title}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl z-10 transform-gpu">
            <button onClick={closeAuthModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full p-1 transition-colors">
              <X className="size-4" />
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Truck className="size-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
              <p className="text-xs text-slate-500 mt-1">Sisteme devam etmek için bilgilerinizi girin</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta adresiniz" />
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifreniz" />
              <Button type="submit" disabled={loading} className="w-full h-12 text-base">
                {loading ? <Loader2 className="size-5 animate-spin" /> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
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

function ProfileView({ user, openAuthModal, signOut, navigateTo }: { user: any, openAuthModal: () => void, signOut: () => void, navigateTo: (tab: ModuleId) => void }) {
  if (!user) {
    return (
      <Card className="flex flex-col items-center justify-center p-10 text-center space-y-4 border-dashed bg-white">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600">
          <Truck className="size-10" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900">Profil Yönetimi</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-[250px]">İlan vermek ve kayıtlı verilerinize ulaşmak için oturum açın.</p>
        </div>
        <Button onClick={() => openAuthModal()} className="mt-2">Giriş Yap / Kayıt Ol</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">Hesabım</h2>
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-14 rounded-full bg-slate-100 text-slate-700 font-black text-xl border-2 border-white shadow-sm flex items-center justify-center">
            {(user.email?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktif Kullanıcı</p>
            <p className="text-sm font-black text-slate-900">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-start h-12" onClick={() => navigateTo('ilanlarim')}>
            <FileText className="size-5 text-blue-600" />
            <span className="ml-1 text-sm">Verdiğim İlanları Yönet</span>
          </Button>
          <Button variant="secondary" className="w-full justify-start h-12" onClick={() => navigateTo('notlar')}>
            <StickyNote className="size-5 text-purple-600" />
            <span className="ml-1 text-sm">Sefer Notlarım</span>
          </Button>
          <div className="pt-3 mt-3 border-t border-slate-100">
            <Button variant="danger" className="w-full h-12" onClick={() => signOut()}>
              Oturumu Kapat
            </Button>
          </div>
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
