'use client'

import { useEffect } from 'react'
import type { Ilan } from '@/lib/types'
import { timeAgo, whatsappLink, telLink } from '@/lib/format'
import {
  ArrowRight,
  MapPin,
  Package,
  Clock,
  Phone,
  MessageCircle,
  X,
  User,
} from 'lucide-react'

export function ListingDetail({ ilan, onClose }: { ilan: any | null; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (ilan) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [ilan, onClose])

  if (!ilan) return null

  // Metin & Gönderici Tanımlamaları (Supabase 'content' desteği eklendi)
  const rawText = ilan?.mesaj_metni || ilan?.message || ilan?.icerik || ilan?.text || ilan?.aciklama || ilan?.content || ''
  const sender = ilan?.ilan_sahibi || ilan?.username || ilan?.sender || 'Telegram Grubu'
  
  // Telefon Yakalama
  const phoneRegex = /(?:0\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})|(?:05\d{9})|(?:\+90\s*5\d{9})/g
  const phoneMatch = typeof rawText === 'string' ? rawText.match(phoneRegex) : null
  const phone = ilan?.telefon || ilan?.phone || (phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : null)

  // Rota Tanımlamaları (Supabase city_from & city_to desteği)
  const origin = ilan?.city_from || ilan?.kalkis || null
  const destination = ilan?.city_to || ilan?.varis || null

  const waText = `Merhaba, ${sender} grubundaki ilanınız için arıyorum.`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        
        {/* Üst Başlık */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex flex-col gap-1.5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              <Package className="size-3.5" /> Telegram İlanı
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {timeAgo(ilan?.ilan_tarihi || ilan?.created_at)}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer">
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Gönderici Bilgisi */}
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground bg-muted p-3 rounded-xl">
            <User className="size-4 text-primary" />
            <span>Gönderen: {sender}</span>
          </div>

          {/* Rota Görünümü (Hero Banner) */}
          {(origin || destination) && (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/40">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MapPin className="size-4 text-primary shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/70">Kalkış</span>
                  <span className="text-xs font-bold text-foreground truncate">{origin || 'Belirtilmedi'}</span>
                </div>
              </div>

              <div className="flex items-center px-2 shrink-0 text-muted-foreground/40">
                <div className="h-[2px] w-3 bg-border" />
                <ArrowRight className="size-3.5 text-primary/70 mx-0.5" />
                <div className="h-[2px] w-3 bg-border" />
              </div>

              <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                <div className="flex flex-col min-w-0 items-end">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/70">Varış</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">{destination || 'Belirtilmedi'}</span>
                </div>
              </div>
            </div>
          )}

          {/* İlan Metni */}
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
              {rawText || 'İlan metni içeriği bulunmuyor.'}
            </p>
          </div>
        </div>

        {/* İletişim Butonları */}
        <div className="grid grid-cols-2 gap-3 border-t border-border p-5 bg-card">
          {phone ? (
            <>
              <a href={telLink(phone)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                <Phone className="size-4" /> Ara
              </a>
              <a href={whatsappLink(phone, waText)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center rounded-xl bg-muted/40 py-3 text-xs font-medium text-muted-foreground border border-border/40">
              Telefon numarası tespit edilemedi
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
