'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Pin, UserCheck, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Modules (Kod bölme - Performans için)
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { loading: () => <ModuleLoader /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { loading: () => <ModuleLoader /> })
const MyListingsView = dynamic(() => import('@/components/my-listings-view').then(m => m.MyListingsView), { loading: () => <ModuleLoader /> })
const UserListingsView = dynamic(() => import('@/components/user-listings-view').then(m => m.UserListingsView), { loading: () => <ModuleLoader /> })
const FinanceView = dynamic(() => import('@/components/finance-view').then(m => m.FinanceView), { loading: () => <ModuleLoader /> })
const TachographCalculator = dynamic(() => import('@/components/tachograph-calculator').then(m => m.TachographCalculator), { loading: () => <ModuleLoader /> })
const TripCalculator = dynamic(() => import('@/components/trip-calculator').then(m => m.TripCalculator), { loading: () => <ModuleLoader /> })
const FuelCalculator = dynamic(() => import('@/components/fuel-calculator').then(m => m.FuelCalculator), { loading: () => <ModuleLoader /> })
const NotesView = dynamic(() => import('@/components/notes-view').then(m => m.NotesView), { loading: () => <ModuleLoader /> })

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

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

interface CardItem {
  id: ModuleId
  title: string
  desc: string
  icon: React.ElementType
  color: string
}

const MODULE_CARDS: CardItem[] = [
  { id: 'pazar', title: 'İlan Pazarı', desc: 'Canlı yük ve araç ilanları', icon: Store, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' },
  { id: 'sizden-gelenler', title: 'Sizden Gelen İlanlar', desc: 'Kullanıcıların eklediği güncel ilanlar', icon: Users, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50' },
  { id: 'ilanlarim', title: 'İlanlarım', desc: 'Eklediğiniz ilanları yönetin', icon: UserCheck, color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/50' },
  { id: 'takograf', title: 'Takograf Asistanı', desc: 'Yasal sürüş ve mola süreleri', icon: Timer, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' },
  { id: 'finans', title: 'Gider & Kazanç', desc: 'Navlun ve sefer masrafları', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' },
  { id: 'sefer', title: 'Sefer Maliyeti', desc: 'Net kâr ve gider hesabı', icon: Calculator, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50' },
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

  // Gerçek Veri State'i
  const [listingCount, setListingCount] = useState<number | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true)
    const savedPins = localStorage.getItem('nakliye_pinned_cards')
    if (savedPins) {
      try { setPinnedIds(JSON.parse(savedPins)) } catch {}
    }

    fetchListingCount()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchListingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_listings')
        .select('*', { count: 'exact', head: true })

      if (!error && count !== null) {
        setListingCount(count)
      }
    } catch (err) {
      console.error("İlan sayısı çekilemedi:", err)
    }
  }

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    let updated: string[]
    if (pinnedIds.includes(id)) {
      updated = pinnedIds.filter(item => item !== id)
    } else {
      updated = [...pinnedIds, id]
    }
    setPinnedIds(updated)
    localStorage.setItem('nakliye_pinned_cards', JSON.stringify(updated))
  }

  const navigateTo = (tab: ModuleId) => {
    if (tab === 'dashboard') router.push('/', { scroll: false })
    else router.push(`?tab=${tab}`, { scroll: false })
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
        setToast({ type: 'success', text: 'Kayıt başarılı!' })
        setAuthMode('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      setToast({ type: 'error', text: error.message || 'Hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  const sortedCards = [...MODULE_CARDS].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id)
    const bPinned = pinnedIds.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

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

      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Truck className="size-6"/>
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-zinc-900 dark:text-white">Nakliye Cepte</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Lojistik Paneli</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => navigateTo('dashboard')}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                activeTab === 'dashboard' ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Truck className="size-4"/>
              <span>Ana Menü</span>
            </button>
            <div className="my-2 border-t border-zinc-100 dark:border-zinc-800"/>
            {MODULE_CARDS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                  activeTab === item.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="size-4"/>
                  <span>{item.title}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {user ? (
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-2.5 text-xs font-bold">
              <span className="truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
              <button onClick={() => signOut()} className="text-zinc-400 hover:text-rose-500"><LogOut className="size-4"/></button>
            </div>
          ) : (
            <button onClick={() => openAuthModal()} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors">Giriş Yap</button>
          )}
        </div>
      </aside>

      {/* İÇERİK ALANI */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' ? (
              <button
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="size-4 text-blue-600 dark:text-blue-400" />
                <span>← Ana Menüye Dön</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden">
                  <Truck className="size-5"/>
                </div>
                <span className="font-black text-sm tracking-tight lg:hidden">Nakliye Cepte</span>
                <span className="hidden lg:inline text-xs font-bold text-zinc-400">Yolun Açık Olsun 🚛</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button onClick={() => signOut()} className="lg:hidden p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors">
                <LogOut className="size-4"/>
              </button>
            ) : (
              <button onClick={() => openAuthModal()} className="lg:hidden rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors">
                Giriş
              </button>
            )}

            <button onClick={toggleTheme} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
            </button>
          </div>
        </header>

        {/* GÖVDE (MAIN GRID) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Hızlı Modüller</h1>
                  <p className="text-xs text-zinc-500">Sık kullandığınız modülleri iğneleyerek en üste taşıyabilirsiniz.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  {sortedCards.map((card) => {
                    const Icon = card.icon
                    const isPinned = pinnedIds.includes(card.id)
                    const isPazar = card.id === 'pazar'

                    return (
                      <div
                        key={card.id}
                        onClick={() => navigateTo(card.id)}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-zinc-900 p-4 text-left transition-all duration-150 cursor-pointer hover:border-blue-500/50 hover:shadow-md active:scale-[0.98]",
                          isPinned ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/5 shadow-xs" : "border-zinc-200/80 dark:border-zinc-800"
                        )}
                      >
                        {/* KART ÜST KISIM */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("flex size-11 items-center justify-center rounded-xl border", card.color)}>
                            <Icon className="size-5"/>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {isPazar && (
                              <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40 px-2 py-0.5 text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                                </span>
                                {listingCount !== null ? (
                                  <span>{listingCount} Canlı İlan</span>
                                ) : (
                                  <Loader2 className="size-3 animate-spin text-blue-600 dark:text-blue-400"/>
                                )}
                              </span>
                            )}

                            {/* İĞNELEME (PIN) BUTONU */}
                            <button
                              onClick={(e) => togglePin(e, card.id)}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                isPinned 
                                  ? "text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40" 
                                  : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              )}
                              title={isPinned ? "Sabitlemeyi Kaldır" : "En Üste Sabitle"}
                            >
                              <Pin className={cn("size-3.5", isPinned && "fill-current")}/>
                            </button>
                          </div>
                        </div>

                        {/* KART BAŞLIK & AÇIKLAMA */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-extrabold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {card.title}
                            </h2>
                            <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                            {isPazar && listingCount !== null ? `Şu an yayında ${listingCount} aktif yük var` : card.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* DİNAMİK MODÜLLER */}
            <div className="transition-opacity duration-150">
              {activeTab === 'pazar' && <ListingsView />}
              {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('sizden-gelenler')} />}
              {activeTab === 'sizden-gelenler' && <UserListingsView />}
              {activeTab === 'ilanlarim' && <MyListingsView />}
              {activeTab === 'finans' && <FinanceView />}
              {activeTab === 'takograf' && <TachographCalculator />}
              {activeTab === 'sefer' && <TripCalculator />}
              {activeTab === 'yakit' && <FuelCalculator />}
              {activeTab === 'notlar' && <NotesView />}
            </div>

          </div>
        </main>
      </div>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-200">
              <X className="size-4"/>
            </button>
            <h3 className="text-base font-black text-center mb-4">
              {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </h3>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="E-Posta" 
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
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors">
                {loading ? <Loader2 className="size-4 animate-spin mx-auto"/> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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

export function AppShell() {
  return (
    <Suspense fallback={<ModuleLoader />}>
      <AppShellContent />
    </Suspense>
  )
}
