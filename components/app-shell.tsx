'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, LogIn, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Pin, Play, Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Modules (Sadece tıklandığında yüklenir)
const ListingsView = dynamic(() => import('@/components/listings/listings-view').then(m => m.ListingsView), { loading: () => <ModuleLoader /> })
const AddListingForm = dynamic(() => import('@/components/add-listing-form').then(m => m.AddListingForm), { loading: () => <ModuleLoader /> })
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
        <span>Modül Hazırlanıyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

interface CardItem {
  id: ModuleId
  title: string
  desc: string
  icon: React.ElementType
  color: string
  badge?: string
  widgetValue: string
  widgetSubText: string
  quickAction?: boolean
}

const INITIAL_CARDS: CardItem[] = [
  { 
    id: 'pazar', 
    title: 'İlan Pazarı', 
    desc: 'Canlı yük ve araç ilanları', 
    icon: Store, 
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50', 
    badge: 'Canlı',
    widgetValue: '+18 Yeni Yük',
    widgetSubText: 'Konya: 4 Yük Bekliyor'
  },
  { 
    id: 'takograf', 
    title: 'Takograf Asistanı', 
    desc: 'Yasal sürüş ve mola süreleri', 
    icon: Timer, 
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', 
    badge: 'Yasal',
    widgetValue: '04:30 / 09:00',
    widgetSubText: 'Kalan Sürüş: 04:30 Sa',
    quickAction: true
  },
  { 
    id: 'finans', 
    title: 'Gider & Kazanç', 
    desc: 'Navlun ve sefer masrafları', 
    icon: Wallet, 
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
    widgetValue: '₺42.500',
    widgetSubText: 'Bu Ay Net Kâr'
  },
  { 
    id: 'sefer', 
    title: 'Sefer Maliyeti', 
    desc: 'Net kâr ve gider hesabı', 
    icon: Calculator, 
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
    widgetValue: '%32 Ort. Kâr',
    widgetSubText: 'Son Sefer: Konya - Adana'
  },
  { 
    id: 'yakit', 
    title: 'Hızlı Yakıt', 
    desc: 'Mesafe ve lt/km hesaplama', 
    icon: Fuel, 
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
    widgetValue: '43.50 TL/Lt',
    widgetSubText: 'Güncel Mazot Fiyatı'
  },
  { 
    id: 'notlar', 
    title: 'Pratik Notlar', 
    desc: 'Bakım, evrak ve hatırlatıcılar', 
    icon: NotebookPen, 
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
    widgetValue: '2 Uyarı',
    widgetSubText: 'Muayene Yaklaşıyor'
  },
  { 
    id: 'ekle', 
    title: 'İlan Ekle', 
    desc: 'Hızlı yük/araç ilanı oluştur', 
    icon: PlusCircle, 
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/50',
    widgetValue: 'Hızlı İlan',
    widgetSubText: 'Anında Yayınla'
  },
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

  // Pinli Kartlar State'i
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [isDriving, setIsDriving] = useState(false)

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true)
    const savedPins = localStorage.getItem('nakliye_pinned_cards')
    if (savedPins) {
      try { setPinnedIds(JSON.parse(savedPins)) } catch {}
    }
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

  // Pinlenmiş kartları en üste sırala
  const sortedCards = [...INITIAL_CARDS].sort((a, b) => {
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
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Canlı Kokpit</p>
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
              <span>Ana Menü (Grid)</span>
            </button>
            <div className="my-2 border-t border-zinc-100 dark:border-zinc-800"/>
            {INITIAL_CARDS.map((item) => (
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
            <button onClick={toggleTheme} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
            </button>
          </div>
        </header>

        {/* GÖVDE (MAIN) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            
            {/* CANLI SMART GRID (ANA MENÜ) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Canlı Modül Paneli</h1>
                    <p className="text-xs text-zinc-500">Sık kullandığınız modülleri üst sıraya pinleyebilirsiniz.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  {sortedCards.map((card) => {
                    const Icon = card.icon
                    const isPinned = pinnedIds.includes(card.id)
                    return (
                      <div
                        key={card.id}
                        onClick={() => navigateTo(card.id)}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-zinc-900 p-4 text-left transition-all duration-150 cursor-pointer hover:border-blue-500/50 hover:shadow-md active:scale-[0.98]",
                          isPinned ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/5" : "border-zinc-200/80 dark:border-zinc-800"
                        )}
                      >
                        {/* ÜST BİLGİ & PIN */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("flex size-10 items-center justify-center rounded-xl border", card.color)}>
                            <Icon className="size-5"/>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {card.badge && (
                              <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:text-blue-400">
                                {card.badge}
                              </span>
                            )}
                            <button
                              onClick={(e) => togglePin(e, card.id)}
                              className={cn(
                                "p-1 rounded-lg transition-colors",
                                isPinned ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50" : "text-zinc-300 hover:text-zinc-500 dark:text-zinc-600"
                              )}
                              title={isPinned ? "Sabitlemeyi Kaldır" : "En Üste Sabitle"}
                            >
                              <Pin className="size-3.5 fill-current"/>
                            </button>
                          </div>
                        </div>

                        {/* WIDGET CANLI VERİ KUTUSU */}
                        <div className="my-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-2.5 border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-zinc-900 dark:text-white">{card.widgetValue}</span>
                            {card.quickAction && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsDriving(!isDriving)
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white transition-all",
                                  isDriving ? "bg-rose-600" : "bg-emerald-600"
                                )}
                              >
                                {isDriving ? <Pause className="size-3"/> : <Play className="size-3"/>}
                                <span>{isDriving ? 'Mola' : 'Sürüş'}</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">{card.widgetSubText}</p>
                        </div>

                        {/* KART BAŞLIĞI */}
                        <div className="mt-1">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-extrabold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {card.title}
                            </h2>
                            <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[10px] text-zinc-400 line-clamp-1">{card.desc}</p>
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
              {activeTab === 'ekle' && <AddListingForm onCreated={() => navigateTo('pazar')} />}
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
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs" 
              />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Şifre" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs" 
              />
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">
                {loading ? <Loader2 className="size-4 animate-spin mx-auto"/> : 'Devam Et'}
              </button>
            </form>
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
