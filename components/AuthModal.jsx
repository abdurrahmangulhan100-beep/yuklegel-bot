'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, LogIn, UserPlus, ArrowRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setMessage(null)
    setEmail('')
    setPassword('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Giriş başarılı! Yönlendiriliyorsunuz...' })
        setTimeout(() => handleClose(), 800)
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Kayıt başarılı! Giriş yapabilirsiniz.' })
        setMode('login')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Bir işlem hatası oluştu.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
        
        {/* Kapat Butonu */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Başlık İkonu & Metinler */}
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            {mode === 'login' && <LogIn className="size-6" />}
            {mode === 'register' && <UserPlus className="size-6" />}
            {mode === 'forgot' && <Lock className="size-6" />}
          </div>

          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
            {mode === 'login' && <span>🔑 Giriş Yap</span>}
            {mode === 'register' && <span>📝 Kayıt Ol</span>}
            {mode === 'forgot' && <span>🔒 Şifre Sıfırla</span>}
          </h2>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Bu özelliği kullanmak için ücretsiz giriş yapın.
          </p>
        </div>

        {/* Bildirim Kutusu */}
        {message && (
          <div
            className={cn(
              "mb-4 rounded-xl p-3 text-xs font-bold text-center border",
              message.type === 'error'
                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
            )}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="email"
              placeholder="E-posta Adresiniz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 py-3 pl-10 pr-4 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <input
                type="password"
                placeholder="Şifreniz"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 py-3 pl-10 pr-4 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 transition-all"
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
        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('forgot')} className="hover:text-zinc-800 dark:hover:text-white transition-colors">
                Şifremi Unuttum?
              </button>
              <button onClick={() => setMode('register')} className="text-zinc-700 dark:text-zinc-300">
                Hesabın yok mu? <span className="text-blue-600 dark:text-blue-400 hover:underline">Kayıt Ol</span>
              </button>
            </>
          )}

          {mode === 'register' && (
            <div className="w-full text-center">
              <span>Zaten hesabın var mı? </span>
              <button onClick={() => setMode('login')} className="text-blue-600 dark:text-blue-400 hover:underline">
                Giriş Yap
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="w-full text-center">
              <button onClick={() => setMode('login')} className="text-blue-600 dark:text-blue-400 hover:underline">
                Giriş Ekranına Dön
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
