'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Pin, UserCheck, Users, Mail, Lock, KeyRound, ShieldCheck, User, CreditCard, Search, Bell, AlertTriangle, TrendingUp, Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Modules
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
  { id: 'profil', title: 'Profil & Abonelik', desc: 'Hesap detayları ve ayarlar', icon: User, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' },
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

  // Modül Sayaçları State'leri
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
      console.error("İlan sayıları çekilemedi:", err)
    } finally {
      setLoadingCounts(false)
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
        setToast({ type: 'success', text: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.' })
        setAuthMode('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      setToast({ type: 'error', text: error.message || 'Bir hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const error = err as Error
      setToast({ type: 'error', text: error.message || 'Google ile giriş yaparken hata oluştu.' })
    }
  }

  const sortedCards = [...MODULE_CARDS].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id)
    const bPinned = pinnedIds.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return 0
  })

  const getCardDescription = (card: CardItem) => {
    if (card.id === 'pazar') {
      if (loadingCounts) return 'İlanlar kontrol ediliyor...'
      if (pazarCount !== null) return `Şu an yayında ${pazarCount} aktif ilan var`
    }
    if (card.id === 'sizden-gelenler') {
      if (loadingCounts) return 'İlanlar kontrol ediliyor...'
      if (userListingCount !== null) return `Sizden gelen ${userListingCount} güncel ilan var`
    }
    return card.desc
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

      {/* MASAÜSTÜ SIDEBAR (KATEGORİZE EDİLMİŞ) */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-20 overflow-y-auto">
        <div className="space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Truck className="size-6"/>
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-zinc-900 dark:text-white">Nakliye Cepte</p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Lojistik Paneli</p>
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

          {/* Menü Grupları */}
          <nav className="space-y-4">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                activeTab === 'dashboard' ? "bg-zinc-100 dark:bg-zinc-800 text-blue-600" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Truck className="size-4"/>
              <span>Ana Menü</span>
            </button>

            {/* Grup 1: Pazar & İlanlar */}
            <div>
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">Pazar & İlanlar</p>
              <div className="space-y-0.5">
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
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                      activeTab === item.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <item.icon className="size-4"/>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grup 2: Sürücü & Sefer Araçları */}
            <div>
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">Sürücü & Sefer</p>
              <div className="space-y-0.5">
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
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                      activeTab === item.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <item.icon className="size-4"/>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grup 3: Finans & Notlar */}
            <div>
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1">Muhasebe & Araçlar</p>
              <div className="space-y-0.5">
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
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                      activeTab === item.id ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <item.icon className="size-4"/>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
          {user ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-2.5 text-xs font-bold">
                <span className="truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
                <button type="button" onClick={() => signOut()} title="Çıkış Yap" className="text-zinc-400 hover:text-rose-500 cursor-pointer"><LogOut className="size-4"/></button>
              </div>
              <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-semibold text-zinc-400">
                <Link href="/privacy" className="hover:text-blue-500 transition-colors">Gizlilik</Link>
                <span>•</span>
                <Link href="/delete-account" className="hover:text-rose-500 transition-colors">Hesabı Sil</Link>
              </div>
            </div>
          ) : (
            <div>
              <button type="button" onClick={() => openAuthModal()} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors mb-2 cursor-pointer">Giriş Yap</button>
              <div className="flex justify-center gap-2 text-[10px] text-zinc-400">
                <Link href="/privacy" className="hover:underline">Gizlilik</Link>
                <span>•</span>
                <Link href="/delete-account" className="hover:underline text-rose-500">Hesap Silme</Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* İÇERİK ALANI */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 z-10 gap-4">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' ? (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
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
                <div className="hidden lg:flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Yollarda Yoğunluk Normal • Yolun Açık Olsun 🚛</span>
                </div>
              </div>
            )}
          </div>

          {/* Arama ve Profil Aksiyonları */}
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="İlan No veya Rota Ara..."
                onClick={() => navigateTo('pazar')}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
              />
            </div>

            <button type="button" onClick={() => navigateTo('pazar')} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer relative" title="Bildirimler">
              <Bell className="size-4"/>
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600"></span>
            </button>

            {user ? (
              <button type="button" onClick={() => signOut()} className="lg:hidden p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer">
                <LogOut className="size-4"/>
              </button>
            ) : (
              <button type="button" onClick={() => openAuthModal()} className="lg:hidden rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer">
                Giriş
              </button>
            )}

            <button type="button" onClick={toggleTheme} className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer">
              {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
            </button>
          </div>
        </header>

        {/* GÖVDE (MAIN GRID) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* CANLI METRİKLER VE ÖZET KARTLAR (KPI) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Aktif İlanlar</span>
                      <Store className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">
                      {loadingCounts ? '...' : pazarCount ?? 0}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp className="size-3" /> Canlı Pazar
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Durum</span>
                      <Navigation className="size-4 text-amber-500" />
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">Seferde</p>
                    <span className="text-[10px] font-bold text-zinc-400">İstanbul ➔ Ankara</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Kalan Sürüş</span>
                      <Timer className="size-4 text-indigo-500" />
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">03:45 S</p>
                    <span className="text-[10px] font-bold text-amber-600">Yasal Limit Uyarısı</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Aylık Net</span>
                      <Wallet className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">₺48.500</p>
                    <span className="text-[10px] font-bold text-emerald-600">Tahmini Kazanç</span>
                  </div>
                </div>

                {/* MODÜL KARTLARI BAŞLIĞI */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h1 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">Hızlı Modüller</h1>
                    <p className="text-xs text-zinc-500">Sık kullandığınız modülleri iğneleyerek en üste taşıyabilirsiniz.</p>
                  </div>
                </div>

                {/* GRID MODÜL KARTLARI */}
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
                          isPinned ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/5 shadow-xs" : "border-zinc-200/80 dark:border-zinc-800"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn("flex size-11 items-center justify-center rounded-xl border", card.color)}>
                            <Icon className="size-5"/>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => togglePin(e, card.id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors cursor-pointer",
                              isPinned 
                                ? "text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40" 
                                : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                            title={isPinned ? "Sabitlemeyi Kaldır" : "En Üste Sabitle"}
                          >
                            <Pin className={cn("size-3.5", isPinned && "fill-current")}/>
                          </button>
                        </div>

                        <div className="mt-2">
                          <div className="flex items-center justify-between">
                            <h2 className="text-xs font-black text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {card.title}
                            </h2>
                            <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                            {getCardDescription(card)}
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

            {authMode !== 'forgot' && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-bold">veya</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google ile Devam Et</span>
                </button>
              </>
            )}

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

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-center gap-3 text-[10px] text-zinc-400">
                <Link href="/privacy" onClick={closeAuthModal} className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
                  Gizlilik Politikası
                </Link>
                <span>•</span>
                <Link href="/delete-account" onClick={closeAuthModal} className="underline hover:text-rose-500">
                  Hesabımı Sil
                </Link>
              </div>
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
        <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
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
            <div className="size-12 rounded-xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Aktif Kullanıcı</span>
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

      {!isPro && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-black text-zinc-900 dark:text-white">Abonelik Paketleri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between space-y-4 hover:border-blue-500 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Aylık Plan</span>
                  <span className="text-sm font-black text-zinc-900 dark:text-white">₺150 <span className="text-[10px] text-zinc-400 font-normal">/ ay</span></span>
                </div>
                <h4 className="text-base font-black text-zinc-900 dark:text-white mt-1">PRO Aylık</h4>
                <ul className="mt-3 space-y-1.5 text-xs text-zinc-500">
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> Sınırsız yük & araç ilanı yayınlama</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> Arama sonuçlarında öncelikli görünüm</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> Doğrulanmış Sürücü Rozeti</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => alert("Abonelik satın alma altyapısı entegrasyon aşamasındadır.")}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
              >
                Aylık Paket Seç (₺150)
              </button>
            </div>

            <div className="rounded-2xl border-2 border-blue-600 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between space-y-4 relative shadow-lg shadow-blue-500/10">
              <span className="absolute -top-3 right-4 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                2 Ay Bedava
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Yıllık Plan</span>
                  <span className="text-sm font-black text-zinc-900 dark:text-white">₺1.500 <span className="text-[10px] text-zinc-400 font-normal">/ yıl</span></span>
                </div>
                <h4 className="text-base font-black text-zinc-900 dark:text-white mt-1">PRO Yıllık</h4>
                <ul className="mt-3 space-y-1.5 text-xs text-zinc-500">
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> Tüm PRO Aylık özellikleri</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> Yıllık alımda ₺300 tasarruf</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-blue-600"/> VIP Destek Hattı</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => alert("Abonelik satın alma altyapısı entegrasyon aşamasındadır.")}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
              >
                Yıllık Paket Seç (₺1.500)
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
