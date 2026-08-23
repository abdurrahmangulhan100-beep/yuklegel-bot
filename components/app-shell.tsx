'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Eye, EyeOff, Moon, Sun, Bell, Search, Mic, MapPin, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ModuleId = 'pazar' | 'ekle' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

const MODULES: { id: ModuleId; label: string; icon: typeof Store; badge?: string }[] = [
  { id: 'pazar', label: 'İlan Pazarı', icon: Store, badge: 'Canlı' },
  { id: 'ekle', label: 'İlan Ekle', icon: PlusCircle },
  { id: 'finans', label: 'Gider & Kazanç', icon: Wallet },
  { id: 'takograf', label: 'Takograf Asistanı', icon: Timer, badge: 'Yasal' },
  { id: 'sefer', label: 'Sefer Hesabı', icon: Calculator },
  { id: 'yakit', label: 'Yakıt Hesabı', icon: Fuel },
  { id: 'notlar', label: 'Notlarım', icon: NotebookPen },
]

const TITLES: Record<ModuleId, { title: string; desc: string }> = {
  pazar: { title: 'Canlı İlan Pazarı', desc: 'Güncel yük ve boş araç ilanları.' },
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
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false)
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const handleTabChange = (id: ModuleId) => {
    router.push(`?tab=${id}`, { scroll: false })
    setIsToolsSheetOpen(false)
    setIsMoreSheetOpen(false)
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
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
        setToast({ type: 'success', text: 'Giriş başarılı!' })
        setTimeout(() => closeAuthModal(), 800)
      } else if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setToast({ type: 'success', text: 'Kayıt başarılı! Giriş yapabilirsiniz.' })
        setAuthMode('login')
      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setToast({ type: 'success', text: 'Sıfırlama bağlantısı gönderildi.' })
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
      setToast({ type: 'success', text: 'Arama: "Ankara Frigo Yük"' })
    }, 2000)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={cn(
              "fixed top-4 left-1/2 z-[100] flex items-center gap-2 rounded-xl px-4 py-3 shadow-xl border text-xs font-bold",
              toast.type === 'error' ? 'bg-rose-600 text-white border-rose-700' : 'bg-emerald-600 text-white border-emerald-700'
            )}
          >
            {toast.type === 'error' ? <X className="size-4"/> : <Sparkles className="size-4"/>}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 lg:flex justify-between p-4 z-30">
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold truncate">{user.email?.split('@')[0]}</span>
                    <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
                  </div>
                </div>
                <button onClick={() => signOut()} className="p-1 text-zinc-400 hover:text-rose-500">
                  <LogOut className="size-4"/>
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                <LogIn className="size-4"/>
                <span>Giriş Yap / Kayıt Ol</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Truck className="size-5"/>
            </div>
            <div>
              <p className="font-black text-sm tracking-tight text-blue-600 dark:text-blue-400">Nakliye Cepte</p>
              <p className="text-[10px] text-zinc-400 font-medium">Lojistik Asistanı</p>
            </div>
          </div>

          <nav className="space-y-1">
            {MODULES.map((m) => {
              const Icon = m.icon
              const isActive = active === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => handleTabChange(m.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
                    isActive 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4"/>
                    <span>{m.label}</span>
                  </div>
                  {m.badge && (
                    <span className="rounded-md bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 text-[9px] font-black text-blue-600 dark:text-blue-400">
                      {m.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            Sistem Çevrimiçi
          </span>
          <button onClick={toggleTheme} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Truck className="size-4"/>
            </div>
            <span className="font-extrabold text-sm">Nakliye Cepte</span>
          </div>

          <div className="hidden lg:flex items-center flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-2.5 size-4 text-zinc-400"/>
            <input 
              type="text" 
              placeholder="Şehir veya yük ara..." 
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 pl-9 pr-8 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleVoiceSearch} className={cn("absolute right-2 top-2 p-0.5", isListening && "text-rose-500 animate-pulse")}>
              <Mic className="size-3.5"/>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Bell className="size-4"/>
            </button>
            <button 
              onClick={() => handleTabChange('ekle')}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="size-4"/>
              <span>İlan Ekle</span>
            </button>
          </div>
        </header>

        {/* CONTENT MAIN */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-white">{TITLES[active].title}</h1>
                <p className="text-xs text-zinc-500">{TITLES[active].desc}</p>
              </div>
              {active === 'pazar' && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                  <MapPin className="size-3.5"/>
                  <span>Canlı Akış</span>
                </div>
              )}
            </div>

            <div className="w-full">
              {active === 'pazar' && <ListingsView/>}
              {active === 'ekle' && <AddListingForm onCreated={() => handleTabChange('pazar')} />}
              {active === 'finans' && <FinanceView/>}
              {active === 'takograf' && <TachographCalculator/>}
              {active === 'sefer' && <TripCalculator/>}
              {active === 'yakit' && <FuelCalculator/>}
              {active === 'notlar' && <NotesView/>}
            </div>
          </div>
        </main>

        {/* MOBIL DOCK */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 py-2 lg:hidden backdrop-blur-md">
          <button onClick={() => handleTabChange('pazar')} className={cn("flex flex-col items-center gap-1 text-[10px] font-bold", active === 'pazar' ? "text-blue-600" : "text-zinc-500")}>
            <Store className="size-5"/>
            <span>Pazar</span>
          </button>

          <button onClick={() => setIsToolsSheetOpen(true)} className={cn("flex flex-col items-center gap-1 text-[10px] font-bold", ['takograf', 'sefer', 'yakit'].includes(active) ? "text-blue-600" : "text-zinc-500")}>
            <Calculator className="size-5"/>
            <span>Araçlar</span>
          </button>

          <button onClick={() => handleTabChange('ekle')} className="flex size-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
            <PlusCircle className="size-6"/>
          </button>

          <button onClick={() => handleTabChange('finans')} className={cn("flex flex-col items-center gap-1 text-[10px] font-bold", active === 'finans' ? "text-blue-600" : "text-zinc-500")}>
            <Wallet className="size-5"/>
            <span>Finans</span>
          </button>

          <button onClick={() => setIsMoreSheetOpen(true)} className={cn("flex flex-col items-center gap-1 text-[10px] font-bold", active === 'notlar' ? "text-blue-600" : "text-zinc-500")}>
            <User className="size-5"/>
            <span>Profil</span>
          </button>
        </nav>
      </div>

      {/* ARAÇLAR SHEET */}
      <AnimatePresence>
        {isToolsSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
            <div onClick={() => setIsToolsSheetOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full rounded-t-2xl bg-white dark:bg-zinc-900 p-5">
              <h3 className="text-sm font-bold mb-3">Hesaplama Araçları</h3>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleTabChange('takograf')} className="flex flex-col items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs font-bold gap-2">
                  <Timer className="size-5 text-blue-600"/>
                  <span>Takograf</span>
                </button>
                <button onClick={() => handleTabChange('sefer')} className="flex flex-col items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs font-bold gap-2">
                  <Calculator className="size-5 text-indigo-600"/>
                  <span>Sefer</span>
                </button>
                <button onClick={() => handleTabChange('yakit')} className="flex flex-col items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs font-bold gap-2">
                  <Fuel className="size-5 text-emerald-600"/>
                  <span>Yakıt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROFİL SHEET */}
      <AnimatePresence>
        {isMoreSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
            <div onClick={() => setIsMoreSheetOpen(false)} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full rounded-t-2xl bg-white dark:bg-zinc-900 p-5 space-y-3">
              <button onClick={() => handleTabChange('notlar')} className="flex w-full items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <NotebookPen className="size-4 text-blue-600"/>
                  <span>Notlarım</span>
                </div>
                <ChevronRight className="size-4 text-zinc-400"/>
              </button>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs font-bold">
                <span>Karanlık Mod</span>
                <button onClick={toggleTheme} className="px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700">
                  {isDarkMode ? 'Açık' : 'Koyu'}
                </button>
              </div>

              {user ? (
                <button onClick={() => { signOut(); setIsMoreSheetOpen(false); }} className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs font-bold">
                  Çıkış Yap
                </button>
              ) : (
                <button onClick={() => { setIsMoreSheetOpen(false); openAuthModal(); }} className="w-full p-3 rounded-xl bg-blue-600 text-white text-xs font-bold">
                  Giriş Yap
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AUTH MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={closeAuthModal} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl">
              <button onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400"><X className="size-4"/></button>
              <h3 className="text-base font-bold text-center mb-4">
                {authMode === 'login' && 'Giriş Yap'}
                {authMode === 'register' && 'Hesap Oluştur'}
                {authMode === 'forgot' && 'Şifre Sıfırla'}
              </h3>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Posta" className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs" />
                {authMode !== 'forgot' && (
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-2.5 text-xs" />
                )}
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">
                  {loading ? <Loader2 className="size-4 animate-spin mx-auto"/> : 'Devam Et'}
                </button>
              </form>

              <div className="mt-3 text-center text-xs text-zinc-500">
                {authMode === 'login' ? (
                  <button onClick={() => setAuthMode('register')} className="text-blue-600 font-bold">Kayıt Ol</button>
                ) : (
                  <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold">Giriş Yap</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export function AppShell() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white text-xs">
        Yükleniyor...
      </div>
    }>
      <AppShellContent />
    </Suspense>
  )
}
