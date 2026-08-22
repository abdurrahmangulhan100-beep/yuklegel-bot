'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet, Trash2, Fuel, Receipt, Route } from 'lucide-react'

interface FinanceItem {
  id: string
  user_id: string
  title: string
  type: 'gelir' | 'gider'
  category: string
  amount: number
  date: string
  km_distance?: number
  description?: string
  created_at: string
}

export function FinanceView() {
  const { user, openAuthModal } = useAuth()
  const [items, setItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'gelir' | 'gider'>('gelir')
  const [category, setCategory] = useState('navlun')
  const [amount, setAmount] = useState('')
  const [kmDistance, setKmDistance] = useState('')
  const [description, setDescription] = useState('')

  // Finans Kayıtlarını Çekme
  const fetchFinances = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_finances')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Finans verileri çekilemedi:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchFinances()
  }, [fetchFinances])

  // Yeni Kayıt Ekleme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      openAuthModal('Gider ve kazançlarınızı kaydetmek için giriş yapın.')
      return
    }

    if (!title || !amount) {
      alert('Lütfen başlık ve tutar alanlarını doldurun.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        user_id: user.id,
        title,
        type,
        category,
        amount: Number(amount),
        km_distance: kmDistance ? Number(kmDistance) : null,
        description: description || null,
      }

      const { data, error } = await supabase
        .from('user_finances')
        .insert([payload])
        .select()

      if (error) throw error

      if (data) {
        setItems((prev) => [data[0], ...prev])
        setTitle('')
        setAmount('')
        setKmDistance('')
        setDescription('')
      }
    } catch (err: any) {
      alert(`Hata oluştu: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Kayıt Silme
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_finances').delete().eq('id', id)
      if (error) throw error
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Silme hatası:', err)
    }
  }

  // Hesaplamalar
  const totalGelir = items.filter((i) => i.type === 'gelir').reduce((acc, i) => acc + Number(i.amount), 0)
  const totalGider = items.filter((i) => i.type === 'gider').reduce((acc, i) => acc + Number(i.amount), 0)
  const netKar = totalGelir - totalGider

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <Wallet className="mx-auto size-12 text-primary/80 mb-3" />
        <h3 className="text-lg font-bold text-foreground">Gider & Kazanç Defteri Kilitli</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-6">
          Sefer kârlarınızı, mazot masraflarınızı ve net kazancınızı hesaplamak için hesabınıza giriş yapın.
        </p>
        <button
          onClick={() => openAuthModal('Gider & Kazanç Defteri için giriş yapın')}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Finansal Özet Kartları */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Toplam Gelir</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600">
            {totalGelir.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Toplam Gider</span>
            <TrendingDown className="size-4 text-rose-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600">
            {totalGider.toLocaleString('tr-TR')} TL
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium text-primary">Net Kâr</span>
            <Wallet className="size-4 text-primary" />
          </div>
          <div className={`text-lg sm:text-xl font-bold ${netKar >= 0 ? 'text-primary' : 'text-rose-600'}`}>
            {netKar.toLocaleString('tr-TR')} TL
          </div>
        </div>
      </div>

      {/* Form ve Geçmiş */}
      <div className="grid gap-6 md:grid-cols-5">
        {/* İşlem Ekleme Formu */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground">Yeni Kayıt Ekle</h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setType('gelir'); setCategory('navlun') }}
              className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                type === 'gelir'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                  : 'border-border text-muted-foreground'
              }`}
            >
              + Gelir (Navlun)
            </button>
            <button
              type="button"
              onClick={() => { setType('gider'); setCategory('mazot') }}
              className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                type === 'gider'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                  : 'border-border text-muted-foreground'
              }`}
            >
              - Gider (Masraf)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Açıklama / Sefer Başlığı *</label>
              <input
                type="text"
                placeholder="Örn: İst-Ank Navlun Ödemesi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs focus:outline-none"
                >
                  {type === 'gelir' ? (
                    <>
                      <option value="navlun">Navlun Ödemesi</option>
                      <option value="komisyon_iade">Komisyon İadesi</option>
                      <option value="diger_gelir">Diğer Gelir</option>
                    </>
                  ) : (
                    <>
                      <option value="mazot">Mazot / Akaryakıt</option>
                      <option value="adblue">AdBlue</option>
                      <option value="hgs_kopru">HGS / Köprü / Otoyol</option>
                      <option value="komisyon">Komisyoncu Ücreti</option>
                      <option value="yemek">Yemek / Harçlık</option>
                      <option value="bakim">Bakım / Sanayi / Lastik</option>
                      <option value="diger_gider">Diğer Gider</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">Tutar (TL) *</label>
                <input
                  type="number"
                  placeholder="25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Mesafe (KM) (Opsiyonel)</label>
              <input
                type="number"
                placeholder="Örn: 450"
                value={kmDistance}
                onChange={(e) => setKmDistance(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Kayıt Ekle
            </button>
          </form>
        </div>

        {/* Geçmiş Hareketler */}
        <div className="md:col-span-3 space-y-3">
          <h3 className="font-bold text-base text-foreground">Son Hareketler</h3>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Henüz gelir veya gider kaydı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-card p-3.5 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2.5 ${
                        item.type === 'gelir' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}
                    >
                      {item.category === 'mazot' ? (
                        <Fuel className="size-4" />
                      ) : item.type === 'gelir' ? (
                        <Receipt className="size-4" />
                      ) : (
                        <TrendingDown className="size-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{item.title}</h4>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {item.category.replace('_', ' ')} {item.km_distance ? `• ${item.km_distance} KM` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-xs font-bold ${
                          item.type === 'gelir' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.type === 'gelir' ? '+' : '-'}{Number(item.amount).toLocaleString('tr-TR')} TL
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
