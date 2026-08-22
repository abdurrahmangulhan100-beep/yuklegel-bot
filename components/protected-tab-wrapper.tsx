'use client'

import { useStore } from '@/lib/store'
import { Lock, LogIn, PlusCircle, NotebookPen } from 'lucide-react'

interface ProtectedTabWrapperProps {
  children: React.ReactNode
  type: 'add-listing' | 'notes'
}

export function ProtectedTabWrapper({ children, type }: ProtectedTabWrapperProps) {
  const { user, setAuthModalOpen } = useStore()

  if (!user) {
    const isListing = type === 'add-listing'

    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center rounded-2xl border border-dashed border-border bg-card shadow-sm my-6 animate-in fade-in duration-300">
        <div className="p-4 bg-primary/10 rounded-full mb-4 text-primary">
          {isListing ? <PlusCircle className="size-10" /> : <NotebookPen className="size-10" />}
        </div>

        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-300/40">
          <Lock className="size-3.5" />
          <span>Üyelik Gereklidir</span>
        </div>

        <h3 className="text-xl font-bold text-foreground mb-2">
          {isListing ? 'İlan Yayınlamak İçin Giriş Yapın' : 'Notlarınızı Görmek İçin Giriş Yapın'}
        </h3>

        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          {isListing
            ? 'Yük veya boş araç ilanınızı hemen pazarda yayınlamak, gruptaki binlerce nakliyeciye ulaşmak için hesabınıza giriş yapın.'
            : 'Bakım, muayene, takograf, sigorta ve kişisel hatırlarmanızı güvenle kaydetmek ve takip etmek için hesabınıza giriş yapın.'}
        </p>

        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-2.5 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 text-sm"
        >
          <LogIn className="size-4" />
          <span>Giriş Yap / Kayıt Ol</span>
        </button>
      </div>
    )
  }

  return <>{children}</>
}
