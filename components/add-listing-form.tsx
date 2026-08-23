'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Truck, Package, Calculator, ImagePlus, X } from 'lucide-react'

interface AddListingFormProps {
  onCreated?: () => void
  onSuccess?: () => void
}

export function AddListingForm({ onCreated, onSuccess }: AddListingFormProps) {
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  // Form State'leri
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

  // Görsel Yükleme State'leri
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      if (images.length + filesArray.length > 5) {
        alert('En fazla 5 adet görsel ekleyebilirsiniz.')
        return
      }
      setImages((prev) => [...prev, ...filesArray])
      setImagePreviews((prev) => [...prev, ...filesArray.map((file) => URL.createObjectURL(file))])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      openAuthModal('İlan yayınlamak için lütfen giriş yapın.')
      return
    }

    if (!kalkisIl || !varisIl || !telefon) {
      alert('Lütfen kalkış ili, varış ili ve telefon numarası alanlarını doldurun.')
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

      const { error } = await supabase
        .from('user_listings')
        .insert([payload])

      if (error) throw error

      // Temizlik
      setKalkisIl('')
      setKalkisIlce('')
      setVarisIl('')
      setVarisIlce('')
      setYukCinsi('')
      setTonaj('')
      setHacim('')
      setFiyat('')
      setAciklama('')
      setImages([])
      setImagePreviews([])

      // Yönlendirme Tetikleyicisi
      if (onCreated) onCreated()
      if (onSuccess) onSuccess()

    } catch (err: any) {
      console.error('İlan eklenirken hata oluştu:', err)
      alert(`İlan eklenemedi: ${err.message || 'Bilinmeyen bir hata oluştu.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Yeni İlan Ekle</h2>
        <p className="text-xs text-zinc-500">İlan türünü seçin ve detaylı bilgileri doldurun.</p>
      </div>

      {/* Tür Seçimi */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setType('yuk')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border transition-all cursor-pointer ${
            type === 'yuk'
              ? 'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-500'
          }`}
        >
          <Package className="size-4" />
          Yük İlanı
        </button>
        <button
          type="button"
          onClick={() => setType('bos_arac')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border transition-all cursor-pointer ${
            type === 'bos_arac'
              ? 'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-500'
          }`}
        >
          <Truck className="size-4" />
          Boş Araç
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Güzergah Bilgileri */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Kalkış İl *</label>
            <input
              type="text"
              placeholder="Örn: İstanbul"
              value={kalkisIl}
              onChange={(e) => setKalkisIl(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Kalkış İlçe</label>
            <input
              type="text"
              placeholder="Örn: Hadımköy"
              value={kalkisIlce}
              onChange={(e) => setKalkisIlce(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Varış İl *</label>
            <input
              type="text"
              placeholder="Örn: Ankara"
              value={varisIl}
              onChange={(e) => setVarisIl(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Varış İlçe</label>
            <input
              type="text"
              placeholder="Örn: Sincan"
              value={varisIlce}
              onChange={(e) => setVarisIlce(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Yük / Araç Tipi ve Ölçüler */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Yük / Araç Tipi</label>
            <input
              type="text"
              placeholder="Örn: Paletli / Tır 13.60"
              value={yukCinsi}
              onChange={(e) => setYukCinsi(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tonaj (ton)</label>
            <input
              type="number"
              placeholder="Örn: 24"
              value={tonaj}
              onChange={(e) => setTonaj(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hacim (m³)</label>
            <input
              type="number"
              placeholder="Örn: 86"
              value={hacim}
              onChange={(e) => setHacim(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Fiyat Bilgileri */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 p-3 space-y-3">
          <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Calculator className="size-4 text-blue-600" /> Fiyatlandırma ve KDV Detayı
          </span>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Fiyat Hesabı</label>
              <select
                value={priceType}
                onChange={(e: any) => setPriceType(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
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
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    {priceType === 'ton' ? 'Ton Başı Fiyat' : priceType === 'm3' ? 'm³ Başı Fiyat' : 'Tutar (TL)'}
                  </label>
                  <input
                    type="number"
                    placeholder={priceType === 'ton' ? '800' : '18500'}
                    value={fiyat}
                    onChange={(e) => setFiyat(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">KDV Durumu</label>
                  <select
                    value={kdvStatus}
                    onChange={(e: any) => setKdvStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
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

        {/* Açıklama */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Açıklama</label>
          <textarea
            placeholder="Yükleme detayları, tonaj şartı vb."
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* İletişim Bilgileri */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">İlan Sahibi / Firma</label>
            <input
              type="text"
              placeholder="Firma Adı"
              value={firmaAdi}
              onChange={(e) => setFirmaAdi(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefon (WhatsApp) *</label>
            <input
              type="text"
              placeholder="5xx xxx xx xx"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Gönder Butonu */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span>İlanı Yayınla</span>
        </button>
      </form>
    </div>
  )
}
