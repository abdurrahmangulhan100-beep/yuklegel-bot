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
        }, 1000)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Kapatma Butonu */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Başlık & İkon */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            {mode === 'login' && <LogIn className="size-6" />}
            {mode === 'register' && <UserPlus className="size-6" />}
            {mode === 'forgot' && <KeyRound className="size-6" />}
          </div>

          <h3 className="text-xl font-bold text-foreground">
            {mode === 'login' && '🔑 Giriş Yap'}
            {mode === 'register' && '📝 Kayıt Ol'}
            {mode === 'forgot' && '🔒 Şifremi Unuttum'}
          </h3>

          <p className="mt-1.5 text-xs text-muted-foreground max-w-xs leading-relaxed">
            {modalReason || 'Lojistik fırsatlarına erişmek ve işlemlerinizi yönetmek için oturum açın.'}
          </p>
        </div>

        {/* Bilgilendirme Mesaj Kutusu */}
        {message.text && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-medium border text-center ${
              message.type === 'error'
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              placeholder="E-posta Adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary min-h-[44px] py-2.5 px-4 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
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
        <div className="mt-5 border-t border-border/60 pt-4 text-xs flex justify-between items-center text-muted-foreground">
          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Şifremi Unuttum?
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="hover:text-primary font-semibold text-foreground transition-colors cursor-pointer"
              >
                Hesabın yok mu? <span className="text-primary underline">Kayıt Ol</span>
              </button>
            </>
          )}

          {mode === 'register' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-center hover:text-primary font-semibold text-foreground transition-colors cursor-pointer"
            >
              Zaten hesabın var mı? <span className="text-primary underline">Giriş Yap</span>
            </button>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-center hover:text-primary font-semibold text-foreground transition-colors cursor-pointer"
            >
              ← Giriş Ekranına Dön
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
