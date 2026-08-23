'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { ListingsView } from '@/components/listings/listings-view'
import { AddListingForm } from '@/components/add-listing-form'
import { TripCalculator } from '@/components/trip-calculator'
import { FuelCalculator } from '@/components/fuel-calculator'
import { NotesView } from '@/components/notes-view'
import { FinanceView } from '@/components/finance-view'
import { TachographCalculator } from '@/components/tachograph-calculator'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
Truck, Store, PlusCircle, Calculator, Fuel, NotebookPen, Wallet, Timer,
User, LogOut, LogIn, X, Mail, KeyRound, Loader2, Sparkles,
Eye, EyeOff, Moon, Sun, ChevronDown, Settings, Bell, Search, Mic, SlidersHorizontal,
MapPin, Phone, MessageSquare, Copy, Heart, Map, List, Volume2, ShieldCheck, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ModuleId = 'pazar' | 'ekle' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

const MODULES: { id: ModuleId; label: string; short: string; icon: typeof Store; badge?: string }[] = [
{ id: 'pazar', label: 'İlan Pazarı', short: 'Pazar', icon: Store, badge: 'Canlı' },
{ id: 'ekle', label: 'İlan Ekle', short: 'Ekle', icon: PlusCircle },
{ id: 'finans', label: 'Gider & Kazanç', short: 'Finans', icon: Wallet },
{ id: 'takograf', label: 'Takograf Asistanı', short: 'Takograf', icon: Timer, badge: 'Yasal' },
{ id: 'sefer', label: 'Sefer Hesabı', short: 'Sefer', icon: Calculator },
{ id: 'yakit', label: 'Yakıt Hesabı', short: 'Yakıt', icon: Fuel },
{ id: 'notlar', label: 'Notlarım', short: 'Notlar', icon: NotebookPen },
]

const TITLES: Record<ModuleId, desc: string string; title: { }> = {
pazar: { title: 'Canlı İlan Pazarı', desc: 'Bot ağından gelen güncel yük ve boş araç ilanları.' },
ekle: { title: 'Yeni İlan Ekle', desc: 'Yük veya boş araç ilanınızı anında yayınlayın.' },
finans: { title: 'Gider & Kazanç Defteri', desc: 'Navlun gelirlerinizi ve sefer masraflarınızı takip edin.' },
takograf: { title: 'Takograf & Sürüş Süresi', desc: 'Yasal sürüş sürelerinizi ve molalarınızı canlı takip edin.' },
sefer: { title: 'Sefer Maliyet & Kâr', desc: 'Net kârınızı gerçek giderlerinizle hesaplayın.' },
yakit: { title: 'Hızlı Yakıt Hesabı', desc: 'Yol maliyetini saniyeler içinde hesaplayın.' },
notlar: { title: 'Pratik Notlar', desc: 'Bakım, muayene ve sigorta hatırlatmaları.' },
}

function AppShellContent() {
const router = useRouter()
const searchParams = useSearchParams()
const active = (searchParams.get('tab') as ModuleId) || 'pazar'

const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth()

const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPassword, setShowPassword] = useState(false)
const [loading, setLoading] = useState(false)
const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

const [isDarkMode, setIsDarkMode] = useState(false)
const [isProfileOpen, setIsProfileOpen] = useState(false)
const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false)
const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)
const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
const [isListening, setIsListening] = useState(false)

// Auto-hide navigation control on mobile
const [isNavVisible, setIsNavVisible] = useState(true)
const { scrollY } = useScroll()
const lastScrollY = useRef(0)

useMotionValueEvent(scrollY, "change", (latest) => {
const diff = latest - lastScrollY.current
if (Math.abs(diff) > 10) {
if (diff > 0 && latest > 80) {
setIsNavVisible(false)
} else {
setIsNavVisible(true)
}
lastScrollY.current = latest
}
})

const handleTabChange = (id: ModuleId) => {
router.push(?tab=${id}, { scroll: false })
setIsToolsSheetOpen(false)
setIsMoreSheetOpen(false)
}

useEffect(() => {
if (toast) {
const timer = setTimeout(() => setToast(null), 4000)
return () => clearTimeout(timer)
}
}, [toast])

useEffect(() => {
if (document.documentElement.classList.contains('dark')) {
setIsDarkMode(true)
}
}, [])

const toggleTheme = () => {
setIsDarkMode(!isDarkMode)
document.documentElement.classList.toggle('dark')
}

const handleAuthSubmit = async (e: React.FormEvent) => {
e.preventDefault()
setToast(null)
setLoading(true)

try {
  if (authMode === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setToast({ type: 'success', text: 'Giriş başarılı! Hoş geldiniz.' })
    setTimeout(() => closeAuthModal(), 1000)
  } else if (authMode === 'register') {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    setToast({ type: 'success', text: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' })
    setAuthMode('login')
  } else if (authMode === 'forgot') {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    })
    if (error) throw error
    setToast({ type: 'success', text: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.' })
  }
} catch (err: unknown) {
  const error = err as Error
  setToast({ type: 'error', text: error.message || 'Bir hata oluştu.' })
} finally {
  setLoading(false)
}
}

const handleVoiceSearch = () => {
setIsListening(true)
setTimeout(() => {
setIsListening(false)
setToast({ type: 'success', text: 'Dinleme tamamlandı: "Ankara Frigo Yük"' })
}, 3000)
}

return (

  {/* GLOBAL TOAST */}
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: -20, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: -20, x: '-50%' }}
        className={cn(
          "fixed top-6 left-1/2 z-[100] flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-2xl border transition-all duration-300",
          toast.type === 'error' 
            ? 'bg-rose-500/90 text-white border-rose-600/50 shadow-rose-500/20' 
            : 'bg-emerald-500/90 text-white border-emerald-600/50 shadow-emerald-500/20'
        )}
      >
        {toast.type === 'error' ? <X className="size-5"/> : <Sparkles className="size-5"/>}
        <span className="text-sm font-bold tracking-tight">{toast.text}</span>
      </motion.div>
    )}
  </AnimatePresence>

  {/* MASAÜSTÜ SIDEBAR */}
  <aside className="hidden w-72 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl lg:flex justify-between p-4 z-30">
    <div className="space-y-6">
      {/* TOP USER CARD IN SIDEBAR */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 p-3.5 backdrop-blur-md">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md font-bold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="size-4"/>
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
          >
            <LogIn className="size-4"/>
            <span>Giriş Yap / Kayıt Ol</span>
          </button>
        )}
      </div>

      {/* LOGO */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
          <Truck className="size-5"/>
        </div>
        <div className="leading-tight">
          <p className="font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-base">Nakliye Cepte</p>
          <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Pro Asistan</p>
        </div>
      </div>

      {/* MODULES NAV */}
      <nav className="space-y-1">
        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Modüller</div>
        {MODULES.map((m) => {
          const Icon = m.icon
          const isActive = active === m.id
          return (
            <button
              key={m.id}
              onClick={() => handleTabChange(m.id)}
              className={cn(
                "relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200",
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Icon className="size-4"/>
                <span>{m.label}</span>
              </div>
              {m.badge && (
                <span className="relative z-10 rounded-full bg-blue-500/10 dark:bg-blue-400/20 px-2 py-0.5 text-[9px] font-extrabold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {m.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>

    {/* BOTTOM SIDEBAR ITEMS */}
    <div className="space-y-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="flex items-center justify-between px-2">
        <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
          Sistem Aktif
        </span>
        <button 
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
        </button>
      </div>
    </div>
  </aside>

  {/* RIGHT MAIN CONTENT */}
  <div className="flex flex-1 flex-col overflow-hidden relative">
    
    {/* DESKTOP HEADER */}
    <motion.header 
      animate={{ y: isNavVisible ? 0 : -100 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 px-4 backdrop-blur-2xl sm:px-8"
    >
      {/* Mobile Header Logo */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
          <Truck className="size-4"/>
        </div>
        <p className="font-extrabold tracking-tight text-zinc-900 dark:text-white text-sm">Nakliye Cepte</p>
      </div>

      {/* Desktop Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md relative">
        <Search className="absolute left-3.5 top-2.5 size-4 text-zinc-400"/>
        <input 
          type="text" 
          placeholder="İl, ilçe veya yük detayına göre hızlı ara..." 
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 pl-10 pr-10 py-2 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
        <button 
          onClick={handleVoiceSearch}
          className={cn(
            "absolute right-2.5 top-2 p-1 rounded-lg transition-colors",
            isListening ? "text-rose-500 bg-rose-50 dark:bg-rose-500/20 animate-pulse" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          )}
          title="Sesli Arama"
        >
          <Mic className="size-3.5"/>
        </button>
      </div>

      {/* Action Buttons Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* View Mode Toggle (Map/List) */}
        {active === 'pazar' && (
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-zinc-500"
              )}
            >
              <List className="size-3.5"/>
              <span className="hidden sm:inline">Liste</span>
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                viewMode === 'map' ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" : "text-zinc-500"
              )}
            >
              <Map className="size-3.5"/>
              <span className="hidden sm:inline">Harita</span>
            </button>
          </div>
        )}

        <button 
          onClick={() => setIsFilterSheetOpen(true)}
          className="lg:hidden flex size-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
        >
          <SlidersHorizontal className="size-4"/>
        </button>

        <button className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative">
          <Bell className="size-4"/>
          <span className="absolute top-2 right-2 size-2 rounded-full bg-blue-600" />
        </button>

        <button 
          onClick={() => handleTabChange('ekle')}
          className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-blue-600/20 transition-all hover:opacity-90 active:scale-95"
        >
          <PlusCircle className="size-4"/>
          <span>Hızlı İlan Ekle</span>
        </button>
      </div>
    </motion.header>

    {/* MAIN BODY AREA */}
    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pb-36 lg:pb-8 relative">
      <div className="mx-auto max-w-6xl">
        
        {/* TITLE BAR */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="size-5 text-blue-600 dark:text-blue-400"/>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                {TITLES[active].title}
              </h1>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {TITLES[active].desc}
            </p>
          </div>

          {/* Quick Route Summary Example Tag */}
          {active === 'pazar' && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 self-start sm:self-auto">
              <MapPin className="size-4 shrink-0"/>
              <span>KIRIKKALE ➔ DİYARBAKIR (720 km)</span>
            </div>
          )}
        </div>

        {/* TAB CONTENT TRANSITION */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {active === 'pazar' && (
              viewMode === 'list' ? <ListingsView/> : (
                <div className="flex flex-col items-center justify-center min-h-[400px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-8 text-center">
                  <Map className="size-12 text-blue-600 mb-4 animate-bounce"/>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">Canlı Türkiye Harita Görünümü</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">Türkiye genelindeki aktif yük ve boş araç ilanları canlı koordinat pini olarak haritaya işleniyor.</p>
                  <button onClick={() => setViewMode('list')} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">Liste Görünümüne Dön</button>
                </div>
              )
            )}
            {active === 'ekle' && <AddListingForm onCreated="{()"> handleTabChange('pazar')} />}
            {active === 'finans' && <FinanceView/>}
            {active === 'takograf' && <TachographCalculator/>}
            {active === 'sefer' && <TripCalculator/>}
            {active === 'yakit' && <FuelCalculator/>}
            {active === 'notlar' && <NotesView/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>

    {/* MOBİL FLOATING DOCK (5 MAIN ACTIONS) */}
    <AnimatePresence>
      {isNavVisible && (
        <motion.nav 
          initial={{ y: 100, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: 100, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-4 left-1/2 z-40 flex items-center justify-around w-[92%] max-w-md rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-2xl lg:hidden"
        >
          {/* PAZAR */}
          <button
            onClick={() => handleTabChange('pazar')}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl p-2 min-w-[56px] transition-all relative",
              active === 'pazar' ? "text-blue-600 dark:text-blue-400 font-black" : "text-zinc-500 dark:text-zinc-400 font-semibold"
            )}
          >
            <Store className="size-5"/>
            <span className="text-[10px]">Pazar</span>
            {active === 'pazar' && <motion.div layoutId="mobileNavActive" className="absolute bottom-1 size-1 rounded-full bg-blue-600" />}
          </button>

          {/* ARAÇLAR / HESAPLAYICILAR */}
          <button
            onClick={() => setIsToolsSheetOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl p-2 min-w-[56px] transition-all relative",
              ['takograf', 'sefer', 'yakit'].includes(active) ? "text-blue-600 dark:text-blue-400 font-black" : "text-zinc-500 dark:text-zinc-400 font-semibold"
            )}
          >
            <Calculator className="size-5"/>
            <span className="text-[10px]">Araçlar</span>
          </button>

          {/* YÜZEN İLAN EKLE (CENTER FAB) */}
          <button
            onClick={() => handleTabChange('ekle')}
            className="-top-5 relative flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/30 active:scale-90 transition-transform border-4 border-zinc-50 dark:border-zinc-950"
          >
            <PlusCircle className="size-7"/>
          </button>

          {/* FİNANS */}
          <button
            onClick={() => handleTabChange('finans')}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl p-2 min-w-[56px] transition-all relative",
              active === 'finans' ? "text-blue-600 dark:text-blue-400 font-black" : "text-zinc-500 dark:text-zinc-400 font-semibold"
            )}
          >
            <Wallet className="size-5"/>
            <span className="text-[10px]">Finans</span>
            {active === 'finans' && <motion.div layoutId="mobileNavActive" className="absolute bottom-1 size-1 rounded-full bg-blue-600" />}
          </button>

          {/* DİĞER / PROFİL */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl p-2 min-w-[56px] transition-all relative",
              ['notlar'].includes(active) ? "text-blue-600 dark:text-blue-400 font-black" : "text-zinc-500 dark:text-zinc-400 font-semibold"
            )}
          >
            <User className="size-5"/>
            <span className="text-[10px]">Profil</span>
          </button>
        </motion.nav>
      )}
    </AnimatePresence>
  </div>

  {/* ARAÇLAR BOTTOM SHEET (DRAWER) */}
  <AnimatePresence>
    {isToolsSheetOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsToolsSheetOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full rounded-t-[2.5rem] border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-4">Hesaplama Araçları</h3>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleTabChange('takograf')} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <Timer className="size-6 text-blue-600"/>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Takograf</span>
            </button>
            <button onClick={() => handleTabChange('sefer')} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <Calculator className="size-6 text-indigo-600"/>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Sefer Hesabı</span>
            </button>
            <button onClick={() => handleTabChange('yakit')} className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-4">
              <Fuel className="size-6 text-emerald-600"/>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Yakıt Hesabı</span>
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* DİĞER / PROFİL BOTTOM SHEET */}
  <AnimatePresence>
    {isMoreSheetOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMoreSheetOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full rounded-t-[2.5rem] border-t
