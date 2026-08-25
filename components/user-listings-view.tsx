'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Phone, Building2, Loader2, RefreshCw, Search, X } from 'lucide-react'

export interface UserListing {
  id: string
  created_at: string
  user_id: string
  type: 'yuk' | 'bos_arac'
  kalkis_il: string
  kalkis_ilce?: string
  varis_il: string
  varis_ilce?: string
  yuk_cinsi?: string
  tonaj?: number
  hacim?: number
  fiyat?: number
  price_type?: string
  kdv_status?: string
  aciklama?: string
  firma_adi?: string
  telefon: string
}

export function UserListingsView() {
  const [listings, setListings] = useState<UserListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // 1. Veritabanından ilanları çekme fonksiyonu
  const fetchListings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setListings(data as UserListing[])
    } catch (err) {
      console.error('İlanlar çekilirken hata oluştu:', err)
    } font-sans {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()

    // 2. Realtime Aboneliği: Herhangi bir kullanıcı yeni ilan eklediğinde anında ekrana düşer
    const channel = supabase
      .channel('realtime_user_listings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_listings' },
        (payload) => {
          setListings((prev) => [payload.new as UserListing, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Şehir, ilçe, yük cinsi, firma adı ve açıklamada arama yapma
  const filteredListings = listings.filter((item) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true

    return (
      item.kalkis_il?.toLowerCase().includes(term) ||
      item.kalkis_ilce?.toLowerCase().includes(term) ||
      item.varis_il?.toLowerCase().includes(term) ||
      item.varis_ilce?.toLowerCase().includes(term) ||
      item.yuk_cinsi?.toLowerCase().includes(term) ||
      item.firma_adi?.toLowerCase().includes(term) ||
      item.aciklama?.toLowerCase().includes(term)
    )
  })

  const formatPriceType = (type?: string) => {
    switch (type) {
      case 'ton': return 'Ton Başı'
      case 'm3': return 'm³ Başı'
      case 'teklif': return 'Teklif Usulü'
      default: return 'Toplam'
    }
  }

  const formatKdvStatus = (status?: string) => {
    switch (status) {
      case 'haric': return '+ %20 KDV'
      case 'kdv_siz': return 'KDV\'siz'
      default: return 'KDV Dahil'
    }
  }

  return (
    <div className="space-y-4">
      {/* BAŞLIK & YENİLE BUTONU */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white">Sizden Gelen İlanlar</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Kullanıcılar ve nakliyeciler tarafından eklenen güncel ilanlar.
          </p>
        </div>
        <button
          onClick={fetchListings}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* ARAMA ÇUBUĞU */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="İl, ilçe, firma adı veya yük tipine göre arayın (örn: İstanbul, Ilgın, Mermer)..."
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-10 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* İLAN LİSTESİ */}
      {loading ? (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
          <Loader2 className="size-6 animate-spin text-blue-600" />
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center bg-white/50 dark:bg-zinc-900/50">
          <Truck className="size-10 text-zinc-400 mb-2" />
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
            {searchTerm ? 'Aramanıza uygun ilan bulunamadı' : 'Henüz yayınlanmış bir ilan yok'}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {searchTerm
              ? 'Farklı bir il, ilçe veya anahtar kelime ile tekrar arama yapabilirsiniz.'
              : 'İlk ilanı oluşturmak için "İlan Ekle" bölümünü kullanabilirsiniz.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              className="relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-blue-500/50 transition-all"
            >
              <div>
                {/* Güzergah ve Rozet */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
                  <div className="flex items-center gap-2 font-black text-sm text-zinc-900 dark:text-white">
                    <MapPin className="size-4 text-blue-600 shrink-0" />
                    <span>{item.kalkis_il} {item.kalkis_ilce ? `(${item.kalkis_ilce})` : ''}</span>
                    <span className="text-zinc-400">➔</span>
                    <span>{item.varis_il} {item.varis_ilce ? `(${item.varis_ilce})` : ''}</span>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                      item.type === 'bos_arac'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50'
                    }`}
                  >
                    {item.type === 'bos_arac' ? 'Boş Araç' : 'Yük İlanı'}
                  </span>
                </div>

                {/* Yük Detayları */}
                <div className="grid grid-cols-3 gap-2 text-xs text-zinc-600 dark:text-zinc-400 mb-3 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl">
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-medium">Tip</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.yuk_cinsi || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-medium">Tonaj</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.tonaj ? `${item.tonaj} Ton` : '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-medium">Hacim</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.hacim ? `${item.hacim} m³` : '-'}</span>
                  </div>
                </div>

                {/* Açıklama */}
                {item.aciklama && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2 italic">
                    "{item.aciklama}"
                  </p>
                )}
              </div>

              {/* Fiyat ve İletişim */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-black text-blue-600 dark:text-blue-400 text-base">
                    {item.price_type === 'teklif' || !item.fiyat
                      ? 'Teklif Alınacak'
                      : `${item.fiyat.toLocaleString('tr-TR')} ₺`}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {formatPriceType(item.price_type)} • {formatKdvStatus(item.kdv_status)}
                  </p>
                  {item.firma_adi && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1 mt-1">
                      <Building2 className="size-3" /> {item.firma_adi}
                    </p>
                  )}
                </div>

                {item.telefon && (
                  <a
                    href={`https://wa.me/90${item.telefon.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                  >
                    <Phone className="size-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
