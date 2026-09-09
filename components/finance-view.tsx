'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, Plus, TrendingUp, TrendingDown, Wallet, Trash2, 
  Fuel, Receipt, Route, Search, Filter, Wrench, Utensils, Sparkles, X
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
        return <Fuel className="size-4 text-amber-600" />
      case 'yemek':
        return <Utensils className="size-4 text-orange-600" />
      case 'bakim':
        return <Wrench className="size-4 text-blue-600" />
      case 'hgs_kopru':
        return <Route className="size-4 text-indigo-600" />
      case 'navlun':
        return <Receipt className="size-4 text-emerald-600" />
      default:
        return type === 'gelir' ? <TrendingUp className="size-4 text-emerald-600" /> : <TrendingDown className="size-4 text-rose-600" />
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <Wallet className="mx-auto size-12 text-blue-600 mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Gider & Kazanç Defteri Kilitli</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Sefer kârlarınızı, mazot masraflarınızı ve net kazancınızı hesaplamak için hesabınıza giriş yapın.
        </p>
        <button
          onClick={() => openAuthModal('Gider & Kazanç Defteri için giriş yapın')}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
          Giriş Yap / Kayıt Ol
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto px-1 sm:px-4 pb-20 sm:pb-8">
      {/* Finansal Özet KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Toplam Gelir */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Toplam Gelir</span>
            <div className="p-1.5 bg-emerald-50 rounded-xl">
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold text-emerald-600 tracking-tight">
            {metrics.totalGelir.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-emerald-700">TL</span>
          </div>
        </div>

        {/* Toplam Gider */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Toplam Gider</span>
            <div className="p-1.5 bg-rose-50 rounded-xl">
              <TrendingDown className="size-4 text-rose-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold text-rose-600 tracking-tight">
            {metrics.totalGider.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-rose-700">TL</span>
          </div>
        </div>

        {/* Net Kâr */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Net Kâr</span>
            <div className="p-1.5 bg-blue-50 rounded-xl">
              <Wallet className="size-4 text-blue-600" />
            </div>
          </div>
          <div className={`text-base sm:text-xl font-extrabold tracking-tight ${metrics.netKar >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {metrics.netKar.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-slate-600">TL</span>
          </div>
        </div>

        {/* KM Başına Kâr */}
        <div className="rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">KM Başına Kâr</span>
            <div className="p-1.5 bg-indigo-50 rounded-xl">
              <Route className="size-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-extrabold text-indigo-600 tracking-tight">
            {metrics.karPerKm > 0 ? metrics.karPerKm.toFixed(2) : '0.00'} <span className="text-xs font-semibold text-indigo-700">TL/KM</span>
          </div>
        </div>
      </div>

      {/* Form ve Geçmiş */}
      <div className="grid gap-5 md:grid-cols-5 items-start">
        {/* İşlem Ekleme Formu */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                Yeni Finans Kaydı
              </h3>
              <p className="text-[11px] text-slate-500">Gelir ve giderlerinizi anlık kaydedin.</p>
            </div>
            <Sparkles className="size-4 text-amber-500" />
          </div>

          {/* Gelir / Gider Değiştirici */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('gelir'); setCategory('navlun') }}
              className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                type === 'gelir'
                  ? 'bg-white text-emerald-600 shadow-sm scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Gelir (Navlun)
            </button>
            <button
              type="button"
              onClick={() => { setType('gider'); setCategory('mazot') }}
              className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                type === 'gider'
                  ? 'bg-white text-rose-600 shadow-sm scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              - Gider (Masraf)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Açıklama / Sefer Başlığı *</label>
              <input
                type="text"
                placeholder="Örn: İst-Ank Navlun Ödemesi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tutar (TL) *</label>
                <input
                  type="number"
                  placeholder="25000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {type === 'gelir' && (
              <div className="animate-in fade-in duration-150">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mesafe (KM) (Opsiyonel)</label>
                <input
                  type="number"
                  placeholder="Örn: 450"
                  value={kmDistance}
                  onChange={(e) => setKmDistance(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Kayıt Ekle
            </button>
          </form>
        </div>

        {/* Geçmiş Hareketler ve Arama / Filtreleme Barı */}
        <div className="md:col-span-3 space-y-3">
          {/* Modern & Efektli Arama Barı */}
          <div className="relative p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-100 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <Search className="size-4 text-slate-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="İşlem veya kategori ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-2.5 pr-8 py-2 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-auto flex items-center gap-1.5 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-100 flex-shrink-0">
              <Filter className="size-3.5 text-blue-600 flex-shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
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

          {/* Hareketler Listesi */}
          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200/80 bg-white">
              <Loader2 className="size-6 animate-spin text-blue-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-medium text-slate-400 bg-white">
              Kayıt bulunamadı.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100/80 flex-shrink-0">
                      {getCategoryIcon(item.category, item.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 mt-0.5">
                        <span className="capitalize">{item.category.replace('_', ' ')}</span>
                        {item.km_distance && (
                          <>
                            <span>•</span>
                            <span className="text-slate-700">{item.km_distance} KM</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className={`text-xs font-extrabold ${item.type === 'gelir' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {item.type === 'gelir' ? '+' : '-'}{Number(item.amount).toLocaleString('tr-TR')} TL
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
