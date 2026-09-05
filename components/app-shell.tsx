'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Pin, UserCheck, 
  Users, Mail, Lock, KeyRound, ShieldCheck, User, CreditCard, Search, Bell, 
  TrendingUp, Navigation, AlertCircle, Wrench, ArrowUpRight, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Modülleri
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

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar' | 'profil'
type AuthMode = 'login' | 'register' | 'forgot'

interface CardItem {
  id: ModuleId
  title: string
  desc: string
  icon: React.ElementType
  color: string
  badge?: string
}

const MODULE_CARDS: CardItem[] = [
  { id: 'pazar', title: 'İlan Pazarı', desc: 'Canlı yük ve araç ilanları', icon: Store, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40', badge: 'Canlı' },
  { id: 'sizden-gelenler', title: 'Sizden Gelenler', desc: 'Topluluk ilanları', icon: Users, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40' },
  { id: 'ilanlarim', title: 'İlanlarım', desc: 'Eklediğiniz ilanları yönetin', icon: UserCheck, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-100 dark:border-teal-900/40' },
  { id: 'finans', title: 'Gider & Kazanç', desc: 'Navlun ve sefer masrafları', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40' },
  { id: 'sefer', title: 'Sefer Maliyeti', desc: 'Net kâr ve gider hesabı', icon: Calculator, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900/40' },
  { id: 'notlar', title: 'Pratik Notlar', desc: 'Bakım ve evrak takibi', icon: NotebookPen, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/40' },
]

function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as ModuleId) || 'dashboard'

  const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Quick Fuel State
  const [quickKm, setQuickKm] = useState('')
  const [quickAvg, setQuickAvg] = useState('')
  const [quickPrice, setQuickPrice] = useState('')
  const [quickResult, setQuickResult] = useState<number | null>(null)

  // Counters
  const [pazarCount, setPazarCount] = useState<number | null>(null)
  const [userListingCount, setUserListingCount] = useState<number | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true)
    const savedPins = localStorage.getItem('nakliye_pinned_cards')
    if (savedPins) {
      try { setPinnedIds(JSON.parse(savedPins)) } catch {}
    }
    fetchListingCounts()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const fetchListingCounts = async () => {
    setLoadingCounts(true)
    try {
      const [pazarRes, userRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('user_listings').select('*', { count: 'exact', head: true })
      ])
      if (!pazarRes.error && pazarRes.count !== null) setPazarCount(pazarRes.count)
      if (!userRes.error && userRes.count !== null) setUserListingCount(userRes.count)
    } catch (err) {
      console.error("Sayılar çekilemedi:", err)
    } finally {
      setLoadingCounts(false)
    }
  }

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = pinnedIds.includes(id) 
      ? pinnedIds.filter(item => item !== id)
      : [...pinnedIds, id]
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

  const handleQuickFuelCalc = (e: React.FormEvent) => {
    e.preventDefault()
    const km = parseFloat(quickKm)
    const avg = parseFloat(quickAvg)
    const price = parseFloat(quickPrice)
    if (km && avg && price) {
      const totalLt = (km * avg) / 100
      setQuickResult(totalLt * price)
    }
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
      } else if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setToast({ type: 'success', text: 'Kayıt başarılı! Lütfen e-postanızı onaylayın.' })
        setAuthMode('login')
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setToast({ type: 'success', text: 'Sıfırlama bağlantısı gönderildi.' })
        setAuthMode('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      setToast({ type: 'error', text: error.message || 'Bir hata oluştu' })
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
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      
      {/* TOAST */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-xl text-xs font-bold transition-all",
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        )}>
          {toast.type === 'error' ? <X className="size-4"/> : <Sparkles className="size-4"/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* SOL SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-20">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <Truck className="size-5"/>
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-zinc-900 dark:text-white leading-tight">Nakliye Cepte</p>
              <p className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Lojistik Paneli</p>
            </div>
          </div>

          {/* Ana İlan Ekle Butonu */}
          <button
            type="button"
            onClick={() => navigateTo('ekle')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="size-4" />
            <span>Hızlı İlan Ekle</span>
          </button>

          {/* Navigasyon Grupları */}
          <nav className="space-y-5">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                activeTab === 'dashboard' 
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold" 
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              )}
            >
              <Truck className="size-4"/>
              <span>Genel Bakış</span>
            </button>

            {/* Grup 1 */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Pazar & İlanlar</p>
              {[
                { id: 'pazar', title: 'İlan Pazarı', icon: Store },
                { id: 'sizden-gelenler', title: 'Sizden Gelenler', icon: Users },
                { id: 'ilanlarim', title: 'İlanlarım', icon: UserCheck },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id as ModuleId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                    activeTab === item.id 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <item.icon className="size-4"/>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            {/* Grup 2 */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Sürücü Araçları</p>
              {[
                { id: 'takograf', title: 'Takograf Asistanı', icon: Timer },
                { id: 'sefer', title: 'Sefer Maliyeti', icon: Calculator },
                { id: 'yakit', title: 'Hızlı Yakıt', icon: Fuel },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id as ModuleId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                    activeTab === item.id 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <item.icon className="size-4"/>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            {/* Grup 3 */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Yönetim</p>
              {[
                { id: 'finans', title: 'Gider & Kazanç', icon: Wallet },
                { id: 'notlar', title: 'Pratik Notlar', icon: NotebookPen },
                { id: 'profil', title: 'Profil & Abonelik', icon: User },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id as ModuleId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                    activeTab === item.id 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  <item.icon className="size-4"/>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Profil & Footer */}
        <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-2.5 text-xs font-bold">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="size-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <span className="truncate max-w-[110px] text-zinc-800 dark:text-zinc-200">{user.email?.split('@')[0]}</span>
                </div>
                <button type="button" onClick={() => signOut()} title="Çıkış" className="text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors">
                  <LogOut className="size-4"/>
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => openAuthModal()} className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2.5 text-xs font-extrabold hover:bg-zinc-800 transition-colors cursor-pointer">
              Giriş Yap
            </button>
          )}
        </div>
      </aside>

      {/* İÇERİK ALANI */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' ? (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-4 text-blue-600 dark:text-blue-400" />
                <span>← Ana Menüye Dön</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden">
                  <Truck className="size-4"/>
                </div>
                <span className="font-black text-sm tracking-tight lg:hidden">Nakliye Cepte</span>
                <div className="hidden lg:flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 px-3 py-1 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Otoyol Durumu: Açık & Yoğunluk Normal</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="İlan, Rota veya Plaka Ara..."
                onClick={() => navigateTo('pazar')}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
              />
            </div>

            <button type="button" onClick={() => navigateTo('pazar')} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer relative">
              <Bell className="size-4"/>
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600"></span>
            </button>

            <button type="button" onClick={toggleTheme} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer">
              {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
            </button>
          </div>
        </header>

        {/* ANA İÇERİK GOVDE */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* 1. ÜST KPI METRİKLERİ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Aktif İlanlar</span>
                      <Store className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">
                      {loadingCounts ? '...' : pazarCount ?? 0}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="size-3" /> Canlı Yük Pazarı
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Sürücü Durumu</span>
                      <Navigation className="size-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">Transit</p>
                    <span className="text-[10px] font-bold text-zinc-400">Gebze ➔ Ankara</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Mola Süresi</span>
                      <Timer className="size-4 text-indigo-500" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">02:15 S</p>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Sonraki Mola Alanı</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Aylık Tahmini</span>
                      <Wallet className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">₺52.400</p>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Hesaplanan Net Kazanç</span>
                  </div>
                </div>

                {/* 2. DÜZENLİ DÜZEN: SOL 2/3 (MODÜLLER), SAĞ 1/3 (CANLI WIDGET'LAR) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* SOL KISIM: MODÜL GRIDİ (2/3) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">Hızlı Erişim Modülleri</h2>
                        <p className="text-xs text-zinc-500">Sık kullandığınız işlem kartlarını pinleyebilirsiniz.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sortedCards.map((card) => {
                        const Icon = card.icon
                        const isPinned = pinnedIds.includes(card.id)

                        return (
                          <div
                            key={card.id}
                            onClick={() => navigateTo(card.id)}
                            className={cn(
                              "group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                              isPinned 
                                ? "border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/5" 
                                : "border-zinc-200/80 dark:border-zinc-800/80"
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className={cn("flex size-10 items-center justify-center rounded-xl border", card.color)}>
                                <Icon className="size-5"/>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {card.badge && (
                                  <span className="rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                                    {card.badge}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => togglePin(e, card.id)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                                    isPinned 
                                      ? "text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-900/40" 
                                      : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  )}
                                >
                                  <Pin className={cn("size-3.5", isPinned && "fill-current")}/>
                                </button>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {card.title}
                                </h3>
                                <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                              </div>
                              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {card.desc}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* CANLI DÜYURU / REKLAM BANNER */}
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-md flex items-center justify-between">
                      <div className="space-y-1 max-w-md">
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                          <Sparkles className="size-3" /> PRO Özellik
                        </span>
                        <h3 className="text-sm font-black">Anlık Yük Bildirimlerini Açın</h3>
                        <p className="text-xs text-blue-100">Güzergahınıza uygun yük çıktığında telefonunuza anında bildirim gelsin.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => navigateTo('profil')}
                        className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white text-blue-600 px-4 py-2.5 text-xs font-black hover:bg-blue-50 transition-colors shadow-xs cursor-pointer"
                      >
                        <span>İncele</span>
                        <ArrowUpRight className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* SAĞ KISIM: CANLI WIDGET'LAR (1/3) */}
                  <div className="space-y-4">
                    
                    {/* WIDGET 1: CANLI TAKOGRAF SAYAÇ */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Timer className="size-4 text-amber-500" />
                          <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white">Takograf Asistanı</h3>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">Aktif Sürüş</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Kalan Sürüş Süresi:</span>
                          <span className="font-extrabold text-zinc-900 dark:text-white">03 Sa 45 Dk</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-500 h-2 rounded-full w-[60%]"></div>
                        </div>
                        <p className="text-[10px] text-zinc-400">4.5 saatlik yasal sürüş sınırına 135 km kaldı.</p>
                      </div>

                      <button 
                        type="button"
                        onClick={() => navigateTo('takograf')}
                        className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/80 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Detaylı Hesaplayıcı →
                      </button>
                    </div>

                    {/* WIDGET 2: HIZLI YAKIT HESAPLAMA */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Fuel className="size-4 text-rose-500" />
                        <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white">Pratik Yakıt Hesabı</h3>
                      </div>

                      <form onSubmit={handleQuickFuelCalc} className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number" 
                            placeholder="Mesafe (KM)" 
                            value={quickKm} 
                            onChange={e => setQuickKm(e.target.value)} 
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                          />
                          <input 
                            type="number" 
                            placeholder="Ort. Lt/100km" 
                            value={quickAvg} 
                            onChange={e => setQuickAvg(e.target.value)} 
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <input 
                          type="number" 
                          placeholder="Motorin Litre Fiyatı (₺)" 
                          value={quickPrice} 
                          onChange={e => setQuickPrice(e.target.value)} 
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                        <button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold transition-colors cursor-pointer">
                          Hesapla
                        </button>
                      </form>

                      {quickResult !== null && (
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-center border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Tahmini Yakıt Maliyeti</span>
                          <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">₺{quickResult.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                        </div>
                      )}
                    </div>

                    {/* WIDGET 3: BİLDİRİM VE HATIRLATICILAR */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Wrench className="size-4 text-purple-500" />
                        <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white">Araç & Evrak Takibi</h3>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-zinc-800 dark:text-zinc-200">Muayene Tarihi</p>
                            <p className="text-[10px] text-zinc-400">Kalan: 42 Gün (18 Ekim)</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-zinc-800 dark:text-zinc-200">Kasko Yenileme</p>
                            <p className="text-[10px] text-zinc-400">Son 12 Gün kaldı!</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* DİNAMİK MODÜLLER */}
            <div className="transition-all duration-200">
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
      </div>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            
            <button type="button" onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer">
              <X className="size-5"/>
            </button>

            <div className="text-center mb-5">
              <div className="mx-auto mb-2.5 flex size-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                {authMode === 'forgot' ? <KeyRound className="size-6"/> : <Truck className="size-6"/>}
              </div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                {authMode === 'login' && 'Giriş Yap'}
                {authMode === 'register' && 'Hesap Oluştur'}
                {authMode === 'forgot' && 'Şifremi Unuttum'}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {authMode === 'login' && 'İlan eklemek ve yönetmek için giriş yapın.'}
                {authMode === 'register' && 'Ücretsiz hesabınızı hemen oluşturun.'}
                {authMode === 'forgot' && 'E-posta adresinize sıfırlama bağlantısı göndereceğiz.'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="E-posta Adresiniz" 
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 pl-10 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all" 
                />
              </div>

              {authMode !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Şifreniz" 
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 pl-10 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
              )}

              {authMode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot')}
                    className="text-[11px] font-bold text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Şifremi Unuttum
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="size-4 animate-spin"/> : (
                  authMode === 'login' ? 'Giriş Yap' : authMode === 'register' ? 'Kayıt Ol' : 'Sıfırlama Bağlantısı Gönder'
                )}
              </button>
            </form>

            <div className="mt-5 text-center space-y-2">
              {authMode === 'login' && (
                <p className="text-xs text-zinc-500">
                  Hesabınız yok mu?{' '}
                  <button type="button" onClick={() => setAuthMode('register')} className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    Kayıt Olun
                  </button>
                </p>
              )}
              {authMode === 'register' && (
                <p className="text-xs text-zinc-500">
                  Zaten hesabınız var mı?{' '}
                  <button type="button" onClick={() => setAuthMode('login')} className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                    Giriş Yapın
                  </button>
                </p>
              )}
              {authMode === 'forgot' && (
                <button type="button" onClick={() => setAuthMode('login')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  ← Giriş Ekranına Dön
                </button>
              )}
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

  const [profile, setProfile] = useState<{
    subscription_tier: string
    subscription_status: string
    subscription_end_date: string | null
  } | null>(null)

  useEffect(() => {
    if (!user) return

    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_end_date')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setProfile(data)
        }
      } catch (err) {
        console.error("Profil bilgisi çekilemedi:", err)
      }
    }

    fetchProfile()
  }, [user])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-4">
        <div className="size-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <User className="size-7" />
        </div>
        <div>
          <h3 className="text-base font-black text-zinc-900 dark:text-white">Profil & Hesabınız</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Hesap bilgilerinizi görüntülemek, abonelik durumunuzu yönetmek ve ilan kaydetmek için lütfen giriş yapın.
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            if (handleOpenAuth) handleOpenAuth()
          }}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  const isPro = profile?.subscription_status === 'active'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">Profil & Abonelik</h2>
        <p className="text-xs text-zinc-500">Hesap detaylarınızı ve abonelik paketinizi buradan yönetebilirsiniz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Aktif Kullanıcı</span>
              <p className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">{user.email}</p>
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs flex justify-between text-zinc-500">
            <span>Hesap Durumu:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="size-3.5"/> Doğrulanmış
            </span>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-5 space-y-3 relative overflow-hidden flex flex-col justify-between",
          isPro 
            ? "border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
            : "border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase",
              isPro ? "bg-emerald-600 text-white" : "bg-blue-600/10 text-blue-600 dark:text-blue-400"
            )}>
              <Sparkles className="size-3" /> {isPro ? 'PRO ABONE' : 'ÜCRETSİZ PLAN'}
            </span>
            <CreditCard className={cn("size-5", isPro ? "text-emerald-600" : "text-blue-600")} />
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-900 dark:text-white">
              {isPro ? 'Nakliye Cepte PRO' : 'Standart Sürücü'}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isPro 
                ? `Aboneliğiniz ${profile?.subscription_end_date ? new Date(profile.subscription_end_date).toLocaleDateString('tr-TR') : 'Aktif'} tarihine kadar geçerli.`
                : 'Sınırsız ilan eklemek ve öncelikli listelenmek için PRO pakete geçin.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white mb-1">Hesap Yönetimi</h4>
            <div className="space-y-2 text-xs">
              <Link href="/privacy" className="block text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400">Gizlilik Politikası</Link>
              <Link href="/delete-account" className="block text-rose-500 hover:underline">Hesabımı Sil</Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut && signOut()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            <LogOut className="size-4"/>
            <span>Oturumu Kapat</span>
          </button>
        </div>
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
