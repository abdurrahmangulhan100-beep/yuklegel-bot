"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  X,
  Truck,
  Pencil,
  Download,
  Filter,
  PieChart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type FinanceItem = {
  id: string
  type: "income" | "expense"
  category: string
  amount: number
  plate: string
  date: string
  description: string
}

const CATEGORY_SUGGESTIONS = {
  income: ["Navlun Bedeli", "Sefer Primi", "KDV İadesi", "Diğer Gelir"],
  expense: ["Mazot Alımı", "Tamir / Bakım", "Köprü & HGS", "Yemek / Harcırah", "Lastik / Yedek Parça", "Diğer Gider"]
}

export function FinanceView() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null)
  
  // Filtreleme State'leri
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlate, setSelectedPlate] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Form State
  const [type, setType] = useState<"income" | "expense">("income")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [plate, setPlate] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")

  const fetchFinances = async () => {
    setLoading(true)
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from("finances")
      .select("*")
      .order("date", { ascending: false })

    if (!error && data) {
      setItems(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFinances()
  }, [])

  // Düzenleme Modunu Aç
  const handleOpenEdit = (item: FinanceItem) => {
    setEditingItem(item)
    setType(item.type)
    setCategory(item.category || "")
    setAmount(item.amount ? String(item.amount) : "")
    setPlate(item.plate || "")
    setDate(item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0])
    setDescription(item.description || "")
    setIsOpenModal(true)
  }

  // Yeni Kayıt veya Düzenlemeyi Kaydet
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    const payload = {
      type,
      category: category || (type === "income" ? "Navlun Bedeli" : "Mazot Alımı"),
      amount: Number(amount) || 0,
      plate: plate.toUpperCase().trim(),
      date,
      description,
    }

    if (editingItem) {
      // Güncelleme
      const { error } = await supabase
        .from("finances")
        .update(payload)
        .eq("id", editingItem.id)

      if (!error) closeModal()
    } else {
      // Yeni Ekleme
      const { error } = await supabase
        .from("finances")
        .insert([payload])

      if (!error) closeModal()
    }
    fetchFinances()
  }

  const closeModal = () => {
    setIsOpenModal(false)
    setEditingItem(null)
    setCategory("")
    setAmount("")
    setPlate("")
    setDescription("")
    setDate(new Date().toISOString().split("T")[0])
  }

  const handleDelete = async (id: string) => {
    if (!supabase) return
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return
    await supabase.from("finances").delete().eq("id", id)
    fetchFinances()
  }

  // Benzersiz Plakalar
  const uniquePlates = useMemo(() => {
    const plates = items.map(i => i.plate).filter(Boolean)
    return Array.from(new Set(plates))
  }, [items])

  // Filtrelenmiş Liste
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesType = filterType === "all" ? true : item.type === filterType
      const matchesPlate = selectedPlate === "all" ? true : item.plate === selectedPlate
      const matchesSearch = searchQuery === "" ? true : (
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      const itemDate = new Date(item.date)
      const matchesStart = startDate ? itemDate >= new Date(startDate) : true
      const matchesEnd = endDate ? itemDate <= new Date(endDate) : true

      return matchesType && matchesPlate && matchesSearch && matchesStart && matchesEnd
    })
  }, [items, filterType, selectedPlate, searchQuery, startDate, endDate])

  // Hesaplamalar
  const totalIncome = filteredItems.filter(i => i.type === "income").reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalExpense = filteredItems.filter(i => i.type === "expense").reduce((acc, curr) => acc + Number(curr.amount), 0)
  const netProfit = totalIncome - totalExpense

  // CSV İndirme Fonksiyonu
  const exportToCSV = () => {
    if (filteredItems.length === 0) return
    const headers = ["Tarih", "Tür", "Kategori", "Plaka", "Tutar (TL)", "Açıklama"]
    const rows = filteredItems.map(item => [
      item.date,
      item.type === "income" ? "Gelir" : "Gider",
      `"${item.category || ''}"`,
      `"${item.plate || ''}"`,
      item.amount,
      `"${item.description || ''}"`
    ])

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Finans_Raporu_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Üst Başlık & Butonlar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Finansal Yönetim</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#122c4a]">Gelir ve Gider Takibi</h1>
          <p className="mt-0.5 text-xs text-[#718397]">Tüm finansal hareketlerinizi yönetin ve raporlayın.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={exportToCSV}
            variant="outline"
            className="h-9 text-xs gap-1.5 cursor-pointer border-[#e4e9ef]"
          >
            <Download className="size-3.5" /> Dışa Aktar (.CSV)
          </Button>
          <Button 
            onClick={() => { setEditingItem(null); setType("income"); setIsOpenModal(true); }} 
            className="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer gap-1.5 h-9 text-xs"
          >
            <ArrowUpRight className="size-4" /> Gelir Ekle
          </Button>
          <Button 
            onClick={() => { setEditingItem(null); setType("expense"); setIsOpenModal(true); }} 
            className="bg-red-600 text-white hover:bg-red-700 cursor-pointer gap-1.5 h-9 text-xs"
          >
            <ArrowDownLeft className="size-4" /> Gider Ekle
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium text-[#718397]">Toplam Gelir</span>
            <TrendingUp className="size-4" />
          </div>
          <div className="text-xl font-bold text-emerald-600">₺{totalIncome.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-xs font-medium text-[#718397]">Toplam Gider</span>
            <TrendingDown className="size-4" />
          </div>
          <div className="text-xl font-bold text-red-600">₺{totalExpense.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-xs font-medium text-[#718397]">Net Bakiye</span>
            <Wallet className="size-4" />
          </div>
          <div className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            ₺{netProfit.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>

      {/* Arama & Filtreleme Barları */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input 
              placeholder="Arama (Kategori, plaka...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex w-full sm:w-auto gap-2 items-center overflow-x-auto pb-1 sm:pb-0">
            {/* Plaka Filtresi */}
            {uniquePlates.length > 0 && (
              <select 
                value={selectedPlate} 
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="h-9 text-xs rounded-md border border-[#e4e9ef] bg-white px-2.5 text-[#122c4a] outline-none"
              >
                <option value="all">Tüm Plakalar</option>
                {uniquePlates.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            {/* Tür Filtresi */}
            <div className="flex bg-[#f5f7fa] p-1 rounded-lg border border-[#e4e9ef]">
              <button 
                onClick={() => setFilterType("all")} 
                className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer", filterType === "all" ? "bg-white text-[#122c4a] shadow-xs" : "text-[#718397]")}
              >
                Tümü
              </button>
              <button 
                onClick={() => setFilterType("income")} 
                className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer", filterType === "income" ? "bg-white text-emerald-600 shadow-xs" : "text-[#718397]")}
              >
                Gelirler
              </button>
              <button 
                onClick={() => setFilterType("expense")} 
                className={cn("px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer", filterType === "expense" ? "bg-white text-red-600 shadow-xs" : "text-[#718397]")}
              >
                Giderler
              </button>
            </div>
          </div>
        </div>

        {/* Tarih Aralığı Süzgeci */}
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-[#e4e9ef] text-xs text-gray-600 flex-wrap">
          <span className="font-semibold text-gray-700 flex items-center gap-1"><Filter className="size-3" /> Tarih Aralığı:</span>
          <Input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="h-7 text-xs w-36 bg-white" 
          />
          <span>-</span>
          <Input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="h-7 text-xs w-36 bg-white" 
          />
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-red-600 text-xs hover:underline cursor-pointer ml-auto"
            >
              Filtreyi Temizle
            </button>
          )}
        </div>
      </div>

      {/* Liste Tablosu */}
      <div className="rounded-xl border border-[#e4e9ef] bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#718397]">Kayıtlar yükleniyor...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#718397]">Gösterilecek işlem kaydı bulunamadı.</div>
        ) : (
          <div className="divide-y divide-[#e4e9ef]">
            {filteredItems.map((item) => {
              const isIncome = item.type === "income"
              return (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg", isIncome ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#122c4a] text-xs sm:text-sm truncate">{item.category}</span>
                        {item.plate && (
                          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 shrink-0">
                            <Truck className="size-3 text-gray-500" />
                            {item.plate}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#718397] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 shrink-0"><Calendar className="size-3" /> {new Date(item.date).toLocaleDateString("tr-TR")}</span>
                        {item.description && <span className="truncate">• {item.description}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn("text-xs sm:text-sm font-bold", isIncome ? "text-emerald-600" : "text-red-600")}>
                      {isIncome 
                        ? `+₺${Number(item.amount).toLocaleString("tr-TR")}` 
                        : `-₺${Number(item.amount).toLocaleString("tr-TR")}`
                      }
                    </div>
                    
                    <div className="flex items-center gap-1 border-l border-gray-100 pl-2">
                      <button 
                        onClick={() => handleOpenEdit(item)} 
                        className="text-gray-400 hover:text-blue-600 p-1 cursor-pointer transition-colors"
                        title="Düzenle"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Kayıt Ekleme / Düzenleme Modalı */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl border border-[#e4e9ef]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#122c4a]">
                {editingItem 
                  ? "Kayıt Düzenle" 
                  : type === "income" ? "Yeni Gelir Ekle" : "Yeni Gider Ekle"
                }
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3.5">
              {/* İşlem Türü Seçimi */}
              <div className="flex bg-[#f5f7fa] p-1 rounded-lg border border-[#e4e9ef]">
                <button 
                  type="button" 
                  onClick={() => setType("income")} 
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer", type === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-[#718397]")}
                >
                  Gelir
                </button>
                <button 
                  type="button" 
                  onClick={() => setType("expense")} 
                  className={cn("flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer", type === "expense" ? "bg-red-600 text-white shadow-xs" : "text-[#718397]")}
                >
                  Gider
                </button>
              </div>

              {/* Hızlı Kategori Önerileri */}
              <div>
                <label className="text-[11px] font-medium text-[#718397] mb-1 block">Hızlı Kategori Seçimi</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {CATEGORY_SUGGESTIONS[type].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn("px-2 py-1 text-[10px] rounded border transition-colors cursor-pointer", category === cat ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100")}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Input 
                  required 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  placeholder="Kategori adı..." 
                  className="h-9 text-xs" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-[#718397] mb-1 block">Tutar (₺)</label>
                  <Input 
                    required 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="h-9 text-xs" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#718397] mb-1 block">Araç Plakası</label>
                  <Input 
                    value={plate} 
                    onChange={e => setPlate(e.target.value)} 
                    placeholder="Örn: 42 DLB 59" 
                    className="h-9 text-xs uppercase" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#718397] mb-1 block">Tarih</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="h-9 text-xs" 
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#718397] mb-1 block">Açıklama / Not</label>
                <Input 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Açıklama giriniz..." 
                  className="h-9 text-xs" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="h-8 text-xs cursor-pointer">İptal</Button>
                <Button type="submit" className={cn("h-8 text-xs text-white cursor-pointer", type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                  {editingItem ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
