"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  FileText,
  BarChart3,
  ShieldAlert,
  ChevronDown,
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
  expense: ["Mazot Alımı", "Tamir / Bakım", "Köprü & HGS", "Yemek / Harcırah", "Lastik / Yedek Parça", "Sigorta / Muayene", "Maaş / Şoför", "Diğer Gider"],
}

const pad = (n: number) => String(n).padStart(2, "0")
/** Yerel saate göre YYYY-MM-DD (toISOString UTC verdiği için Türkiye'de gece yarısından sonra bir gün geri kayar) */
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayOf = (s: string) => String(s || "").slice(0, 10)

const TL = (n: number) => `₺${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`

export function FinanceView() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // false: finances tablosunda user_id sütunu yok -> supabase/002_finans_guvenlik.sql çalıştırılmalı
  const [secure, setSecure] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showReports, setShowReports] = useState(true)

  // Filtreleme
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlate, setSelectedPlate] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Form
  const [type, setType] = useState<"income" | "expense">("income")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [plate, setPlate] = useState("")
  const [date, setDate] = useState(localISO(new Date()))
  const [description, setDescription] = useState("")

  const fetchFinances = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    // Önce sadece bu kullanıcının kayıtlarını iste
    let res = await supabase.from("finances").select("*").eq("user_id", user.id)
    let isSecure = true

    if (res.error && (res.error.code === "42703" || /user_id/i.test(res.error.message))) {
      // user_id sütunu henüz yok: eski davranışa dön ve uyar
      isSecure = false
      res = await supabase.from("finances").select("*")
    }

    setSecure(isSecure)

    if (res.error) {
      setLoadError("Kayıtlar yüklenemedi: " + res.error.message)
      setItems([])
    } else {
      const rows: FinanceItem[] = (res.data || []).map((r: any) => ({
        id: String(r.id),
        type: r.type === "expense" ? "expense" : "income",
        category: r.category || "",
        amount: Number(r.amount) || 0,
        plate: r.plate || "",
        date: dayOf(r.date || r.created_at || localISO(new Date())),
        description: r.description || "",
      }))
      rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      setItems(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchFinances()
  }, [fetchFinances])

  const resetForm = () => {
    setCategory("")
    setAmount("")
    setPlate("")
    setDescription("")
    setDate(localISO(new Date()))
    setFormError(null)
  }

  const closeModal = () => {
    setIsOpenModal(false)
    setEditingItem(null)
    resetForm()
  }

  const openNew = (t: "income" | "expense") => {
    setEditingItem(null)
    resetForm()
    setType(t)
    setIsOpenModal(true)
  }

  const handleOpenEdit = (item: FinanceItem) => {
    setEditingItem(item)
    setType(item.type)
    setCategory(item.category || "")
    setAmount(item.amount ? String(item.amount) : "")
    setPlate(item.plate || "")
    setDate(dayOf(item.date) || localISO(new Date()))
    setDescription(item.description || "")
    setFormError(null)
    setIsOpenModal(true)
  }

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setFormError(null)

    const amountNum = Number(String(amount).replace(",", "."))
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError("Lütfen sıfırdan büyük bir tutar girin.")
      setSaving(false)
      return
    }

    const payload: Record<string, unknown> = {
      type,
      category: category.trim() || (type === "income" ? "Navlun Bedeli" : "Mazot Alımı"),
      amount: amountNum,
      plate: plate.toUpperCase().trim(),
      date,
      description: description.trim(),
    }

    let error
    if (editingItem) {
      // RLS + user_id kontrolü: başkasının kaydı güncellenemez
      ;({ error } = await supabase.from("finances").update(payload).eq("id", editingItem.id))
    } else {
      if (secure) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setFormError("Oturum bulunamadı, lütfen yeniden giriş yapın.")
          setSaving(false)
          return
        }
        payload.user_id = user.id
      }
      ;({ error } = await supabase.from("finances").insert([payload]))
    }

    setSaving(false)
    if (error) {
      setFormError("Kaydedilemedi: " + error.message)
      return
    }
    closeModal()
    fetchFinances()
  }

  const handleDelete = async (item: FinanceItem) => {
    if (!supabase) return
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return
    const { error } = await supabase.from("finances").delete().eq("id", item.id)
    if (error) {
      alert("Silinemedi: " + error.message)
      return
    }
    fetchFinances()
  }

  const uniquePlates = useMemo(() => Array.from(new Set(items.map((i) => i.plate).filter(Boolean))), [items])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr-TR")
    return items.filter((item) => {
      if (filterType !== "all" && item.type !== filterType) return false
      if (selectedPlate !== "all" && item.plate !== selectedPlate) return false
      if (q) {
        const hit =
          item.category.toLocaleLowerCase("tr-TR").includes(q) ||
          item.plate.toLocaleLowerCase("tr-TR").includes(q) ||
          item.description.toLocaleLowerCase("tr-TR").includes(q)
        if (!hit) return false
      }
      if (startDate && item.date < startDate) return false
      if (endDate && item.date > endDate) return false
      return true
    })
  }, [items, filterType, selectedPlate, searchQuery, startDate, endDate])

  const totalIncome = filteredItems.filter((i) => i.type === "income").reduce((a, c) => a + c.amount, 0)
  const totalExpense = filteredItems.filter((i) => i.type === "expense").reduce((a, c) => a + c.amount, 0)
  const netProfit = totalIncome - totalExpense

  // ---- Raporlar ----
  const monthly = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: d.toLocaleDateString("tr-TR", { month: "short" }),
        income: 0,
        expense: 0,
      })
    }
    for (const it of filteredItems) {
      const m = months.find((x) => x.key === it.date.slice(0, 7))
      if (!m) continue
      if (it.type === "income") m.income += it.amount
      else m.expense += it.amount
    }
    const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]))
    return { months, max }
  }, [filteredItems])

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of filteredItems) {
      if (it.type !== "expense") continue
      const k = it.category || "Diğer"
      map.set(k, (map.get(k) ?? 0) + it.amount)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [filteredItems])

  const byPlate = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (const it of filteredItems) {
      if (!it.plate) continue
      const cur = map.get(it.plate) ?? { income: 0, expense: 0 }
      if (it.type === "income") cur.income += it.amount
      else cur.expense += it.amount
      map.set(it.plate, cur)
    }
    return Array.from(map.entries())
      .map(([p, v]) => ({ plate: p, ...v, net: v.income - v.expense }))
      .sort((a, b) => b.net - a.net)
  }, [filteredItems])

  // ---- Dönem kısayolları ----
  const setPeriod = (kind: "month" | "lastMonth" | "year" | "all") => {
    const now = new Date()
    if (kind === "all") {
      setStartDate("")
      setEndDate("")
    } else if (kind === "month") {
      setStartDate(localISO(new Date(now.getFullYear(), now.getMonth(), 1)))
      setEndDate(localISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
    } else if (kind === "lastMonth") {
      setStartDate(localISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      setEndDate(localISO(new Date(now.getFullYear(), now.getMonth(), 0)))
    } else {
      setStartDate(`${now.getFullYear()}-01-01`)
      setEndDate(`${now.getFullYear()}-12-31`)
    }
  }

  const exportToCSV = () => {
    if (filteredItems.length === 0) return
    const headers = ["Tarih", "Tür", "Kategori", "Plaka", "Tutar (TL)", "Açıklama"]
    const rows = filteredItems.map((item) =>
      [item.date, item.type === "income" ? "Gelir" : "Gider", csvCell(item.category), csvCell(item.plate), item.amount, csvCell(item.description)].join(";")
    )
    // Türkçe Excel noktalı virgülü ayraç olarak bekler; BOM Türkçe karakterleri korur
    const csv = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `Finans_Raporu_${localISO(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl px-2 pb-12 sm:px-4">
      {/* Başlık & butonlar */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Finansal Yönetim</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#122c4a]">Gelir ve Gider Takibi</h1>
          <p className="mt-0.5 text-xs text-[#718397]">Tüm finansal hareketlerinizi yönetin ve raporlayın.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportToCSV} variant="outline" className="h-10 flex-1 cursor-pointer gap-1.5 border-[#e4e9ef] text-xs sm:flex-none">
            <Download className="size-3.5" /> CSV İndir
          </Button>
          <Button onClick={() => openNew("income")} className="h-10 flex-1 cursor-pointer gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700 sm:flex-none">
            <ArrowUpRight className="size-4" /> Gelir
          </Button>
          <Button onClick={() => openNew("expense")} className="h-10 flex-1 cursor-pointer gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700 sm:flex-none">
            <ArrowDownLeft className="size-4" /> Gider
          </Button>
        </div>
      </div>

      {!secure && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <strong>Güvenlik güncellemesi gerekli:</strong> Gelir-gider tablonuzda kullanıcı ayrımı yok, bu yüzden kayıtlar herkese açık olabilir.
            Supabase SQL Editor&apos;de <code className="rounded bg-amber-100 px-1">supabase/002_finans_guvenlik.sql</code> dosyasını çalıştırın.
          </span>
        </div>
      )}

      {loadError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{loadError}</div>}

      {/* Özet kartları */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-3.5 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium text-[#718397]">Toplam Gelir</span>
            <TrendingUp className="size-4" />
          </div>
          <div className="text-lg font-bold text-emerald-600 sm:text-xl">{TL(totalIncome)}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-3.5 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-red-600">
            <span className="text-xs font-medium text-[#718397]">Toplam Gider</span>
            <TrendingDown className="size-4" />
          </div>
          <div className="text-lg font-bold text-red-600 sm:text-xl">{TL(totalExpense)}</div>
        </div>
        <div className="rounded-xl border border-[#e4e9ef] bg-white p-3.5 shadow-2xs">
          <div className="mb-1 flex items-center justify-between text-blue-600">
            <span className="text-xs font-medium text-[#718397]">Net Bakiye</span>
            <Wallet className="size-4" />
          </div>
          <div className={cn("text-lg font-bold sm:text-xl", netProfit >= 0 ? "text-emerald-700" : "text-red-600")}>{netProfit < 0 ? `-${TL(Math.abs(netProfit))}` : TL(netProfit)}</div>
        </div>
      </div>

      {/* Raporlar */}
      {items.length > 0 && (
        <div className="mb-5 rounded-xl border border-[#e4e9ef] bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => setShowReports((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={showReports}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-[#122c4a]">
              <BarChart3 className="size-4 text-[#315d83]" /> Raporlar
            </span>
            <ChevronDown className={cn("size-4 text-[#8da0b2] transition-transform", showReports && "rotate-180")} />
          </button>

          {showReports && (
            <div className="grid gap-5 border-t border-[#edf0f3] p-4 lg:grid-cols-2">
              {/* Aylık */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Son 6 Ay</h3>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-[#718397]">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" />Gelir</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-400" />Gider</span>
                  </div>
                </div>
                <div className="flex h-36 items-end gap-2">
                  {monthly.months.map((m) => (
                    <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div
                          className="w-full max-w-[18px] rounded-t bg-emerald-500"
                          style={{ height: `${(m.income / monthly.max) * 100}%`, minHeight: m.income > 0 ? 3 : 0 }}
                          title={`${m.label} gelir: ${TL(m.income)}`}
                        />
                        <div
                          className="w-full max-w-[18px] rounded-t bg-red-400"
                          style={{ height: `${(m.expense / monthly.max) * 100}%`, minHeight: m.expense > 0 ? 3 : 0 }}
                          title={`${m.label} gider: ${TL(m.expense)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold capitalize text-[#718397]">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gider dağılımı */}
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Gider Dağılımı</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-xs text-[#8da0b2]">Gösterilecek gider yok.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {expenseByCategory.map(([cat, total]) => (
                      <li key={cat}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-semibold text-[#122c4a]">{cat}</span>
                          <span className="tabular-nums text-[#718397]">
                            {TL(total)} · %{totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]">
                          <div className="h-full rounded-full bg-red-400" style={{ width: `${totalExpense > 0 ? (total / totalExpense) * 100 : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Araç bazlı */}
              {byPlate.length > 0 && (
                <div className="lg:col-span-2">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Araç Bazlı Kârlılık</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-xs">
                      <thead>
                        <tr className="text-left text-[#8da0b2]">
                          <th className="pb-2 font-semibold">Plaka</th>
                          <th className="pb-2 text-right font-semibold">Gelir</th>
                          <th className="pb-2 text-right font-semibold">Gider</th>
                          <th className="pb-2 text-right font-semibold">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf0f3]">
                        {byPlate.map((r) => (
                          <tr key={r.plate}>
                            <td className="py-2 font-bold text-[#122c4a]">{r.plate}</td>
                            <td className="py-2 text-right tabular-nums text-emerald-600">{TL(r.income)}</td>
                            <td className="py-2 text-right tabular-nums text-red-600">{TL(r.expense)}</td>
                            <td className={cn("py-2 text-right font-bold tabular-nums", r.net >= 0 ? "text-emerald-700" : "text-red-600")}>
                              {r.net < 0 ? `-${TL(Math.abs(r.net))}` : TL(r.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Arama & filtreler */}
      <div className="mb-4 space-y-2.5">
        <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Arama yapın (Kategori, plaka...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 pl-9 text-base md:text-xs" />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            {uniquePlates.length > 0 && (
              <select
                value={selectedPlate}
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="h-10 flex-1 rounded-md border border-[#e4e9ef] bg-white px-2.5 text-xs text-[#122c4a] outline-none sm:flex-none"
              >
                <option value="all">Tüm Plakalar</option>
                {uniquePlates.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <div className="flex shrink-0 rounded-lg border border-[#e4e9ef] bg-[#f5f7fa] p-1">
              {([["all", "Tümü", "text-[#122c4a]"], ["income", "Gelirler", "text-emerald-600"], ["expense", "Giderler", "text-red-600"]] as const).map(([key, label, active]) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={cn("cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors", filterType === key ? `bg-white ${active} shadow-xs` : "text-[#718397]")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tarih aralığı */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e4e9ef] bg-gray-50 p-2 text-xs text-gray-600">
          <span className="flex shrink-0 items-center gap-1 font-semibold text-gray-700"><Filter className="size-3" /> Tarih:</span>
          <div className="flex flex-1 items-center gap-1.5 sm:flex-none">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-full bg-white text-xs sm:w-36" />
            <span>-</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-full bg-white text-xs sm:w-36" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([["month", "Bu ay"], ["lastMonth", "Geçen ay"], ["year", "Bu yıl"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setPeriod(k)} className="rounded-full border border-[#e0e6ed] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4a6178] hover:border-[#c4d0dc]">
                {label}
              </button>
            ))}
          </div>
          {(startDate || endDate) && (
            <button onClick={() => setPeriod("all")} className="ml-auto cursor-pointer text-xs text-red-600 hover:underline">
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-[#e4e9ef] bg-white shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#718397]">Kayıtlar yükleniyor...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#718397]">
            {items.length === 0 ? "Henüz kayıt yok. Üstteki Gelir / Gider düğmeleriyle ilk kaydınızı ekleyin." : "Filtrelere uyan kayıt bulunamadı."}
          </div>
        ) : (
          <div className="divide-y divide-[#e4e9ef]">
            {filteredItems.map((item) => {
              const isIncome = item.type === "income"
              return (
                <div key={item.id} className="p-3.5 transition-colors hover:bg-[#f8fafc]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg", isIncome ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                        {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#122c4a]">{item.category}</span>
                          {item.plate && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                              <Truck className="size-3 text-gray-500" />
                              {item.plate}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#718397]">
                          <Calendar className="size-3 shrink-0" />
                          <span>{new Date(item.date + "T00:00:00").toLocaleDateString("tr-TR")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className={cn("text-sm font-bold sm:text-base", isIncome ? "text-emerald-600" : "text-red-600")}>
                        {isIncome ? "+" : "-"}{TL(item.amount)}
                      </div>
                      <div className="ml-1 flex items-center gap-0.5 border-l border-gray-100 pl-1.5">
                        <button onClick={() => handleOpenEdit(item)} className="cursor-pointer p-2 text-gray-400 transition-colors hover:text-blue-600" title="Düzenle" aria-label="Düzenle">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item)} className="cursor-pointer p-2 text-gray-400 transition-colors hover:text-red-600" title="Sil" aria-label="Sil">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <div className="mt-2 flex items-start gap-1.5 break-words rounded-md border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600">
                      <FileText className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
                      <span>{item.description}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Kayıt modalı */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[#e4e9ef] bg-white p-5 shadow-xl sm:max-w-md sm:rounded-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#122c4a]">{editingItem ? "Kayıt Düzenle" : type === "income" ? "Yeni Gelir Ekle" : "Yeni Gider Ekle"}</h2>
              <button onClick={closeModal} className="cursor-pointer p-1 text-gray-400 hover:text-gray-600" aria-label="Kapat">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3.5">
              {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">{formError}</div>}

              <div className="flex rounded-lg border border-[#e4e9ef] bg-[#f5f7fa] p-1">
                <button type="button" onClick={() => setType("income")} className={cn("flex-1 cursor-pointer rounded-md py-2 text-xs font-semibold transition-colors", type === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-[#718397]")}>
                  Gelir
                </button>
                <button type="button" onClick={() => setType("expense")} className={cn("flex-1 cursor-pointer rounded-md py-2 text-xs font-semibold transition-colors", type === "expense" ? "bg-red-600 text-white shadow-xs" : "text-[#718397]")}>
                  Gider
                </button>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#718397]">Hızlı Kategori Seçimi</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {CATEGORY_SUGGESTIONS[type].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn("cursor-pointer rounded border px-2 py-1.5 text-[11px] transition-colors", category === cat ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100")}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <Input required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori adı..." className="h-10 text-base md:text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#718397]">Tutar (₺)</label>
                  <Input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="h-10 text-base md:text-xs" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-[#718397]">Araç Plakası</label>
                  <Input list="finance-plates" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Örn: 42 DLB 59" className="h-10 text-base uppercase md:text-xs" />
                  <datalist id="finance-plates">
                    {uniquePlates.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#718397]">Tarih</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 text-base md:text-xs" />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#718397]">Açıklama / Not</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama giriniz..." className="h-10 text-base md:text-xs" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal} className="h-10 cursor-pointer text-xs">İptal</Button>
                <Button type="submit" disabled={saving} className={cn("h-10 cursor-pointer text-xs text-white", type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                  {saving ? "Kaydediliyor..." : editingItem ? "Güncelle" : "Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
