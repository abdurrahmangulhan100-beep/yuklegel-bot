'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  X,
  Lock,
  Mail,
  KeyRound,
  LogIn,
  UserPlus,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, modalReason } = useAuth()
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success' | ''; text: string }>({
    type: '',
    text: '',
  })
  const [loading, setLoading] = useState(false)

  if (!isAuthModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        setMessage({ type: 'success', text: 'Giriş başarılı! Yönlendiriliyorsunuz...' })
        setTimeout(() => {
          closeAuthModal()
        }, 800)
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        
        setMessage({ type: 'success', text: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' })
        setMode('login')
      } else if (mode === 'forgot') {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        })
        if (error) throw error
        
        setMessage({
          type: 'success',
          text: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
        })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Bir hata oluştu.' })
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode)
    setMessage({ type: '', text: '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
        
        {/* Kapatma Butonu */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Başlık & İkon */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-3">
            {mode === 'login' && <LogIn className="size-6" />}
            {mode === 'register' && <UserPlus className="size-6" />}
            {mode === 'forgot' && <KeyRound className="size-6" />}
          </div>

          <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
            {mode === 'login' && '🔑 Giriş Yap'}
            {mode === 'register' && '📝 Kayıt Ol'}
            {mode === 'forgot' && '🔒 Şifremi Unuttum'}
          </h3>

          <p className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
            {modalReason || 'Bu özelliği kullanmak için ücretsiz giriş yapın.'}
          </p>
        </div>

        {/* Bilgilendirme Mesaj Kutusu */}
        {message.text && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-bold border text-center ${
              message.type === 'error'
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              required
              placeholder="E-posta Adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 py-3 pl-10 pr-4 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all min-h-[44px]"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 py-3 pl-10 pr-4 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all min-h-[44px]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] min-h-[44px] py-3 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Giriş Yap'}
                  {mode === 'register' && 'Kayıt Ol'}
                  {mode === 'forgot' && 'Sıfırlama Linki Gönder'}
                </span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Alt Geçiş Bağlantıları */}
        <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-xs font-bold flex justify-between items-center text-zinc-500 dark:text-zinc-400">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Şifremi Unuttum?
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
              >
                Hesabın yok mu? <span className="text-blue-600 dark:text-blue-400 hover:underline">Kayıt Ol</span>
              </button>
            </>
          )}

          {mode === 'register' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-center hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Zaten hesabın var mı? <span className="text-blue-600 dark:text-blue-400 hover:underline">Giriş Yap</span>
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-center text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              ← Giriş Ekranına Dön
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
