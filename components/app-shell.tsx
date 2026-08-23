'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Eye, EyeOff, Moon, Sun, ChevronDown, Settings, Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ModuleId = 'pazar' | 'ekle' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar'

const MODULES: { id: ModuleId; label: string; short: string; icon: typeof Store }[] = [
  { id: 'pazar', label: 'İlan Pazarı', short: 'Pazar', icon: Store },
  { id: 'ekle', label: 'İlan Ekle', short: 'Ekle', icon: PlusCircle },
  { id: 'finans', label: 'Gider & Kazanç', short: 'Finans', icon: Wallet },
  { id: 'takograf', label: 'Takograf Asistanı', short: 'Takograf', icon: Timer },
  { id: 'sefer', label: 'Sefer Hesabı', short: 'Sefer', icon: Calculator },
  { id: 'yakit', label: 'Yakıt Hesabı', short: 'Yakıt', icon: Fuel },
  { id: 'notlar', label: 'Notlarım', short: 'Notlar', icon: NotebookPen },
]

const TITLES: Record<ModuleId, { title: string; desc: string }> = {
  pazar: { title: 'Canlı İlan Pazarı', desc: 'Bot ağından gelen güncel yük ve boş araç ilanları.' },
  ekle: { title: 'Yeni İlan Ekle', desc: 'Yük veya boş araç ilanınızı yayınlayın.' },
  finans: { title: 'Gider & Kazanç Defteri', desc: 'Navlun gelirlerinizi ve sefer masraflarınızı kaydedin, net kârınızı takip edin.' },
  takograf: { title: 'Takograf & Sürüş Süresi Asistanı', desc: 'Yasal sürüş/mola sürelerinizi canlı takip edin, cezalardan korunun.' },
  sefer: { title: 'Sefer Maliyet & Kâr Hesaplayıcı', desc: 'Gerçek giderlerinizi girin, net kârınızı görün.' },
  yakit: { title: 'Hızlı Yakıt Hesabı', desc: 'Yol maliyetini saniyeler içinde hesaplayın.' },
  notlar: { title: 'Pratik Notlar & Takip', desc: 'Bakım, muayene ve sigorta hatırlatmaları.' },
}

function AppShellContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = (searchParams.get('tab') as ModuleId) || 'pazar'

  const { user, signOut, isAuthModalOpen, openAuthModal, closeAuthModal, modalReason } = useAuth()
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (id: ModuleId) => {
    router.push(`?tab=${id}`, { scroll: false })
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* GLOBAL TOAST BİLDİRİMİ */}
      {toast && (
        <div
          className={cn(
            "fixed top-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-5",
            toast.type === 'error' 
              ? 'bg-rose-500/90 text-white border-rose-600/50 shadow-rose-500/20' 
              : 'bg-emerald-500/90 text-white border-emerald-600/50 shadow-emerald-500/20'
          )}
        >
          {toast.type === 'error' ? <X className="size-5" /> : <Sparkles className="size-5" />}
          <span className="text-sm font-semibold">{toast.text}</span>
        </div>
      )}

      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden w-72 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <Truck className="size-6" />
          </div>
          <div className="leading-tight">
            <p className="font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-lg">Nakliye Cepte</p>
            <p className="text-xs text-zinc-400 font-medium">Pro Asistan</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto pb-4 [scrollbar-width:none]">
          <div className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Modüller</div>
          {MODULES.map((m) => {
            const Icon = m.icon
            const isActive = active === m.id
            return (
              <button
                key={m.id}
                onClick={() => handleTabChange(m.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                  isActive 
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <Icon className="relative z-10 size-5" />
                <span className="relative z-10">{m.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* SAĞ ANA İÇERİK */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
              <Truck className="size-5" />
            </div>
            <p className="font-extrabold tracking-tight text-zinc-900 dark:text-white">Nakliye Cepte</p>
          </div>

          <div className="hidden lg:flex items-center gap-2">
             <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
               <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
               Sistem Aktif
             </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={toggleTheme} 
              className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 pr-3 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                    <User className="size-4" />
                  </div>
                  <span className="hidden text-sm font-semibold sm:block max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="size-4 text-zinc-400" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="mb-2 px-3 py-2">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Oturum açıldı:</p>
                      <p className="truncate text-sm font-bold">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <Settings className="size-4" /> Profil Ayarları
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      <Bell className="size-4" /> Bildirimler
                    </button>
                    <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    <button
                      onClick={() => { signOut(); setIsProfileOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="size-4" /> Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95"
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Giriş Yap</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pb-24 lg:pb-8 relative">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  {TITLES[active].title}
                </h1>
              </div>
              <p className="text-base text-zinc-500 dark:text-zinc-400 max-w-2xl">
                {TITLES[active].desc}
              </p>
            </div>

            <div key={active} className="w-full animate-in fade-in duration-200">
              {active === 'pazar' && <ListingsView />}
              {active === 'ekle' && <AddListingForm onCreated={() => handleTabChange('pazar')} />}
              {active === 'finans' && <FinanceView />}
              {active === 'takograf' && <TachographCalculator />}
              {active === 'sefer' && <TripCalculator />}
              {active === 'yakit' && <FuelCalculator />}
              {active === 'notlar' && <NotesView />}
            </div>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 p-2 pb-safe backdrop-blur-xl lg:hidden shadow-lg">
          {MODULES.map((m) => {
            const Icon = m.icon
            const isActive = active === m.id
            return (
              <button
                key={m.id}
                onClick={() => handleTabChange(m.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl p-2 min-w-[64px] transition-colors",
                  isActive ? "bg-blue-50 dark:bg-blue-500/15" : ""
                )}
              >
                <Icon className={cn("relative z-10 size-5 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400")} />
                <span className={cn("relative z-10 text-[10px] font-semibold transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400")}>
                  {m.short}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => closeAuthModal()} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 p-8 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => closeAuthModal()}
              className="absolute right-6 top-6 flex size-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                <LogIn className="size-7" />
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                {authMode === 'login' && 'Tekrar Hoş Geldiniz'}
                {authMode === 'register' && 'Hesap Oluşturun'}
                {authMode === 'forgot' && 'Şifre Sıfırlama'}
              </h2>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 size-5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 pl-11 pr-4 py-3.5 text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              {authMode !== 'forgot' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Şifre</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 size-5 text-zinc-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 pl-11 pr-12 py-3.5 text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 disabled:opacity-70 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : (authMode === 'login' ? 'Giriş Yap' : authMode === 'register' ? 'Kayıt Ol' : 'Bağlantı Gönder')}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center space-y-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {authMode === 'login' && (
                <>
                  <button type="button" onClick={() => { setAuthMode('forgot'); setToast(null); }} className="hover:text-zinc-900 dark:hover:text-white transition-colors">Şifremi Unuttum</button>
                  <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
                  <span className="flex gap-1">Hesabınız yok mu? <button type="button" onClick={() => { setAuthMode('register'); setToast(null); }} className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Kayıt Olun</button></span>
                </>
              )}
              {authMode === 'register' && (
                <span className="flex gap-1">Zaten hesabınız var mı? <button type="button" onClick={() => { setAuthMode('login'); setToast(null); }} className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Giriş Yapın</button></span>
              )}
              {authMode === 'forgot' && (
                <button type="button" onClick={() => { setAuthMode('login'); setToast(null); }} className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">Giriş Ekranına Dön</button>
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
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    }>
      <AppShellContent />
    </Suspense>
  )
}
