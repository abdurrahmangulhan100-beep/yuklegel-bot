'use client'

import { useAuth } from '@/lib/auth-context'
import { telLink } from '@/lib/format'
import { Phone, Lock } from 'lucide-react'

interface MaskedPhoneButtonProps {
  phone: string | null
}

export function MaskedPhoneButton({ phone }: MaskedPhoneButtonProps) {
  const { user, openAuthModal } = useAuth()

  if (!phone) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg bg-muted min-h-[44px] py-2.5 px-3 text-xs font-medium text-muted-foreground">
        Numara Belirtilmedi
      </div>
    )
  }

  // 1. Kullanıcı Giriş Yapmışsa -> Gerçek Numarayı ve Arama Linkini Göster
  if (user) {
    return (
      <a
        href={telLink(phone)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary min-h-[44px] py-2.5 px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.99]"
      >
        <Phone className="size-3.5" />
        <span>Hemen Ara ({phone.trim()})</span>
      </a>
    )
  }

  // 2. Kullanıcı Misafir ise -> Numarayı Maskele ve Tıklandığında Modalı Aç
  const maskedPhone = phone.trim().replace(/(\d{4})\d{3}(\d{2})(\d{2})/, '$1 *** $2 $3')

  return (
    <button
      type="button"
      onClick={() =>
        openAuthModal(
          'İlan sahibini aramak ve telefon numarasını tam görmek için ücretsiz giriş yapın.'
        )
      }
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 min-h-[44px] py-2.5 px-3 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
      title="Numarayı görmek için tıklayın"
    >
      <Lock className="size-3.5 text-amber-600" />
      <span>Numarayı Göster ({maskedPhone})</span>
    </button>
  )
}
