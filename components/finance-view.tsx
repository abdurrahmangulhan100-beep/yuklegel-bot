'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, Plus, TrendingUp, TrendingDown, Wallet, Trash2, 
  Fuel, Receipt, Route, Search, Filter, Wrench, Utensils, Tag 
} from 'lucide-react'

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

  // Filtreleme State'leri
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

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
        km_distance: type === 'gelir' && kmDistance ? Number(kmDistance) : null,
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

  // Hesaplamalar & KPI'lar
  const metrics = useMemo(() => {
    const totalGelir = items.filter((i) => i.type === 'gelir').reduce((acc, i) => acc + Number(i.amount), 0)
    const totalGider = items.filter((i) => i.type === 'gider').reduce((acc, i) => acc + Number(i.amount), 0)
    const netKar = totalGelir - totalGider
    const totalKm = items.filter((i) => i.type === 'gelir').reduce((acc, i) => acc + Number(i.km_distance || 0), 0)
    const karPerKm = totalKm > 0 ? netKar / totalKm : 0

    return { totalGelir, totalGider, netKar, totalKm, karPerKm }
  }, [items])

  // Arama ve Filtreleme
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [items, searchTerm, selectedCategory])

  // Kategori İkon Yardımcısı
  const getCategoryIcon = (category: string, type: 'gelir' | 'gider') => {
    switch (category) {
      case 'mazot':
      case 'adblue':
        return <Fuel className="size-4 text-amber-500" />
      case 'yemek':
        return <Utensils className="size-4 text-orange-500" />
      case 'bakim':
        return <Wrench className="size-4 text-blue-500" />
      case 'hgs_kopru':
        return <Route className="size-4 text-indigo-500" />
      case 'navlun':
        return <Receipt className="size-4 text-emerald-500" />
      default:
        return type === 'gelir' ? <TrendingUp className="size-4 text-emerald-500" /> : <TrendingDown className="size-4 text-rose-500" />
    }
  }

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
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Finansal Özet KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold text-slate-500">Toplam Gelir</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.totalGelir.toLocaleString('tr-TR')} <span className="text-xs font-medium text-slate-500">TL</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold text-slate-500">Toplam Gider</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
              <TrendingDown className="size-4 text-rose-600" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.totalGider.toLocaleString('tr-TR')} <span className="text-xs font-medium text-slate-500">TL</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold text-slate-500">Net Kâr</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Wallet className="size-4 text-blue-600" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-bold ${metrics.netKar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {metrics.netKar.toLocaleString('tr-TR')} <span className="text-xs font-medium text-slate-500">TL</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold text-slate-500">KM Başına Kâr</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
              <Route className="size-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.karPerKm.toFixed(2)} <span className="text-xs font-medium text-slate-500">TL/KM</span>
          </div>
        </div>
      </div>

      {/* Form ve Geçmiş */}
      <div className="grid gap-6 md:grid-cols-5 items-start">
        {/* İşlem Ekleme Formu */}
        <div className="md:col-span-2 rounded-xl border border-slate-200/80 bg-card p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-semibold text-sm text-foreground">Yeni Finans Kaydı</h3>
            <p className="text-[11px] text-muted-foreground">Gelir ve giderlerinizi anlık takip edin.</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => { setType('gelir'); setCategory('navlun') }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'gelir'
                  ? 'bg-background text-emerald-600 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              + Gelir (Navlun)
            </button>
            <button
              type="button"
              onClick={() => { setType('gider'); setCategory('mazot') }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === 'gider'
                  ? 'bg-background text-rose-600 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              - Gider (Masraf)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Açıklama / Sefer Başlığı *</label>
              <input
                type="text"
                placeholder="Örn: İst-Ank Navlun Ödemesi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Tutar (TL) *</label>
                <input
                  type="number"
                  placeholder="25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {type === 'gelir' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Mesafe (KM) (Opsiyonel)</label>
                <input
                  type="number"
                  placeholder="Örn: 450"
                  value={kmDistance}
                  onChange={(e) => setKmDistance(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Kayıt Ekle
            </button>
          </form>
        </div>

        {/* Geçmiş Hareketler ve Filtreleme */}
        <div className="md:col-span-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card p-3 rounded-xl border border-slate-200/80 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Arama yapın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-muted/50 rounded-md text-xs border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-muted/50 border-0 text-xs rounded-md px-2 py-1.5 focus:outline-none text-muted-foreground"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="navlun">Navlun</option>
                <option value="mazot">Mazot</option>
                <option value="yemek">Yemek</option>
                <option value="bakim">Bakım</option>
                <option value="hgs_kopru">HGS / Köprü</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-slate-200/80 bg-card">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground bg-card">
              Kayıt bulunamadı.
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-slate-200/80 bg-card p-3 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      {getCategoryIcon(item.category, item.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="capitalize">{item.category.replace('_', ' ')}</span>
                        {item.km_distance && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{item.km_distance} KM</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-xs font-bold ${item.type === 'gelir' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>
                        {item.type === 'gelir' ? '+' : '-'}{Number(item.amount).toLocaleString('tr-TR')} TL
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                      title="Sil"
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
