"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react"
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

export function FinanceView() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")

  // Form State
  const [type, setType] = useState<"income" | "expense">("income")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [plate, setPlate] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")

  const fetchFinances = async () => {
    setLoading(true)
    if (!supabase) return
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

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    const { error } = await supabase.from("finances").insert([
      {
        type,
        category: category || (type === "income" ? "Navlun Geliri" : "Mazot Gideri"),
        amount: Number(amount) || 0,
        plate,
        date,
        description,
      }
    ])

    if (!error) {
      setIsOpenModal(false)
      setCategory("")
      setAmount("")
      setPlate("")
      setDescription("")
      setDate(new Date().toISOString().split("T")[0])
      fetchFinances()
    }
  }

  const handleDelete = async (id: string) => {
    if (!supabase) return
    await supabase.from("finances").delete().eq("id", id)
    fetchFinances()
  }

  // Hesaplamalar
  const totalIncome = items.filter(i => i.type === "income").reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalExpense = items.filter(i => i.type === "expense").reduce((acc, curr) => acc + Number(curr.amount), 0)
  const netProfit = totalIncome - totalExpense

  const filteredItems = items.filter(item => {
    if (filterType === "income") return item.type === "income"
    if (filterType === "expense") return item.type === "expense"
    return true
  })

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-[#d64526]">Finansal Yönetim</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#122c4a]">Gelir ve Gider Takibi</h1>
          <p className="mt-1 text-sm text-[#718397]">Tüm gelirlerinizi ve masraflarınızı ayrı ayrı kaydedip net kârınızı izleyin.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setType("income"); setIsOpenModal(true); }} className="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer gap-2">
            <ArrowUpRight className="size-4" /> Gelir Ekle
          </Button>
          <Button onClick={() => { setType("expense"); setIsOpenModal(true); }} className="bg-red-600 text-white hover:bg-red-700 cursor-pointer gap-2">
            <ArrowDownLeft className="size-4" /> Gider Ekle
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Toplam Gelirler</span>
            <TrendingUp className="size-5" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">₺{totalIncome.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Toplam Giderler</span>
            <TrendingDown className="size-5" />
          </div>
          <div className="text-2xl font-bold text-red-600">₺{totalExpense.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Net Kâr / Bakiye</span>
            <Wallet className="size-5" />
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            ₺{netProfit.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>

      {/* Filtre Butonları & Liste */}
      <div className="rounded-xl border border-[#e4e9ef] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e4e9ef] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="font-semibold text-[#122c4a]">İşlem Geçmişi</div>
          <div className="flex gap-1 bg-[#f5f7fa] p-1 rounded-lg border border-[#e4e9ef]">
            <button onClick={() => setFilterType("all")} className={cn("px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors", filterType === "all" ? "bg-white text-[#122c4a] shadow-xs" : "text-[#718397] hover:text-[#122c4a]")}>Tümü</button>
            <button onClick={() => setFilterType("income")} className={cn("px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors", filterType === "income" ? "bg-white text-emerald-600 shadow-xs" : "text-[#718397] hover:text-emerald-600")}>Gelirler</button>
            <button onClick={() => setFilterType("expense")} className={cn("px-3 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors", filterType === "expense" ? "bg-white text-red-600 shadow-xs" : "text-[#718397] hover:text-red-600")}>Giderler</button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#718397]">Yükleniyor...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#718397]">Henüz kayıtlı bir işlem bulunmuyor.</div>
        ) : (
          <div className="divide-y divide-[#e4e9ef]">
            {filteredItems.map((item) => {
              const isIncome = item.type === "income"
              return (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", isIncome ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      {isIncome ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#122c4a] text-sm">{item.category}</span>
                        {item.plate && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{item.plate}</span>}
                      </div>
                      <div className="text-xs text-[#718397] flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="size-3" /> {new Date(item.date).toLocaleDateString("tr-TR")}</span>
                        {item.description && <span>• {item.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn("text-base font-bold", isIncome ? "text-emerald-600" : "text-red-600")}>
                      {isIncome ? `+₺${Number(item.amount).toLocaleString("tr-TR")}` : `-₺{Number(item.amount).toLocaleString("tr-TR")}`}
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 p-1 cursor-pointer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ekleme Modalı */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#e4e9ef]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#122c4a]">
                {type === "income" ? "Yeni Gelir Ekle" : "Yeni Gider Ekle"}
              </h2>
              <div className="flex gap-1 bg-[#f5f7fa] p-1 rounded-lg border border-[#e4e9ef]">
                <button type="button" onClick={() => setType("income")} className={cn("px-3 py-1 text-xs font-semibold rounded-md cursor-pointer", type === "income" ? "bg-emerald-600 text-white" : "text-[#718397]")}>Gelir</button>
                <button type="button" onClick={() => setType("expense")} className={cn("px-3 py-1 text-xs font-semibold rounded-md cursor-pointer", type === "expense" ? "bg-red-600 text-white" : "text-[#718397]")}>Gider</button>
              </div>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Kategori</label>
                <Input 
                  required 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  placeholder={type === "income" ? "Örn: Navlun Bedeli / İstanbul Seferi" : "Örn: Mazot Alımı / Köprü HGS / Tamirat"} 
                  className="h-10" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#718397] mb-1 block">Tutar (₺)</label>
                  <Input required type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="h-10" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#718397] mb-1 block">Araç Plakası (İsteğe Bağlı)</label>
                  <Input value={plate} onChange={e => setPlate(e.target.value)} placeholder="Örn: 42 ABC 34" className="h-10" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Tarih</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" />
              </div>

              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Açıklama / Not</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ek detaylar..." className="h-10" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpenModal(false)} className="cursor-pointer">İptal</Button>
                <Button type="submit" className={cn("text-white cursor-pointer", type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>Kaydet</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
