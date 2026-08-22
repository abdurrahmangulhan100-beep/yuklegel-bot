'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Lock, ShieldAlert } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  title?: string
  description?: string
}

export function AuthGuard({
  children,
  title = 'Bu Sekme Üyelere Özeldir',
  description = 'İlan eklemek, not tutmak ve özel gruplara erişmek için ücretsiz giriş yapmalısınız.',
}: AuthGuardProps) {
  const { user, loading, openAuthModal } = useAuth()

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Kullanıcı giriş yapmışsa korunan içeriği göster
  if (user) {
    return <>{children}</>
  }

  // Giriş yapmamışsa Kilitli Ekran Göster
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm my-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4 border border-amber-500/20">
        <Lock className="size-7" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
        {description}
      </p>

      <button
        type="button"
        onClick={() => openAuthModal(description)}
        className="mt-5 flex items-center gap-2 rounded-xl bg-primary min-h-[44px] px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
      >
        <ShieldAlert className="size-4" />
        <span>Hemen Ücretsiz Giriş Yap</span>
      </button>
    </div>
  )
}
