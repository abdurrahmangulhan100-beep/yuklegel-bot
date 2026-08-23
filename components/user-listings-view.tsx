'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Calendar, Phone, Building2, Package, Loader2, RefreshCw } from 'lucide-react'

interface Listing {
  id: string
  created_at: string
  kalkis_il: string
  kalkis_ilce?: string
  varis_il: string
  varis_ilce?: string
  yuk_tipi?: string
  tonaj?: string
  hacim?: string
  fiyat?: string
  kdv_durumu?: string
  aciklama?: string
  firma_adi?: string
  telefon?: string
  type?: 'yuk' | 'arac'
}

export function UserListingsView() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  // 1. Supabase'den Verileri Çek
  const fetchListings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setListings(data)
    } catch (err) {
      console.error('İlanlar çekilirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()

    // 2. Realtime Abonelik (Yeni ilan eklendiğinde anında listeye düşsün)
    const channel = supabase
      .channel('realtime_user_listings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_listings' },
        (payload) => {
          setListings((prev) => [payload.new as Listing, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white">Sizden Gelen İlanlar</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Kullanıcılar ve nakliyeciler tarafından sisteme eklenen anlık yük ve araç ilanları.
          </p>
        </div>
        <button
          onClick={fetchListings}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <Loader2 className="size-6 animate-spin text-blue-600" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Truck className="size-10 text-zinc-400 mb-2" />
          <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Henüz ilan eklenmemiş</p>
          <p className="text-xs text-zinc-400 mt-0.5">İlk ilanı "İlan Ekle" modülünden hemen gönderebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((item) => (
            <div
              key={item.id}
              className="relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs hover:border-blue-500/50 transition-all"
            >
              <div>
                {/* Güzergah / Başlık */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-2 font-black text-sm text-zinc-900 dark:text-white">
                    <MapPin className="size-4 text-blue-600" />
                    <span>{item.kalkis_il} {item.kalkis_ilce ? `(${item.kalkis_ilce})` : ''}</span>
                    <span className="text-zinc-400">➔</span>
                    <span>{item.varis_il} {item.varis_ilce ? `(${item.varis_ilce})` : ''}</span>
                  </div>
                  <span className="rounded-lg bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600 dark:text-blue-400">
                    {item.type === 'arac' ? 'Boş Araç' : 'Yük İlanı'}
                  </span>
                </div>

                {/* Detaylar */}
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                  {item.yuk_tipi && (
                    <div className="flex items-center gap-1.5">
                      <Package className="size-3.5 text-zinc-400" />
                      <span>{item.yuk_tipi}</span>
                    </div>
                  )}
                  {item.tonaj && (
                    <div className="flex items-center gap-1.5">
                      <Truck className="size-3.5 text-zinc-400" />
                      <span>{item.tonaj} Ton</span>
                    </div>
                  )}
                </div>

                {item.aciklama && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-xl mb-3">
                    {item.aciklama}
                  </p>
                )}
              </div>

              {/* Alt Bilgi & İletişim */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {item.fiyat ? `${item.fiyat} TL` : 'Teklif Alınacak'}
                    {item.kdv_durumu && <span className="text-[10px] text-zinc-400 font-normal ml-1">({item.kdv_durumu})</span>}
                  </p>
                  {item.firma_adi && (
                    <p className="text-[10px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                      <Building2 className="size-3" /> {item.firma_adi}
                    </p>
                  )}
                </div>

                {item.telefon && (
                  <a
                    href={`https://wa.me/90${item.telefon.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="size-3" />
                    <span>Ara / WhatsApp</span>
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
