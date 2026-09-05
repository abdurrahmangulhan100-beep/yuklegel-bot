'use client'

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
  LogOut, X, Loader2, Sparkles, Sun, Moon, ArrowLeft, ChevronRight, Pin, UserCheck, 
  Users, Mail, Lock, KeyRound, User, Search, Bell, TrendingUp, Navigation, AlertCircle, Wrench, Play, Pause, RefreshCw,
  Gauge, Calendar, MapPin, Trash2, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Dinamik Modüller
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
        <span>Modül Hazırlanıyor...</span>
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

interface DocumentItem {
  id: string
  title: string
  dueDate: string
  type: 'bakim' | 'evrak'
}

interface TripData {
  freightFee: number
  tripKm: number
  fuelPrice: number
  avgConsumption: number
  tollCost: number
}

const STORAGE_KEYS = {
  DOCUMENTS: 'nakliye_documents_data',
  TRIP: 'nakliye_trip_data',
  TACHO: 'nakliye_tacho_state',
  PINS: 'nakliye_pinned_cards'
}

const MODULE_CARDS: CardItem[] = [
  { id: 'pazar', title: 'İlan Pazarı', desc: 'Canlı yük ve araç teklifleri', icon: Store, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/40', badge: 'Canlı' },
  { id: 'sizden-gelenler', title: 'Sizden Gelenler', desc: 'Sürücü topluluk ilanları', icon: Users, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/40' },
  { id: 'ilanlarim', title: 'İlan Yönetimi', desc: 'Aktif ilan durum ve teklifleri', icon: UserCheck, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-100 dark:border-teal-900/40' },
  { id: 'finans', title: 'Gider & Gelir', desc: 'Navlun, harcırah ve faturalar', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/40' },
  { id: 'sefer', title: 'Sefer Maliyeti', desc: 'Detaylı kâr/zarar simülasyonu', icon: Calculator, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900/40' },
  { id: 'notlar', title: 'Evrak & Notlar', desc: 'Muayene, Kasko ve periyodik bakım', icon: NotebookPen, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900/40' },
]

export function AppShellContent() {
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

  // Live Database Counts & Pins
  const [pazarCount, setPazarCount] = useState<number | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  // 1. Persistent Trip Calculator State
  const [tripData, setTripData] = useState<TripData>({
    freightFee: 45000,
    tripKm: 480,
    fuelPrice: 44.5,
    avgConsumption: 31,
    tollCost: 1000
  })

  // 2. Persistent Dynamic Documents & Maintenance State
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocDate, setNewDocDate] = useState('')
  const [newDocType, setNewDocType] = useState<'bakim' | 'evrak'>('evrak')

  // 3. Persistent Tachograph State (Timestamp Exactness)
  const MAX_DRIVE_SECONDS = 4.5 * 3600
  const [driveSecondsLeft, setDriveSecondsLeft] = useState<number>(MAX_DRIVE_SECONDS)
  const [isDriving, setIsDriving] = useState<boolean>(false)

  // Initial Load (LocalStorage Persistence)
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true)

    // Pins
    const savedPins = localStorage.getItem(STORAGE_KEYS.PINS)
    if (savedPins) {
      try { setPinnedIds(JSON.parse(savedPins)) } catch {}
    }

    // Sefer Verisi
    const savedTrip = localStorage.getItem(STORAGE_KEYS.TRIP)
    if (savedTrip) {
      try { setTripData(JSON.parse(savedTrip)) } catch {}
    }

    // Evrak Verisi
    const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
    if (savedDocs) {
      try { setDocuments(JSON.parse(savedDocs)) } catch {}
    } else {
      const initialDocs: DocumentItem[] = [
        { id: '1', title: 'Kasko Yenileme', dueDate: '2026-09-15', type: 'evrak' },
        { id: '2', title: 'Periyodik Yağ Bakımı', dueDate: '2026-10-01', type: 'bakim' }
      ]
      setDocuments(initialDocs)
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(initialDocs))
    }

    // Takograf Zamanlayıcısı (Arka planda sekme kapansa da doğru kalan zamanı hesaplar)
    const savedTacho = localStorage.getItem(STORAGE_KEYS.TACHO)
    if (savedTacho) {
      try {
        const { left, driving, lastTimestamp } = JSON.parse(savedTacho)
        if (driving && lastTimestamp) {
          const elapsed = Math.floor((Date.now() - lastTimestamp) / 1000)
          const updatedLeft = Math.max(0, left - elapsed)
          setDriveSecondsLeft(updatedLeft)
          setIsDriving(updatedLeft > 0)
        } else {
          setDriveSecondsLeft(left)
          setIsDriving(false)
        }
      } catch {}
    }

    fetchCounts()
  }, [])

  // Takograf Döngüsü & Veri Saklama
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isDriving && driveSecondsLeft > 0) {
      interval = setInterval(() => {
        setDriveSecondsLeft(prev => {
          const next = prev - 1
          if (next <= 0) {
            setIsDriving(false)
            showToast('error', 'Yasal sürüş süreniz doldu! Lütfen mola verin.')
          }
          return Math.max(0, next)
        })
      }, 1000)
    }

    localStorage.setItem(STORAGE_KEYS.TACHO, JSON.stringify({
      left: driveSecondsLeft,
      driving: isDriving,
      lastTimestamp: Date.now()
    }))

    return () => clearInterval(interval)
  }, [isDriving, driveSecondsLeft])

  const showToast = (type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCounts = async () => {
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) setPazarCount(count)
    } catch (err) {
      console.error('Count fetch error:', err)
    }
  }

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = pinnedIds.includes(id) 
      ? pinnedIds.filter(item => item !== id)
      : [...pinnedIds, id]
    setPinnedIds(updated)
    localStorage.setItem(STORAGE_KEYS.PINS, JSON.stringify(updated))
  }

  // Trip Field Updates
  const handleTripChange = (field: keyof TripData, value: number) => {
    const updated = { ...tripData, [field]: value }
    setTripData(updated)
    localStorage.setItem(STORAGE_KEYS.TRIP, JSON.stringify(updated))
  }

  // Dynamic Document Handlers
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocTitle || !newDocDate) return

    const newDoc: DocumentItem = {
      id: Date.now().toString(),
      title: newDocTitle,
      dueDate: newDocDate,
      type: newDocType
    }

    const updated = [newDoc, ...documents]
    setDocuments(updated)
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated))
    setNewDocTitle('')
    setNewDocDate('')
    showToast('success', 'Evrak/Bakım kaydı eklendi.')
  }

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter(doc => doc.id !== id)
    setDocuments(updated)
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated))
    showToast('success', 'Kayıt silindi.')
  }

  const navigateTo = (tab: ModuleId) => {
    if (tab === 'dashboard') router.push('/', { scroll: false })
    else router.push(`?tab=${tab}`, { scroll: false })
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }

  // Sefer Maliyeti Hesaplama
  const tripCalculations = useMemo(() => {
    const totalFuelLiters = (tripData.tripKm * tripData.avgConsumption) / 100
    const fuelCost = totalFuelLiters * tripData.fuelPrice
    const totalCost = fuelCost + tripData.tollCost
    const netProfit = tripData.freightFee - totalCost
    const profitMargin = tripData.freightFee > 0 ? (netProfit / tripData.freightFee) * 100 : 0

    return {
      totalFuelLiters: totalFuelLiters.toFixed(0),
      fuelCost: fuelCost.toFixed(0),
      totalCost: totalCost.toFixed(0),
      netProfit: netProfit.toFixed(0),
      profitMargin: profitMargin.toFixed(1)
    }
  }, [tripData])

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600)
    const mins = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
      } else if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showToast('success', 'Kayıt oluşturuldu! E-postanızı onaylayın.')
        setAuthMode('login')
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        showToast('success', 'Şifre sıfırlama e-postası gönderildi.')
        setAuthMode('login')
      }
    } catch (err: unknown) {
      const error = err as Error
      showToast('error', error.message || 'Hata oluştu')
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
      
      {/* Toast Paneli */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-2xl text-xs font-black transition-all border animate-in fade-in slide-in-from-top-2",
          toast.type === 'error' 
            ? 'bg-rose-600 text-white border-rose-500' 
            : 'bg-emerald-600 text-white border-emerald-500'
        )}>
          {toast.type === 'error' ? <X className="size-4"/> : <CheckCircle2 className="size-4"/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Sol Menü (Sidebar) */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
              <Truck className="size-5"/>
            </div>
            <div>
              <p className="font-black text-base tracking-tight leading-none text-zinc-900 dark:text-white">Nakliye Cepte</p>
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Lojistik Portalı</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('ekle')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 text-xs font-black shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="size-4" />
            <span>Hızlı İlan Oluştur</span>
          </button>

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
              <Gauge className="size-4"/>
              <span>Kontrol Paneli</span>
            </button>

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Yük & Pazaryeri</p>
              {[
                { id: 'pazar', title: 'İlan Pazarı', icon: Store },
                { id: 'sizden-gelenler', title: 'Sizden Gelenler', icon: Users },
                { id: 'ilanlarim', title: 'İlan Yönetimi', icon: UserCheck },
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

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Sürücü Hesabı</p>
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

            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Yönetim</p>
              {[
                { id: 'finans', title: 'Gider & Gelir', icon: Wallet },
                { id: 'notlar', title: 'Evrak & Notlar', icon: NotebookPen },
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

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {user ? (
            <div className="flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-2.5 text-xs font-bold">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="size-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                  {user.email?.[0].toUpperCase()}
                </div>
                <span className="truncate max-w-[100px] text-zinc-800 dark:text-zinc-200">{user.email?.split('@')[0]}</span>
              </div>
              <button type="button" onClick={() => signOut()} title="Çıkış Yap" className="text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors">
                <LogOut className="size-4"/>
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => openAuthModal()} className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2.5 text-xs font-extrabold hover:bg-zinc-800 transition-colors cursor-pointer">
              Giriş Yap / Kayıt Ol
            </button>
          )}
        </div>
      </aside>

      {/* İçerik Gövdesi */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Üst Bar */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            {activeTab !== 'dashboard' ? (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-4 text-blue-600 dark:text-blue-400" />
                <span>Ana Panele Dön</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden">
                  <Truck className="size-4"/>
                </div>
                <span className="font-black text-sm tracking-tight lg:hidden">Nakliye Cepte</span>
                <div className="hidden lg:flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 px-3 py-1 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Canlı Veri & Tarayıcı Senkronizasyonu Aktif</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="İlan veya Modül Ara..."
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

        {/* Ana Arayüz Alanı */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* 1. Anlık Finansal Metrikler */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Aktif İlan Pazarı</span>
                      <Store className="size-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">
                      {pazarCount !== null ? pazarCount : '128'}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="size-3" /> Canlı Veri Akışı
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Takograf Sayacı</span>
                      <Timer className="size-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white font-mono">
                      {formatTime(driveSecondsLeft)}
                    </p>
                    <span className="text-[10px] font-bold text-amber-600">{isDriving ? 'Sürüşte' : 'Molada'}</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Kayıtlı Evraklar</span>
                      <NotebookPen className="size-4 text-purple-500" />
                    </div>
                    <p className="text-xl font-black text-zinc-900 dark:text-white">{documents.length} Adet</p>
                    <span className="text-[10px] font-bold text-purple-600">Aktif Takip</span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Hesaplanan Net Kâr</span>
                      <Wallet className="size-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₺{Number(tripCalculations.netProfit).toLocaleString('tr-TR')}
                    </p>
                    <span className="text-[10px] font-bold text-zinc-400">Marj: %{tripCalculations.profitMargin}</span>
                  </div>
                </div>

                {/* 2. Ana Layout (İşlevsel Modül ve Araçlar) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Sol Taraf: İnteraktif Sefer & Evrak Yönetimi (2/3) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* CANLI HESAPLAYICI WIDGET'I (Kalıcı State Entegrasyonlu) */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600">
                            <Calculator className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white">Canlı Sefer & Kâr Simülatörü</h3>
                            <p className="text-[10px] text-zinc-500">Değerleri değiştirin; verileriniz otomatik kaydedilir.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-2.5 py-1 rounded-lg">
                          Kalıcı Veri
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Navlun Geliri (₺)</label>
                          <input 
                            type="number" 
                            value={tripData.freightFee} 
                            onChange={(e) => handleTripChange('freightFee', Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-black text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Mesafe (KM)</label>
                          <input 
                            type="number" 
                            value={tripData.tripKm} 
                            onChange={(e) => handleTripChange('tripKm', Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-black text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Mazot (₺/Lt)</label>
                          <input 
                            type="number" 
                            value={tripData.fuelPrice} 
                            onChange={(e) => handleTripChange('fuelPrice', Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-black text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Ort. Tüketim (Lt/100km)</label>
                          <input 
                            type="number" 
                            value={tripData.avgConsumption} 
                            onChange={(e) => handleTripChange('avgConsumption', Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-black text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] font-bold text-zinc-400">Otoyol / Ek Gider (₺)</label>
                          <input 
                            type="number" 
                            value={tripData.tollCost} 
                            onChange={(e) => handleTripChange('tollCost', Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-black text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-3 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 font-bold block">Toplam Yakıt Gideri</span>
                          <span className="text-xs font-black text-rose-600 dark:text-rose-400">{tripCalculations.totalFuelLiters} Litre (₺{Number(tripCalculations.fuelCost).toLocaleString('tr-TR')})</span>
                        </div>
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Tahmini Net Kâr</span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">₺{Number(tripCalculations.netProfit).toLocaleString('tr-TR')} (%{tripCalculations.profitMargin})</span>
                        </div>
                      </div>
                    </div>

                    {/* DİNAMİK EVRAK VE BAKIM YÖNETİMİ (Ekle / Sil / Kaydet) */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                            <Wrench className="size-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-zinc-900 dark:text-white">Evrak & Bakım Takip Yönetimi</h3>
                            <p className="text-[10px] text-zinc-500">Yeni muayene veya bakım tarihi ekleyin.</p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleAddDocument} className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text" 
                          placeholder="Kayıt Adı (Örn: Araç Muayenesi)" 
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          required
                        />
                        <input 
                          type="date" 
                          value={newDocDate}
                          onChange={(e) => setNewDocDate(e.target.value)}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-2 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                          required
                        />
                        <button type="submit" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-black transition-colors cursor-pointer shrink-0">
                          Kaydet
                        </button>
                      </form>

                      <div className="space-y-2">
                        {documents.length === 0 ? (
                          <div className="p-4 text-center text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                            Henüz kayıtlı evrak yok. Yukarıdaki formdan ekleyebilirsiniz.
                          </div>
                        ) : (
                          documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs">
                              <div className="flex items-center gap-2.5">
                                <Calendar className="size-4 text-purple-600 shrink-0" />
                                <div>
                                  <p className="font-extrabold text-zinc-900 dark:text-white">{doc.title}</p>
                                  <p className="text-[10px] text-zinc-400 font-bold">Son Tarih: {doc.dueDate}</p>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteDocument(doc.id)} 
                                className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
                                title="Sil"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* UYGULAMA MODÜL GRID'I */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">Tüm Araç & Pazar Modülleri</h3>
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
                                  : "border-zinc-200/80 dark:border-zinc-800"
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
                                  <h4 className="text-xs font-black text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {card.title}
                                  </h4>
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
                    </div>

                  </div>

                  {/* Sağ Taraf: Canlı Çalışan Takograf & Araçlar (1/3) */}
                  <div className="space-y-4">
                    
                    {/* CANLI ÇALIŞAN TAKOGRAF SAYAÇ WIDGET'I */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Timer className="size-4 text-amber-500" />
                          <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white">Canlı Takograf</h3>
                        </div>
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-md uppercase",
                          isDriving ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50" : "bg-amber-50 text-amber-600 dark:bg-amber-950/50"
                        )}>
                          {isDriving ? 'Sürüşte' : 'Molada'}
                        </span>
                      </div>

                      <div className="text-center space-y-1 py-1">
                        <p className="text-3xl font-black font-mono tracking-wider text-zinc-900 dark:text-white">
                          {formatTime(driveSecondsLeft)}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400">Yasal Limit (4.5 Saat)</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsDriving(!isDriving)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-white transition-all cursor-pointer shadow-xs",
                            isDriving ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                          )}
                        >
                          {isDriving ? <Pause className="size-4"/> : <Play className="size-4"/>}
                          <span>{isDriving ? 'Molaya Geç' : 'Sürüşe Başla'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setDriveSecondsLeft(MAX_DRIVE_SECONDS); setIsDriving(false); showToast('success', 'Takograf sıfırlandı.'); }}
                          className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Süreç Sıfırla"
                        >
                          <RefreshCw className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* CANLI YÜK VE İLAN AKIŞI */}
                    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-blue-500" />
                          <h3 className="text-xs font-extrabold text-zinc-900 dark:text-white">Son Eklenen İlanlar</h3>
                        </div>
                        <button type="button" onClick={() => navigateTo('pazar')} className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                          Tümünü Gör →
                        </button>
                      </div>

                      <div className="space-y-2">
                        {[
                          { route: 'İstanbul ➔ İzmir', weight: '24 Ton Tenteli', price: '₺38.500' },
                          { route: 'Ankara ➔ Mersin', weight: '18 Ton Frigo', price: '₺29.000' },
                          { route: 'Bursa ➔ Adana', weight: '22 Ton Açık Kasa', price: '₺42.000' },
                        ].map((item, idx) => (
                          <div key={idx} onClick={() => navigateTo('pazar')} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-xs">
                            <div>
                              <p className="font-black text-zinc-900 dark:text-white">{item.route}</p>
                              <p className="text-[10px] text-zinc-400">{item.weight}</p>
                            </div>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* Dinamik Yüklenen Modüller */}
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

      {/* Modal: Auth / Kayıt Ekranı */}
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
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 pl-10 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
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
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 pl-10 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center cursor-pointer"
              >
                {loading ? <Loader2 className="size-4 animate-spin"/> : (
                  authMode === 'login' ? 'Giriş Yap' : authMode === 'register' ? 'Kayıt Ol' : 'Sıfırlama Bağlantısı Gönder'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              {authMode === 'login' && (
                <button type="button" onClick={() => setAuthMode('register')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  Hesabınız yok mu? Kayıt Olun
                </button>
              )}
              {authMode === 'register' && (
                <button type="button" onClick={() => setAuthMode('login')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  Hesabınız var mı? Giriş Yapın
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-4">
        <User className="size-10 text-blue-600" />
        <h3 className="text-base font-black text-zinc-900 dark:text-white">Profil Yönetimi</h3>
        <button
          type="button"
          onClick={() => handleOpenAuth && handleOpenAuth()}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white cursor-pointer"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-zinc-900 dark:text-white">Hesap & Profil</h2>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">E-Posta: {user.email}</p>
        <button
          type="button"
          onClick={() => signOut && signOut()}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white cursor-pointer"
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
