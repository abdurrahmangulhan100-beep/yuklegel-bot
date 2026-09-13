"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Wallet, TrendingUp, TrendingDown, Trash2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FinanceItem = {
  id: string
  route: string
  cargo_type: string
  income: number
  fuel_expense: number
  other_expense: number
  note: string
  trip_date: string
}

export function FinanceView() {
  const [finances, setFinances] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)

  // Form State
  const [route, setRoute] = useState("")
  const [cargoType, setCargoType] = useState("")
  const [income, setIncome] = useState("")
  const [fuelExpense, setFuelExpense] = useState("")
  const [otherExpense, setOtherExpense] = useState("")
  const [note, setNote] = useState("")

  const fetchFinances = async () => {
    setLoading(true)
    if (!supabase) return
    const { data, error } = await supabase
      .from("trip_finances")
      .select("*")
      .order("trip_date", { ascending: false })

    if (!error && data) {
      setFinances(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFinances()
  }, [])

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return

    const { error } = await supabase.from("trip_finances").insert([
      {
        route,
        cargo_type: cargoType,
        income: Number(income) || 0,
        fuel_expense: Number(fuelExpense) || 0,
        other_expense: Number(otherExpense) || 0,
        note,
      }
    ])

    if (!error) {
      setIsOpenModal(false)
      setRoute("")
      setCargoType("")
      setIncome("")
      setFuelExpense("")
      setOtherExpense("")
      setNote("")
      fetchFinances()
    }
  }

  const handleDelete = async (id: string) => {
    if (!supabase) return
    await supabase.from("trip_finances").delete().eq("id", id)
    fetchFinances()
  }

  // Hesaplamalar
  const totalIncome = finances.reduce((acc, curr) => acc + Number(curr.income), 0)
  const totalFuel = finances.reduce((acc, curr) => acc + Number(curr.fuel_expense), 0)
  const totalOther = finances.reduce((acc, curr) => acc + Number(curr.other_expense), 0)
  const totalExpense = totalFuel + totalOther
  const netProfit = totalIncome - totalExpense

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-[#d64526]">Finansal Durum</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#122c4a]">Gelir ve Gider Yönetimi</h1>
          <p className="mt-1 text-sm text-[#718397]">Seferlerinizi, mazot masraflarınızı ve net kazancınızı takip edin.</p>
        </div>
        <Button onClick={() => setIsOpenModal(true)} className="bg-[#d64526] text-white hover:bg-[#b93820] cursor-pointer gap-2">
          <Plus className="size-4" /> Yeni Sefer / Harcama Ekle
        </Button>
      </div>

      {/* Özet Kartları */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Toplam Gelir (Navlun)</span>
            <TrendingUp className="size-5" />
          </div>
          <div className="text-2xl font-bold text-[#122c4a]">₺{totalIncome.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Toplam Gider (Mazot/Yol)</span>
            <TrendingDown className="size-5" />
          </div>
          <div className="text-2xl font-bold text-red-600">₺{totalExpense.toLocaleString("tr-TR")}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-sm font-medium text-[#718397]">Net Kâr / Durum</span>
            <Wallet className="size-5" />
          </div>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            ₺{netProfit.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>

      {/* Liste / Tablo */}
      <div className="rounded-xl border border-[#e4e9ef] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e4e9ef] font-semibold text-[#122c4a]">Sefer ve Harcama Geçmişiniz</div>
        {loading ? (
          <div className="p-8 text-center text-sm text-[#718397]">Yükleniyor...</div>
        ) : finances.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#718397]">Henüz kayıtlı bir sefer veya gider bulunmuyor. Sağ üstten ekleyebilirsiniz.</div>
        ) : (
          <div className="divide-y divide-[#e4e9ef]">
            {finances.map((item) => {
              const profit = item.income - (item.fuel_expense + item.other_expense)
              return (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#f8fafc] transition-colors">
                  <div>
                    <div className="font-bold text-[#122c4a] text-base">{item.route}</div>
                    <div className="text-xs text-[#718397] flex items-center gap-2 mt-1">
                      <span>Yük: {item.cargo_type || "Belirtilmemiş"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Calendar className="size-3" /> {new Date(item.trip_date).toLocaleDateString("tr-TR")}</span>
                    </div>
                    {item.note && <div className="text-xs text-gray-500 mt-1 italic">Not: {item.note}</div>}
                  </div>
                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-[#718397]">Gelir: <span className="font-semibold text-emerald-600">+₺{item.income}</span></div>
                      <div className="text-xs text-[#718397]">Gider: <span className="font-semibold text-red-600">-₺{Number(item.fuel_expense) + Number(item.other_expense)}</span></div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-sm font-bold ${profit >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {profit >= 0 ? `+₺${profit}` : `-₺{Math.abs(profit)}`}
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
            <h2 className="text-lg font-bold text-[#122c4a] mb-4">Yeni Sefer / Gelir Gider Ekle</h2>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Güzergah (Örn: Konya - İstanbul)</label>
                <Input required value={route} onChange={e => setRoute(e.target.value)} placeholder="Örn: Konya - Ankara" className="h-10" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Yük Cinsi</label>
                <Input value={cargoType} onChange={e => setCargoType(e.target.value)} placeholder="Örn: Paletli Gıda" className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#718397] mb-1 block">Alınan Navlun (Gelir ₺)</label>
                  <Input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="0" className="h-10" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#718397] mb-1 block">Mazot Gideri (₺)</label>
                  <Input type="number" value={fuelExpense} onChange={e => setFuelExpense(e.target.value)} placeholder="0" className="h-10" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Diğer Giderler (Yol, Yemek vs ₺)</label>
                <Input type="number" value={otherExpense} onChange={e => setOtherExpense(e.target.value)} placeholder="0" className="h-10" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#718397] mb-1 block">Notlar</label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Eklemek istediğiniz bir detay..." className="h-10" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpenModal(false)} className="cursor-pointer">İptal</Button>
                <Button type="submit" className="bg-[#d64526] text-white hover:bg-[#b93820] cursor-pointer">Kaydet</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
