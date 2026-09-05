'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Truck, Store, PlusCircle, Wallet, LogOut, X, Loader2,
  Sun, Moon, ArrowLeft, ChevronRight, User, Search, Bell,
  MapPin, CheckCircle2, ShieldCheck, Clock, Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Lazy Loading Modüller
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
    <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
        <Loader2 className="size-4 animate-spin text-blue-600" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  )
}

type ModuleId = 'dashboard' | 'pazar' | 'ekle' | 'ilanlarim' | 'sizden-gelenler' | 'finans' | 'takograf' | 'sefer' | 'yakit' | 'notlar' | 'profil'

export function AppShellContent() {
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
  const [pazarCount, setPazarCount] = useState<number | null>(null)

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true)
    fetchCounts()
  }, [])

  const fetchCounts = async () => {
    try {
      const { count, error } = await supabase.from('listings').select('*', { count: 'exact', head: true })
      if (!error && count !== null) setPazarCount(count)
    } catch (err) {
      console.error(err)
    }
  }

  const showToast = (type: 'error' | 'success', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
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
        showToast('success', 'Giriş başarılı!')
        closeAuthModal()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showToast('success', 'Kayıt başarıyla oluşturuldu!')
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
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      
      {/* Toast Bildirimi */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-2xl text-xs font-bold border transition-all animate-in fade-in slide-in-from-top-2",
          toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500' : 'bg-emerald-600 text-white border-emerald-500'
        )}>
          {toast.type === 'error' ? <X className="size-4"/> : <CheckCircle2 className="size-4"/>}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Mobil Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 z-20">
        <div className="flex items-center gap-2.5">
          {activeTab !== 'dashboard' ? (
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-all"
            >
              <ArrowLeft className="size-4 text-blue-600 dark:text-blue-400" />
              <span>Geri</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                <Truck className="size-5" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight leading-tight">Nakliye Cepte</h1>
                <p className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Lojistik Portalı</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            type="button" 
            onClick={() => navigateTo('pazar')} 
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all"
            title="İlan Ara"
          >
            <Search className="size-4"/>
          </button>

          <button 
            type="button" 
            onClick={toggleTheme} 
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all"
          >
            {isDarkMode ? <Sun className="size-4"/> : <Moon className="size-4"/>}
          </button>

          {user ? (
            <button 
              type="button" 
              onClick={() => navigateTo('profil')}
              className="flex size-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-xs border border-blue-100 dark:border-blue-900/40"
            >
              {user.email?.[0].toUpperCase()}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => openAuthModal()}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-extrabold shadow-sm active:scale-95 transition-all"
            >
              Giriş
            </button>
          )}
        </div>
      </header>

      {/* Ana Ekran Gövdesi */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="mx-auto max-w-lg space-y-5">

          {activeTab === 'dashboard' && (
            <>
              {/* Hızlı Aksiyon Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-lg shadow-blue-600/15">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md">
                      <ShieldCheck className="size-3" /> Güvenli Taşımacılık
                    </span>
                    <h2 className="text-base font-black">Yük veya Araç İlanı Verin</h2>
                    <p className="text-xs text-blue-100 font-medium">Binlerce nakliyeci ve yük verene anında ulaşın.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('ekle')}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white text-blue-700 py-2.5 text-xs font-black shadow-md active:scale-[0.98] transition-all"
                >
                  <PlusCircle className="size-4" />
                  <span>Hızlı İlan Oluştur</span>
                </button>
              </div>

              {/* Ana İstatistikler (Sadeleştirilmiş) */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => navigateTo('pazar')}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">İlan Pazarı</span>
                    <Store className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">
                    {pazarCount !== null ? pazarCount : '128'}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    • Canlı Akış
                  </span>
                </div>

                <div 
                  onClick={() => navigateTo('finans')}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Cüzdan & Gelir</span>
                    <Wallet className="size-4 text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-zinc-900 dark:text-white">Finans</p>
                  <span className="text-[10px] font-bold text-zinc-400">Gider & Navlun</span>
                </div>
              </div>

              {/* Hızlı Araçlar Menüsü */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">Sürücü Araçları</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'takograf', title: 'Takograf', desc: 'Sürüş Süresi', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
                    { id: 'sefer', title: 'Sefer Hesabı', desc: 'Maliyet & Kâr', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
                    { id: 'yakit', title: 'Yakıt Hesabı', desc: 'Menzil Testi', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id as ModuleId)}
                      className="flex flex-col items-center text-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 active:scale-95 transition-all"
                    >
                      <div className={cn("size-9 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5", item.color)}>
                        <Layers className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.title}</span>
                      <span className="text-[9px] text-zinc-400 mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Canlı İlan Akışı */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Son İlanlar</h3>
                  <button type="button" onClick={() => navigateTo('pazar')} className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    Tümünü Gör
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    { route: 'İstanbul ➔ İzmir', detail: '24 Ton Tenteli • Komple', price: '₺38.500', time: '10 dk önce' },
                    { route: 'Ankara ➔ Mersin', detail: '18 Ton Frigo • Parça', price: '₺29.000', time: '25 dk önce' },
                    { route: 'Bursa ➔ Adana', detail: '22 Ton Açık Kasa', price: '₺42.000', time: '1 saat önce' },
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => navigateTo('pazar')}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-black text-zinc-900 dark:text-white">{item.route}</span>
                        </div>
                        <p className="text-[10px] font-medium text-zinc-500 pl-5">{item.detail}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">{item.price}</span>
                        <span className="text-[9px] text-zinc-400 flex items-center justify-end gap-0.5">
                          <Clock className="size-2.5" /> {item.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Dinamik Yüklenen Modüller */}
          <div>
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

      {/* Mobil Alt Menü (Bottom Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-2 z-30 shadow-lg">
        {[
          { id: 'dashboard', title: 'Ana Sayfa', icon: Truck },
          { id: 'pazar', title: 'İlan Pazarı', icon: Store },
          { id: 'ekle', title: 'İlan Ver', icon: PlusCircle, highlight: true },
          { id: 'sizden-gelenler', title: 'Sürücüler', icon: Layers },
          { id: 'finans', title: 'Finans', icon: Wallet },
        ].map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          if (item.highlight) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id as ModuleId)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 active:scale-90 transition-transform">
                  <Icon className="size-6" />
                </div>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-1">{item.title}</span>
              </button>
            )
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id as ModuleId)}
              className={cn(
                "flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all",
                isActive 
                  ? "text-blue-600 dark:text-blue-400 font-black" 
                  : "text-zinc-400 dark:text-zinc-500 font-medium hover:text-zinc-600"
              )}
            >
              <Icon className={cn("size-5 mb-0.5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] tracking-tight">{item.title}</span>
            </button>
          )
        })}
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAuthModal} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs rounded-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <button type="button" onClick={closeAuthModal} className="absolute right-4 top-4 text-zinc-400">
              <X className="size-5"/>
            </button>

            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600">
                <Truck className="size-5"/>
              </div>
              <h3 className="text-base font-black">{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="E-posta" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Şifre" 
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:outline-none focus:border-blue-500" 
              />
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                {loading ? <Loader2 className="size-4 animate-spin"/> : (authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol')}
              </button>
            </form>

            <div className="mt-3 text-center">
              <button 
                type="button" 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
                className="text-xs font-bold text-blue-600 dark:text-blue-400"
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

function ProfileView({ user, openAuthModal, signOut }: { user: any; openAuthModal?: () => void; signOut?: () => void }) {
  const auth = useAuth()
  const handleOpenAuth = openAuthModal || auth?.openAuthModal

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-3">
        <User className="size-8 text-blue-600" />
        <h3 className="text-sm font-black">Profil Yönetimi</h3>
        <button
          type="button"
          onClick={() => handleOpenAuth && handleOpenAuth()}
          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black">Hesap Bilgileri</h2>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <p className="text-xs font-bold">E-Posta: {user.email}</p>
        <button
          type="button"
          onClick={() => signOut && signOut()}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
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
