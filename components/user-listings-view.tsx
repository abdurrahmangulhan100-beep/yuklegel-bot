'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Phone, Building2, Loader2, RefreshCw, Search, X, MessageSquare, AlertCircle, ArrowRight } from 'lucide-react'
import { timeAgo } from '@/lib/format'

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
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'yuk' | 'bos_arac'>('all')

  const fetchUserListings = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('user_listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }

      const { data, error } = await query

      if (error) throw error
      setListings(data || [])
    } catch (err) {
      console.error('Kullanıcı ilanları yüklenirken hata:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchUserListings()
  }, [fetchUserListings])

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.kalkis_il?.toLowerCase().includes(q) ||
      item.varis_il?.toLowerCase().includes(q) ||
      item.yuk_cinsi?.toLowerCase().includes(q) ||
      item.firma_adi?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-base font-black text-zinc-900 dark:text-white">Sizden Gelen İlanlar</h2>
          <p className="text-xs text-zinc-500">Platform üyeleri tarafından eklenen güncel yük ve araç teklifleri</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterType === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterType('yuk')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterType === 'yuk' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-500'}`}
            >
              Yük İlanları
            </button>
            <button
              onClick={() => setFilterType('bos_arac')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${filterType === 'bos_arac' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-500'}`}
            >
              Boş Araç
            </button>
          </div>

          <button
            onClick={() => { setRefreshing(true); fetchUserListings(); }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="İl, firma adı veya yük tipine göre süzün..."
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 pl-10 pr-9 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-blue-600"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
            <X className="size-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-blue-600" />
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <AlertCircle className="size-8 text-zinc-400" />
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">İlan Bulunamadı</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    item.type === 'yuk' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {item.type === 'yuk' ? '📦 YÜK İLANI' : '🚛 BOŞ ARAÇ'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold">
                    {timeAgo(item.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                  <MapPin className="size-4 text-rose-500 shrink-0" />
                  <span>{item.kalkis_il} {item.kalkis_ilce ? `(${item.kalkis_ilce})` : ''}</span>
                  <ArrowRight className="size-3.5 text-zinc-400 shrink-0" />
                  <span>{item.varis_il} {item.varis_ilce ? `(${item.varis_ilce})` : ''}</span>
                </div>

                {item.yuk_cinsi && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                    <strong className="text-zinc-900 dark:text-white">Detay:</strong> {item.yuk_cinsi} {item.tonaj ? `• ${item.tonaj} Ton` : ''} {item.hacim ? `• ${item.hacim} m³` : ''}
                  </p>
                )}

                {item.aciklama && (
                  <p className="text-xs text-zinc-500 italic bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl">
                    "{item.aciklama}"
                  </p>
                )}

                {item.firma_adi && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                    <Building2 className="size-3.5 text-zinc-400" />
                    <span>{item.firma_adi}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                {item.fiyat ? (
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    ₺{item.fiyat.toLocaleString('tr-TR')} <span className="text-[10px] font-normal text-zinc-400">{item.kdv_status || ''}</span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400 font-bold">Fiyat Belirtilmedi</span>
                )}

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/90${item.telefon.replace(/\D/g, '').replace(/^0/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <MessageSquare className="size-4" />
                  </a>
                  <a
                    href={`tel:${item.telefon}`}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Phone className="size-3.5" />
                    <span>Ara</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
