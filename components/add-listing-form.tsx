'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Truck, Package, Trash2, Phone, Calculator } from 'lucide-react'

interface UserListing {
  id: string
  user_id: string
  type: string
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
  created_at: string
}

export function AddListingForm() {
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [userListings, setUserListings] = useState<UserListing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [type, setType] = useState<'yuk' | 'bos_arac'>('yuk')
  const [kalkisIl, setKalkisIl] = useState('')
  const [kalkisIlce, setKalkisIlce] = useState('')
  const [varisIl, setVarisIl] = useState('')
  const [varisIlce, setVarisIlce] = useState('')
  const [yukCinsi, setYukCinsi] = useState('')
  const [tonaj, setTonaj] = useState('')
  const [hacim, setHacim] = useState('')
  const [fiyat, setFiyat] = useState('')
  const [priceType, setPriceType] = useState<'toplam' | 'ton' | 'm3' | 'teklif'>('toplam')
  const [kdvStatus, setKdvStatus] = useState<'dahil' | 'haric' | 'kdv_siz'>('dahil')
  const [aciklama, setAciklama] = useState('')
  const [firmaAdi, setFirmaAdi] = useState('')
  const [telefon, setTelefon] = useState('')

  // 1. Eklenen İlanları Çekme
  const fetchUserListings = useCallback(async () => {
    setLoadingListings(true)
    try {
      const { data, error } = await supabase
        .from('user_listings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUserListings(data || [])
    } catch (err) {
      console.error('İlanlar çekilemedi:', err)
    } finally {
      setLoadingListings(false)
    }
  }, [])

  useEffect(() => {
    fetchUserListings()
  }, [fetchUserListings])

  // 2. Yeni İlan Kaydetme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      openAuthModal('İlan yayınlamak için lütfen giriş yapın.')
      return
    }

    if (!kalkisIl || !varisIl || !telefon) {
      alert('Lütfen gerekli kalkış, varış ve telefon alanlarını doldurun.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        user_id: user.id,
        type,
        kalkis_il: kalkisIl,
        kalkis_ilce: kalkisIlce || null,
        varis_il: varisIl,
        varis_ilce: varisIlce || null,
        yuk_cinsi: yukCinsi || null,
        tonaj: tonaj ? Number(tonaj) : null,
        hacim: hacim ? Number(hacim) : null,
        fiyat: priceType === 'teklif' ? null : (fiyat ? Number(fiyat) : null),
        price_type: priceType,
        kdv_status: kdvStatus,
        aciklama: aciklama || null,
        firma_adi: firmaAdi || user.email?.split('@')[0],
        telefon,
      }

      const { data, error } = await supabase
        .from('user_listings')
        .insert([payload])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setUserListings((prev) => [data[0], ...prev])
        // Formu temizle
        setKalkisIl('')
        setKalkisIlce('')
        setVarisIl('')
        setVarisIlce('')
        setYukCinsi('')
        setTonaj('')
        setHacim('')
        setFiyat('')
        setAciklama('')
        alert('İlanınız başarıyla yayınlandı!')
      }
    } catch (err: any) {
      console.error('İlan eklenirken hata:', err)
      alert(`İlan eklenemedi: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // 3. İlan Silme
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_listings').delete().eq('id', id)
      if (error) throw error
      setUserListings((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Silme hatası:', err)
    }
  }

  // 4. Tahmini Toplam Fiyat / KDV Hesaplayıcı Metodu
  const calculateDisplayPrice = (item: UserListing) => {
    if (item.price_type === 'teklif' || !item.fiyat) {
      return { main: 'Teklif Usulü', sub: null }
    }

    const basePrice = item.fiyat
    let mainText = ''
    let calculatedTotal = 0

    if (item.price_type === 'ton' && item.tonaj) {
      calculatedTotal = basePrice * item.tonaj
      mainText = `${basePrice.toLocaleString('tr-TR')} TL / Ton`
    } else if (item.price_type === 'm3' && item.hacim) {
      calculatedTotal = basePrice * item.hacim
      mainText = `${basePrice.toLocaleString('tr-TR')} TL / m³`
    } else {
      calculatedTotal = basePrice
      mainText = `${basePrice.toLocaleString('tr-TR')} TL`
    }

    let kdvLabel = ''
    let finalWithKdv = calculatedTotal

    if (item.kdv_status === 'haric') {
      kdvLabel = '+ KDV'
      finalWithKdv = calculatedTotal * 1.20
    } else if (item.kdv_status === 'dahil') {
      kdvLabel = '(KDV Dahil)'
    } else {
      kdvLabel = '(KDV\'siz)'
    }

    let subText = null
    if (item.price_type === 'ton' || item.price_type === 'm3' || item.kdv_status === 'haric') {
      subText = `Tahmini Toplam: ${Math.round(finalWithKdv).toLocaleString('tr-TR')} TL (KDV Dahil)`
    }

    return {
      main: `${mainText} ${kdvLabel}`,
      sub: subText
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* İlan Ekleme Formu */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Yeni İlan Ekle</h2>
          <p className="text-xs text-muted-foreground">İlan türünü seçin ve detaylı bilgileri doldurun.</p>
        </div>

        {/* Tür Seçimi */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setType('yuk')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border transition-all ${
              type === 'yuk'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            <Package className="size-4" />
            Yük İlanı
          </button>
          <button
            type="button"
            onClick={() => setType('bos_arac')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border transition-all ${
              type === 'bos_arac'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground'
            }`}
          >
            <Truck className="size-4" />
            Boş Araç
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Kalkış İl *</label>
              <input
                type="text"
                placeholder="Örn: İstanbul"
                value={kalkisIl}
                onChange={(e) => setKalkisIl(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Kalkış İlçe</label>
              <input
                type="text"
                placeholder="Örn: Hadımköy"
                value={kalkisIlce}
                onChange={(e) => setKalkisIlce(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Varış İl *</label>
              <input
                type="text"
                placeholder="Örn: Ankara"
                value={varisIl}
                onChange={(e) => setVarisIl(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Varış İlçe</label>
              <input
                type="text"
                placeholder="Örn: Sincan"
                value={varisIlce}
                onChange={(e) => setVarisIlce(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Yük / Araç Tipi</label>
              <input
                type="text"
                placeholder="Örn: Paletli / Tır 13.60"
                value={yukCinsi}
                onChange={(e) => setYukCinsi(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tonaj (ton)</label>
              <input
                type="number"
                placeholder="Örn: 24"
                value={tonaj}
                onChange={(e) => setTonaj(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Hacim (m³)</label>
              <input
                type="number"
                placeholder="Örn: 86"
                value={hacim}
                onChange={(e) => setHacim(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Fiyatlandırma Esnek Alanı */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calculator className="size-4 text-primary" /> Fiyatlandırma ve KDV Detayı
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Fiyat Hesabı</label>
                <select
                  value={priceType}
                  onChange={(e: any) => setPriceType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="toplam">Toplam Navlun</option>
                  <option value="ton">Ton Başı Fiyat</option>
                  <option value="m3">m³ Başı Fiyat</option>
                  <option value="teklif">Teklif Usulü</option>
                </select>
              </div>

              {priceType !== 'teklif' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {priceType === 'ton' ? 'Ton Başı Fiyat' : priceType === 'm3' ? 'm³ Başı Fiyat' : 'Tutar (TL)'}
                    </label>
                    <input
                      type="number"
                      placeholder={priceType === 'ton' ? '800' : '18500'}
                      value={fiyat}
                      onChange={(e) => setFiyat(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">KDV Durumu</label>
                    <select
                      value={kdvStatus}
                      onChange={(e: any) => setKdvStatus(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="dahil">KDV Dahil</option>
                      <option value="haric">+ %20 KDV</option>
                      <option value="kdv_siz">KDV'siz</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Açıklama</label>
            <textarea
              placeholder="Yükleme şekli, özel notlar, kapalı kasa vb."
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">İlan Sahibi / Firma</label>
              <input
                type="text"
                placeholder="Firma Adı"
                value={firmaAdi}
                onChange={(e) => setFirmaAdi(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Telefon (WhatsApp) *</label>
              <input
                type="text"
                placeholder="5xx xxx xx xx"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            İlanı Yayınla
          </button>
        </form>
      </div>

      {/* Eklenen İlanların Sergilendiği Bölüm */}
      <div className="space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-lg font-bold text-foreground">Sizden Gelen İlanlar</h3>
          <p className="text-xs text-muted-foreground">Kullanıcılar tarafından eklenen güncel yük ve araç ilanları.</p>
        </div>

        {loadingListings ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : userListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Henüz kullanıcı ilanı bulunmuyor.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userListings.map((item) => {
              const priceInfo = calculateDisplayPrice(item)
              return (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 relative flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.type === 'yuk'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {item.type === 'yuk' ? 'Yük İlanı' : 'Boş Araç'}
                      </span>
                      {user && user.id === item.user_id && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-foreground">
                        {item.kalkis_il} {item.kalkis_ilce ? `(${item.kalkis_ilce})` : ''} ➔ {item.varis_il} {item.varis_ilce ? `(${item.varis_ilce})` : ''}
                      </h4>
                      {item.yuk_cinsi && <p className="text-xs text-muted-foreground mt-0.5">{item.yuk_cinsi}</p>}
                    </div>

                    {/* Fiyat Alanı */}
                    <div className="rounded-lg bg-muted/40 p-2 text-xs">
                      <div className="font-bold text-foreground">{priceInfo.main}</div>
                      {priceInfo.sub && (
                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{priceInfo.sub}</div>
                      )}
                    </div>

                    {item.aciklama && <p className="text-xs text-muted-foreground line-clamp-2">{item.aciklama}</p>}
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{item.firma_adi || 'Bireysel'}</span>
                    <a
                      href={`https://wa.me/90${item.telefon.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      <Phone className="size-3" />
                      {item.telefon}
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
