'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { MapPin, Truck, Calendar, Trash2, Tag, Loader2, RefreshCw } from 'lucide-react'

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

export function MyListingsView() {
  const { user, loading: authLoading } = useAuth()
  const [listings, setListings] = useState<UserListing[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Sadece giriş yapan kullanıcının kendi ilanlarını çek
  const fetchMyListings = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setListings(data as UserListing[])
    } catch (err: any) {
      console.error('İlanlar çekilirken hata oluştu:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyListings()
  }, [user])

  // İlan Silme İşlemi
  const handleDelete = async (id: string) => {
    if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('user_listings')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id) // Güvenlik kontrolü

      if (error) throw error

      // State'den silinen ilanı kaldır
      setListings((prev) => prev.filter((item) => item.id !== id))
      alert('İlan başarıyla silindi.')
    } catch (err: any) {
      console.error('İlan silinirken hata:', err)
      alert(`İlan silinemedi: ${err.message || 'Bilinmeyen hata'}`)
    } finally {
      setDeletingId(null)
    }
  }

  const formatPrice = (item: UserListing) => {
    if (item.price_type === 'teklif' || !item.fiyat) return 'Teklif Usulü'
    return `${item.fiyat.toLocaleString('tr-TR')} ₺`
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-2">
        <p className="text-muted-foreground text-sm">İlanlarınızı görmek ve yönetmek için lütfen giriş yapın.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">
          Yayınladığım İlanlar ({listings.length})
        </h2>
        <button
          onClick={fetchMyListings}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
          <span>Yenile</span>
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-2">
          <p className="text-muted-foreground text-sm">Henüz aktif bir ilanınız bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {listings.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-2xl border border-border p-4 shadow-xs flex flex-col gap-3 transition-all hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                      item.type === 'bos_arac'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {item.type === 'bos_arac' ? 'Boş Araç' : 'Yük İlanı'}
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span>{item.kalkis_il} {item.kalkis_ilce ? `(${item.kalkis_ilce})` : ''}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{item.varis_il} {item.varis_ilce ? `(${item.varis_ilce})` : ''}</span>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0">
                  {formatPrice(item)}
                </span>
              </div>

              {/* Detay Etiketleri */}
              <div className="flex flex-wrap gap-2">
                {item.yuk_cinsi && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Truck className="size-3 text-muted-foreground" /> {item.yuk_cinsi}
                  </span>
                )}
                {item.tonaj && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Tag className="size-3 text-muted-foreground" /> {item.tonaj} Ton
                  </span>
                )}
                {item.hacim && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-foreground">
                    <Tag className="size-3 text-muted-foreground" /> {item.hacim} m³
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2.5 py-1 rounded-md font-medium text-muted-foreground ml-auto">
                  <Calendar className="size-3" />
                  {new Date(item.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Alt Silme Alanı */}
              <div className="flex items-center justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                  title="İlanı Sil"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      <span>Sil</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
