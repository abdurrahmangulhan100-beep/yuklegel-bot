'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, LogIn, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Grid
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Dynamic Imports (Lazy Loading - Sadece tıklanınca yüklenir)
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), {
  loading: () => <ModuleLoader />,
})
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), {
  loading: () => <ModuleLoader />,
})
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), {
  loading: () => <ModuleLoader />,
})
const TachographCalculator = dynamic(() => import('@/components/tachograph-calculator').then(m => m.TachographCalculator), {
  loading: () => <ModuleLoader />,
})
const TripCalculator = dynamic(() => import('@/components/trip-calculator').then(m => m.TripCalculator), {
  loading: () => <ModuleLoader />,
})
const FuelCalculator = dynamic(() => import('@/components/fuel-calculator').then(m => m.FuelCalculator), {
  loading: () => <ModuleLoader />,
})
const NotesView = dynamic(() => import('@/components/notes-view').then(m => m.NotesView), {
  loading: () => <ModuleLoader />,
})

function ModuleLoader() {
  return (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        <Loader2 className="size-4 animate-spin text-blue-600" />
        <span>Modül Yükleniyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

interface GridCard {
  id: ModuleId
  title: string
  desc: string
  icon: React.ElementType
  color: string
  badge?: string
}

const DASHBOARD_CARDS: GridCard[] = [
  { id: 'pazar', title: 'İlan Pazarı', desc: 'Canlı yük ve araç ilanları', icon: Store, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50', badge: 'Canlı' },
  { id: 'takograf', title: 'Takograf Asistanı', desc: 'Yasal sürüş ve mola süreleri', icon: Timer, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', badge: 'Yasal' },
  { id: 'finans', title: 'Gider & Kazanç', desc: 'Navlun ve sefer masrafları', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' },
  { id: 'sefer', title: 'Sefer Maliyeti', desc: 'Net kâr ve gider hesabı', icon: Calculator, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50' },
  { id: 'yakit', title: 'Hızlı Yakıt', desc: 'Mesafe ve lt/km hesaplama', icon: Fuel, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' },
  { id: 'notlar', title: 'Pratik Notlar', desc: 'Bakım, evrak ve hatırlatıcılar', icon: NotebookPen, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' },
  { id: 'ekle', title: 'İlan Ekle', desc: 'Hızlı yük/araç ilanı oluştur', icon: PlusCircle, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50' },
]

function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as ModuleId) || 'dashboard'

  const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true)
    }
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const navigateTo = (tab: ModuleId) => {
    if (tab === 'dashboard') {
      router.push('/', { scroll: false })
    } else {
      router.push(`?tab=${tab}`, { scroll: false })
    }
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setToast({ type: 'success', text: 'Giriş başarılı!' })
        closeAuthModal()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setToast({ type: 'success', text: 'Kayıt başarılı! Giriş yapabilirsiniz.' })
        setAuthMode('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      setToast({ type: 'error', text: error.message || 'Hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* TOAST BİLDİRİMİ */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-lg text-xs font-bold transition-opacity duration-150",
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        )}>
          {toast.type === 'error' ? <X className="size-4"/> : <Sparkles className="size-4"/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Truck className="size-6"/>
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-zinc-900 dark:text-white">Nakliye Cepte</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Sürücü & Lojistik Paneli</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => navigateTo('dashboard')}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                activeTab === 'dashboard' 
                  ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400" 
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Grid className="size-4"/>
              <span>Ana Panel (Grid)</span>
            </button>

            <div className="my-2 border-t border-zinc-100 dark:border-zinc-800"/>

            {DASHBOARD_CARDS.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                    isActive 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4"/>
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:text-blue-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* MASAÜSTÜ KULLANICI / TEMA BAR */}
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {user ? (
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-2.5">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold truncate">{user.email?.split('@')[0]}</span>
              </div>
              <button onClick={() => signOut()} className="p-1 text-zinc-400 hover:text-rose-500">
                <LogOut className="size-4"/>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <LogIn className="size-4"/>
              <span>Giriş Yap / Kayıt Ol</span>
            </button>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-zinc-400">Karanlık Mod</span>
            <button onClick={toggleTheme} className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {isDarkMode ? <Sun className="size-3.5"/> : <Moon className="size-3.5"/>}
            </button>
          </div>
        </div>
      </aside>

      {/* İÇERİK ALANI */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' ? (
              <button
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="size-4 text-blue-600 dark:text-blue-400" />
                <span>Ana Menü</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden">
                  <Truck className="size-5"/>
                </div>
                <span className="font-black text-sm tracking-tight lg:hidden">Nakliye Cepte</span>
                <span className="hidden lg:inline text-xs font-bold text-zinc-400">Hoş Geldiniz 👋</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 lg:hidden">
              {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
            </button>
            {activeTab !== 'ekle' && (
              <button 
                onClick={() => navigateTo('ekle')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10"
              >
                <PlusCircle className="size-4"/>
                <span className="hidden sm:inline">İlan Ekle</span>
              </button>
            )}
          </div>
        </header>

        {/* GÖVDE (MAIN) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          <div className="mx-auto max-w-5xl">
            
            {/* 1. EKRAN: DASHBOARD GRID (ANAMENÜ KARE KARTLARI) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Hızlı Modüller</h1>
                  <p className="text-xs text-zinc-500">İşlem yapmak istediğiniz aracı seçin.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DASHBOARD_CARDS.map((card) => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.id}
                        onClick={() => navigateTo(card.id)}
                        className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-left transition-all duration-150 hover:border-blue-500/50 hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("flex size-11 items-center justify-center rounded-xl border", card.color)}>
                            <Icon className="size-5"/>
                          </div>
                          {card.badge && (
                            <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:text-blue-400">
                              {card.badge}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {card.title}
                            </h2>
                            <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-500 line-clamp-1">{card.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. EKRAN: DİNAMİK MODÜLLER (LAZY-LOADED) */}
            <div className="transition-opacity duration-150">
              {activeTab === 'pazar' && <ListingsView />}
              {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('pazar')} />}
              {activeTab === 'finans' && <FinanceView />}
              {activeTab === 'takograf' && <TachographCalculator />}
              {activeTab === 'sefer' && <TripCalculator />}
              {activeTab === 'yakit' && <FuelCalculator />}
              {activeTab === 'notlar' && <NotesView />}
            </div>

          </div>
        </main>

        {/* MOBIL BOTTOM BAR */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 lg:hidden">
          <button 
            onClick={() => navigateTo('dashboard')} 
            className={cn("flex flex-col items-center gap-1 text-[10px] font-bold transition-colors", activeTab === 'dashboard' ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")}
          >
            <Grid className="size-5"/>
            <span>Ana Menü</span>
          </button>

          <button 
            onClick={() => navigateTo('pazar')} 
            className={cn("flex flex-col items-center gap-1 text-[10px] font-bold transition-colors", activeTab === 'pazar' ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")}
          >
            <Store className="size-5"/>
            <span>Pazar</span>
          </button>

          <button 
            onClick={() => navigateTo('ekle')} 
            className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md active:scale-95 transition-all"
          >
            <PlusCircle className="size-5"/>
          </button>

          <button 
            onClick={() => navigateTo('takograf')} 
            className={cn("flex flex-col items-center gap-1 text-[10px] font-bold transition-colors", activeTab === 'takograf' ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")}
          >
            <Timer className="size-5"/>
            <span>Takograf</span>
          </button>

          <button 
            onClick={() => navigateTo('finans')} 
            className={cn("flex flex-col items-center gap-1 text-[10px] font-bold transition-colors", activeTab === 'finans' ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")}
          >
            <Wallet className="size-5"/>
            <span>Finans</span>
          </button>
        </nav>
      </div>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="size-4"/>
            </button>
            <h3 className="text-base font-black text-center mb-4 text-zinc-900 dark:text-white">
              {authMode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </h3>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="E-Posta Adresi" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Şifre" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-blue-500" 
              />
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                {loading ? <Loader2 className="size-4 animate-spin mx-auto"/> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-zinc-500">
              {authMode === 'login' ? (
                <p>Hesabınız yok mu? <button onClick={() => setAuthMode('register')} className="text-blue-600 font-bold underline">Kayıt Ol</button></p>
              ) : (
                <p>Zaten hesabınız var mı? <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold underline">Giriş Yap</button></p>
              )}
            </div>
          </div>
        </div>
      )}

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
