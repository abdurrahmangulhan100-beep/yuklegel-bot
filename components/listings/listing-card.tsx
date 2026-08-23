'use client'

import { useState } from 'react'
import { timeAgo } from '@/lib/format'
import { MaskedPhoneButton } from './masked-phone-button'
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Heart,
  Ban,
  ArrowRight,
  Maximize2,
  MapPin,
  Box
} from 'lucide-react'

interface ListingCardProps {
  ilan: any
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onBlockSender: (sender: string) => void
  onOpenModal: (ilan: any) => void
  isRecent: boolean
  cleanText?: string
  route?: { origin?: string | null; destination?: string | null }
  badges?: any[]
  phone?: string | null
}

export function ListingCard({
  ilan,
  isFavorite,
  onToggleFavorite,
  onBlockSender,
  onOpenModal,
  isRecent,
  cleanText: propCleanText,
  route: propRoute,
  badges: propBadges,
  phone: propPhone
}: ListingCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Metin & Gönderici Tanımlamaları
  const rawText = ilan?.mesaj_metni || ilan?.message || ilan?.icerik || ilan?.text || ilan?.aciklama || ilan?.content || ''
  const sender = ilan?.ilan_sahibi || ilan?.username || ilan?.sender || 'Lojistik Grubu'
  const dateVal = ilan?.ilan_tarihi || ilan?.created_at

  // Telefon Yakalama
  const phoneRegex = /(?:0\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})|(?:05\d{9})|(?:\+90\s*5\d{9})/g
  const phoneMatch = typeof rawText === 'string' ? rawText.match(phoneRegex) : null
  const phone = propPhone ?? (ilan?.telefon || ilan?.phone || (phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : null))

  // Temiz Metin Mantığı
  const cleanText = propCleanText ?? (typeof rawText === 'string' 
    ? rawText
        .replace(phoneRegex, '')
        .replace(/http[s]?:\/\/[^\s]+/g, '')
        .replace(/@[\w_]+/g, '')
        .replace(/[#*_~`]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '')

  // Rota Yakalama
  const origin = propRoute?.origin || ilan?.city_from || ilan?.kalkis || null
  const destination = propRoute?.destination || ilan?.city_to || ilan?.varis || null

  const isLong = cleanText.length > 110

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 transition-all duration-200 hover:border-primary/50 hover:shadow-md">
      
      {/* Sol Canlı Gösterge Çubuğu */}
      <div className={`absolute top-3 bottom-3 left-0 w-1 rounded-r-full ${isRecent ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-transparent group-hover:bg-primary/30'} transition-colors`} />

      <div>
        {/* 1. ÜST BARI: Gönderici, Zaman ve Aksiyonlar */}
        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2 text-xs">
          <div className="flex items-center gap-1.5 max-w-[60%] truncate">
            {isRecent && (
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </span>
            )}
            <span className="font-semibold text-muted-foreground/80 truncate text-[11px]">{sender}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Clock className="size-3 text-muted-foreground/70" />
              {timeAgo(dateVal)}
            </span>

            <button
              type="button"
              onClick={() => onOpenModal(ilan)}
              title="Detaylı İncele"
              className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Maximize2 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(String(ilan?.id || Math.random()))}
              title="Favori"
              className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-rose-500 cursor-pointer"
            >
              <Heart className={`size-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {sender !== 'Lojistik Grubu' && sender !== 'Telegram Grubu' && (
              <button
                type="button"
                onClick={() => onBlockSender(sender)}
                title="Engelle"
                className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
              >
                <Ban className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. ROTA VURGUSU (Net ve Büyük) */}
        <div className="mb-2.5 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 border border-primary/10">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground truncate uppercase tracking-wide">
              {origin || 'TÜRKİYE GENELİ'}
            </span>
          </div>

          <ArrowRight className="size-3.5 text-primary/60 mx-2 shrink-0" />

          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate uppercase tracking-wide">
              {destination || 'SERBEST'}
            </span>
          </div>
        </div>

        {/* 3. ROZETLER (Araç Tipi, Kasa vb.) */}
        {propBadges && propBadges.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {propBadges.map((b: any, idx: number) => {
              const isSimpleString = typeof b === 'string'
              const IconComp = (!isSimpleString && typeof b?.icon === 'function') ? b.icon : Box

              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border tracking-wide uppercase ${
                    isSimpleString 
                      ? 'bg-muted/70 text-foreground border-border/80' 
                      : (b?.style || b?.color || 'bg-muted/70 text-foreground border-border/80')
                  }`}
                >
                  {!isSimpleString && <IconComp className="size-2.5 shrink-0" />}
                  {isSimpleString ? b : b?.label}
                </span>
              )
            })}
          </div>
        )}

        {/* 4. TEMİZLENMİŞ HAM MESAJ (Göz Yormayan Gri Tipografi) */}
        <div className="relative mb-2">
          <p className={`text-[12px] leading-relaxed text-muted-foreground/80 font-normal capitalize-first ${!expanded ? 'line-clamp-2' : ''}`}>
            {cleanText || 'İçerik açıklaması bulunmuyor.'}
          </p>

          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              {expanded ? (
                <>Daha az göster <ChevronUp className="size-3" /></>
              ) : (
                <>Devamını oku <ChevronDown className="size-3" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 5. ALT AKSİYON (Telefon / WhatsApp Butonu) */}
      <div className="mt-2 border-t border-border/40 pt-2">
        {phone ? (
          <MaskedPhoneButton phone={phone} />
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/30 py-1.5 px-3 text-[11px] font-medium text-muted-foreground/60 border border-border/30">
            <span>Numara Belirtilmedi</span>
          </div>
        )}
      </div>

    </div>
  )
}
