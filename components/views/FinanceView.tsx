"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  ChevronDown,
  Cog,
  Copy,
  Download,
  Fuel,
  Gift,
  Lightbulb,
  Pencil,
  Receipt,
  Route as RouteIcon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Sheet } from "@/components/Sheet"
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

type Period = "month" | "lastMonth" | "quarter" | "year" | "all" | "custom"
type Range = { start: string; end: string }

const CATEGORY_SUGGESTIONS = {
  income: ["Navlun Bedeli", "Sefer Primi", "KDV İadesi", "Diğer Gelir"],
  expense: ["Mazot Alımı", "Tamir / Bakım", "Köprü & HGS", "Yemek / Harcırah", "Lastik / Yedek Parça", "Sigorta / Muayene", "Maaş / Şoför", "Diğer Gider"],
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "Bu ay" },
  { key: "lastMonth", label: "Geçen ay" },
  { key: "quarter", label: "Son 3 ay" },
  { key: "year", label: "Bu yıl" },
  { key: "all", label: "Tümü" },
  { key: "custom", label: "Özel" },
]

const PALETTE = ["#d64526", "#315d83", "#f4a259", "#10b981", "#8b5cf6", "#0ea5e9", "#94a3b8"]
const BUDGET_KEY = "fin_budget_v1"
const PLATE_KEY = "fin_last_plate_v1"
const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500]
const PAGE = 40

// ---------- yardımcılar ----------
const pad = (n: number) => String(n).padStart(2, "0")
/** Yerel saate göre YYYY-MM-DD (toISOString UTC verdiği için Türkiye'de gece yarısından sonra bir gün geri kayar) */
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayOf = (s: string) => String(s || "").slice(0, 10)
const parseDay = (s: string) => new Date(s + "T00:00:00")

const TL = (n: number) => `₺${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`
const TLs = (n: number) => (n < 0 ? `-${TL(Math.abs(n))}` : TL(n))
const compactFmt = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 })
const compact = (n: number) => compactFmt.format(n)

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`

const monthStart = (y: number, m: number) => new Date(y, m, 1)
const monthEnd = (y: number, m: number) => new Date(y, m + 1, 0)

function rangeFor(p: Period, cs: string, ce: string): Range | null {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (p) {
    case "month":
      return { start: localISO(monthStart(y, m)), end: localISO(monthEnd(y, m)) }
    case "lastMonth":
      return { start: localISO(monthStart(y, m - 1)), end: localISO(monthEnd(y, m - 1)) }
    case "quarter":
      return { start: localISO(monthStart(y, m - 2)), end: localISO(monthEnd(y, m)) }
    case "year":
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    case "custom":
      return cs || ce ? { start: cs || "0000-01-01", end: ce || "9999-12-31" } : null
    default:
      return null
  }
}

function prevRangeFor(p: Period, r: Range | null): Range | null {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (p) {
    case "month":
      return { start: localISO(monthStart(y, m - 1)), end: localISO(monthEnd(y, m - 1)) }
    case "lastMonth":
      return { start: localISO(monthStart(y, m - 2)), end: localISO(monthEnd(y, m - 2)) }
    case "quarter":
      return { start: localISO(monthStart(y, m - 5)), end: localISO(monthEnd(y, m - 3)) }
    case "year":
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }
    case "custom": {
      if (!r || r.start.startsWith("0000") || r.end.startsWith("9999")) return null
      const a = parseDay(r.start)
      const b = parseDay(r.end)
      const len = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
      if (len <= 0) return null
      const pe = new Date(a)
      pe.setDate(pe.getDate() - 1)
      const ps = new Date(pe)
      ps.setDate(ps.getDate() - (len - 1))
      return { start: localISO(ps), end: localISO(pe) }
    }
    default:
      return null
  }
}

const inRange = (it: FinanceItem, r: Range | null) => !r || (it.date >= r.start && it.date <= r.end)

function sums(list: FinanceItem[]) {
  let income = 0
  let expense = 0
  for (const i of list) {
    if (i.type === "income") income += i.amount
    else expense += i.amount
  }
  return { income, expense, net: income - expense }
}

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)

function dayLabel(d: string) {
  const today = localISO(new Date())
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (d === today) return "Bugün"
  if (d === localISO(y)) return "Dün"
  return parseDay(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })
}

type CatMeta = { icon: LucideIcon; tone: string }
function catMeta(cat: string, type: "income" | "expense"): CatMeta {
  const c = cat.toLocaleLowerCase("tr-TR")
  if (/mazot|yakıt|yakit|benzin|akaryakıt/.test(c)) return { icon: Fuel, tone: "bg-amber-50 text-amber-600" }
  if (/tamir|bakım|bakim|servis|onarım/.test(c)) return { icon: Wrench, tone: "bg-slate-100 text-slate-600" }
  if (/köprü|koprü|hgs|ogs|otoyol|geçiş|gecis/.test(c)) return { icon: RouteIcon, tone: "bg-violet-50 text-violet-600" }
  if (/yemek|harcırah|harcirah/.test(c)) return { icon: Utensils, tone: "bg-orange-50 text-orange-600" }
  if (/lastik|yedek|parça|parca/.test(c)) return { icon: Cog, tone: "bg-zinc-100 text-zinc-600" }
  if (/sigorta|muayene|kasko/.test(c)) return { icon: ShieldCheck, tone: "bg-teal-50 text-teal-600" }
  if (/maaş|maas|şoför|sofor|personel/.test(c)) return { icon: Users, tone: "bg-indigo-50 text-indigo-600" }
  if (/prim/.test(c)) return { icon: Gift, tone: "bg-pink-50 text-pink-600" }
  if (/kdv/.test(c)) return { icon: Receipt, tone: "bg-sky-50 text-sky-600" }
  if (/navlun|sefer|taşıma|tasima/.test(c)) return { icon: Truck, tone: "bg-emerald-50 text-emerald-600" }
  return type === "income" ? { icon: Banknote, tone: "bg-emerald-50 text-emerald-600" } : { icon: Receipt, tone: "bg-red-50 text-red-500" }
}

// ---------- ana bileşen ----------
export function FinanceView() {
  const [items, setItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // false: finances tablosunda user_id sütunu yok -> supabase/001_play_store_uyumluluk.sql çalıştırılmalı
  const [secure, setSecure] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FinanceItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showReports, setShowReports] = useState(false)
  const [reportKind, setReportKind] = useState<"expense" | "income">("expense")
  const [visible, setVisible] = useState(PAGE)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [otherCat, setOtherCat] = useState(false)
  const [otherPlate, setOtherPlate] = useState(false)
  const [showNote, setShowNote] = useState(false)

  // Filtreler
  const [period, setPeriod] = useState<Period>("month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlate, setSelectedPlate] = useState("all")

  // Bütçe (yalnızca bu cihazda)
  const [budget, setBudget] = useState(0)
  const [editBudget, setEditBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState("")

  // Form
  const [type, setType] = useState<"income" | "expense">("income")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [plate, setPlate] = useState("")
  const [date, setDate] = useState(localISO(new Date()))
  const [description, setDescription] = useState("")

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BUDGET_KEY))
      if (Number.isFinite(b) && b > 0) setBudget(b)
    } catch {
      // depolama kapalı
    }
  }, [])

  const saveBudget = () => {
    const v = Number(String(budgetInput).replace(",", "."))
    const next = Number.isFinite(v) && v > 0 ? v : 0
    setBudget(next)
    setEditBudget(false)
    try {
      if (next > 0) localStorage.setItem(BUDGET_KEY, String(next))
      else localStorage.removeItem(BUDGET_KEY)
    } catch {
      // depolama kapalı
    }
  }

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

  // Sefer Hesapla'dan gelen hazır kayıt: formu doldurup açar
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fin_prefill")
      if (!raw) return
      localStorage.removeItem("fin_prefill")
      const d = JSON.parse(raw)
      setEditingItem(null)
      resetForm()
      setType(d.type === "expense" ? "expense" : "income")
      setCategory(String(d.category || ""))
      setAmount(String(d.amount || ""))
      setDescription(String(d.description || ""))
      setShowNote(true)
      setSheetOpen(true)
    } catch { /* geçersiz kayıt */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtre değişince listeyi başa al
  useEffect(() => {
    setVisible(PAGE)
  }, [period, customStart, customEnd, filterType, searchQuery, selectedPlate])

  // ---------- form işlemleri ----------
  const defaultPlate = () => {
    if (selectedPlate !== "all") return selectedPlate
    let last = ""
    try { last = localStorage.getItem(PLATE_KEY) || "" } catch { /* depolama kapalı */ }
    if (last && uniquePlates.includes(last)) return last
    return uniquePlates.length === 1 ? uniquePlates[0] : ""
  }

  const resetForm = () => {
    setCategory("")
    setAmount("")
    setOtherCat(false)
    setOtherPlate(false)
    setShowNote(false)
    setPlate(defaultPlate())
    setDescription("")
    setDate(localISO(new Date()))
    setFormError(null)
  }

  const closeSheet = () => {
    setSheetOpen(false)
    setEditingItem(null)
  }

  const openNew = (t: "income" | "expense") => {
    setEditingItem(null)
    resetForm()
    setType(t)
    setSheetOpen(true)
  }

  const openEdit = (item: FinanceItem) => {
    setEditingItem(item)
    setType(item.type)
    setCategory(item.category || "")
    setAmount(item.amount ? String(item.amount) : "")
    setPlate(item.plate || "")
    setDate(dayOf(item.date) || localISO(new Date()))
    setDescription(item.description || "")
    setOtherCat(Boolean(item.category) && !CATEGORY_SUGGESTIONS[item.type].includes(item.category))
    setOtherPlate(Boolean(item.plate) && !uniquePlates.includes(item.plate))
    setShowNote(Boolean(item.description))
    setFormError(null)
    setSheetOpen(true)
  }

  /** Aynı kaydı bugünün tarihiyle yeni kayıt olarak aç (tekrarlayan masraflar için) */
  const openRepeat = (item: FinanceItem) => {
    setEditingItem(null)
    setType(item.type)
    setCategory(item.category || "")
    setAmount(item.amount ? String(item.amount) : "")
    setPlate(item.plate || "")
    setDate(localISO(new Date()))
    setDescription(item.description || "")
    setOtherCat(Boolean(item.category) && !CATEGORY_SUGGESTIONS[item.type].includes(item.category))
    setOtherPlate(Boolean(item.plate) && !uniquePlates.includes(item.plate))
    setShowNote(Boolean(item.description))
    setFormError(null)
    setSheetOpen(true)
  }

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setFormError(null)

    const amountNum = Number(String(amount).replace(/\s/g, "").replace(",", "."))
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
    try { if (payload.plate) localStorage.setItem(PLATE_KEY, String(payload.plate)) } catch { /* depolama kapalı */ }
    closeSheet()
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

  // ---------- türetilmiş veriler ----------
  const uniquePlates = useMemo(() => Array.from(new Set(items.map((i) => i.plate).filter(Boolean))), [items])

  /** Son kullanılan (kategori + tutar + plaka) kombinasyonları: tek dokunuşla doldurmak için */
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: FinanceItem[] = []
    for (const it of items) {
      if (it.type !== type) continue
      const k = `${it.category}|${it.amount}|${it.plate}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(it)
      if (out.length >= 4) break
    }
    return out
  }, [items, type])

  const range = useMemo(() => rangeFor(period, customStart, customEnd), [period, customStart, customEnd])
  const prevRange = useMemo(() => prevRangeFor(period, range), [period, range])

  /** Plaka + arama uygulanmış, tarih ve tür filtresi uygulanmamış kayıtlar */
  const base = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr-TR")
    return items.filter((i) => {
      if (selectedPlate !== "all" && i.plate !== selectedPlate) return false
      if (q) {
        const hit =
          i.category.toLocaleLowerCase("tr-TR").includes(q) ||
          i.plate.toLocaleLowerCase("tr-TR").includes(q) ||
          i.description.toLocaleLowerCase("tr-TR").includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [items, selectedPlate, searchQuery])

  const scoped = useMemo(() => base.filter((i) => inRange(i, range)), [base, range])
  const prevScoped = useMemo(() => (prevRange ? base.filter((i) => inRange(i, prevRange)) : null), [base, prevRange])

  const cur = useMemo(() => sums(scoped), [scoped])
  const prev = useMemo(() => (prevScoped ? sums(prevScoped) : null), [prevScoped])

  const listItems = useMemo(() => (filterType === "all" ? scoped : scoped.filter((i) => i.type === filterType)), [scoped, filterType])

  const margin = cur.income > 0 ? (cur.net / cur.income) * 100 : null

  const avgDailyExpense = useMemo(() => {
    const today = localISO(new Date())
    const earliest = scoped.length > 0 ? scoped[scoped.length - 1].date : today
    const start = range && !range.start.startsWith("0000") ? range.start : earliest
    const endRaw = range && !range.end.startsWith("9999") ? range.end : today
    const end = endRaw > today ? today : endRaw
    const days = Math.max(1, Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86_400_000) + 1)
    return cur.expense / days
  }, [scoped, range, cur.expense])

  // Son 6 ay (dönem seçiminden bağımsız, plaka/arama filtresine bağlı)
  const monthly = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: d.toLocaleDateString("tr-TR", { month: "short" }), income: 0, expense: 0 })
    }
    for (const it of base) {
      const m = months.find((x) => x.key === it.date.slice(0, 7))
      if (!m) continue
      if (it.type === "income") m.income += it.amount
      else m.expense += it.amount
    }
    const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]))
    return { months, max }
  }, [base])

  const breakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of scoped) {
      if (it.type !== reportKind) continue
      const k = it.category || "Diğer"
      map.set(k, (map.get(k) ?? 0) + it.amount)
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 6)
    const rest = sorted.slice(6).reduce((a, c) => a + c[1], 0)
    if (rest > 0) top.push(["Diğerleri", rest])
    return top.map(([label, value], i) => ({ label, value, color: PALETTE[Math.min(i, PALETTE.length - 1)] }))
  }, [scoped, reportKind])
  const breakdownTotal = breakdown.reduce((a, c) => a + c.value, 0)

  const byPlate = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>()
    for (const it of scoped) {
      if (!it.plate) continue
      const c = map.get(it.plate) ?? { income: 0, expense: 0 }
      if (it.type === "income") c.income += it.amount
      else c.expense += it.amount
      map.set(it.plate, c)
    }
    return Array.from(map.entries())
      .map(([p, v]) => ({ plate: p, ...v, net: v.income - v.expense }))
      .sort((a, b) => b.net - a.net)
  }, [scoped])
  const plateMax = Math.max(1, ...byPlate.map((p) => Math.abs(p.net)))

  // Bu ayın bütçe durumu (plaka/arama filtresinden bağımsız, tüm kayıtlar)
  const monthSpend = useMemo(() => {
    const key = localISO(new Date()).slice(0, 7)
    return items.filter((i) => i.type === "expense" && i.date.slice(0, 7) === key).reduce((a, c) => a + c.amount, 0)
  }, [items])
  const now = new Date()
  const dayNo = now.getDate()
  const daysInMonth = monthEnd(now.getFullYear(), now.getMonth()).getDate()
  const projected = dayNo >= 3 ? (monthSpend / dayNo) * daysInMonth : null

  // Otomatik içgörüler
  const insights = useMemo(() => {
    const out: string[] = []
    if (prev && prev.expense > 0 && cur.expense > 0) {
      const ch = pct(cur.expense, prev.expense)
      if (ch !== null && Math.abs(ch) >= 5) out.push(`Giderleriniz önceki döneme göre %${Math.abs(Math.round(ch))} ${ch > 0 ? "arttı" : "azaldı"}.`)
    }
    if (prev && prev.income > 0 && cur.income > 0) {
      const ch = pct(cur.income, prev.income)
      if (ch !== null && Math.abs(ch) >= 5) out.push(`Gelirleriniz önceki döneme göre %${Math.abs(Math.round(ch))} ${ch > 0 ? "arttı" : "azaldı"}.`)
    }
    const exp = new Map<string, number>()
    for (const i of scoped) if (i.type === "expense") exp.set(i.category, (exp.get(i.category) ?? 0) + i.amount)
    const topExp = Array.from(exp.entries()).sort((a, b) => b[1] - a[1])[0]
    if (topExp && cur.expense > 0) out.push(`En büyük gider kaleminiz “${topExp[0]}”: ${TL(topExp[1])} (%${Math.round((topExp[1] / cur.expense) * 100)}).`)
    if (byPlate.length > 1) {
      const best = byPlate[0]
      const worst = byPlate[byPlate.length - 1]
      if (best.net > 0) out.push(`En kârlı araç ${best.plate}: ${TLs(best.net)}.`)
      if (worst.net < 0) out.push(`${worst.plate} plakalı araç bu dönemde zararda: ${TLs(worst.net)}.`)
    }
    if (margin !== null) out.push(margin >= 0 ? `Kâr marjınız %${Math.round(margin)}.` : `Giderleriniz gelirinizi aşıyor (marj %${Math.round(margin)}).`)
    return out.slice(0, 4)
  }, [prev, cur, scoped, byPlate, margin])

  // Liste: güne göre grupla
  const grouped = useMemo(() => {
    const shown = listItems.slice(0, visible)
    const groups: { date: string; rows: FinanceItem[]; net: number }[] = []
    for (const it of shown) {
      let g = groups[groups.length - 1]
      if (!g || g.date !== it.date) {
        g = { date: it.date, rows: [], net: 0 }
        groups.push(g)
      }
      g.rows.push(it)
      g.net += it.type === "income" ? it.amount : -it.amount
    }
    return groups
  }, [listItems, visible])

  const exportToCSV = () => {
    if (listItems.length === 0) return
    const headers = ["Tarih", "Tür", "Kategori", "Plaka", "Tutar (TL)", "Açıklama"]
    const rows = listItems.map((item) =>
      [item.date, item.type === "income" ? "Gelir" : "Gider", csvCell(item.category), csvCell(item.plate), String(item.amount).replace(".", ","), csvCell(item.description)].join(";")
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

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? ""
  const hasFilters = selectedPlate !== "all" || searchQuery.trim() !== "" || filterType !== "all"
  const budgetFrac = budget > 0 ? monthSpend / budget : 0

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      {/* Başlık */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#d64526]">Finansal Yönetim</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Gelir ve Gider</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={() => openNew("income")} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:scale-[0.98]">
            <ArrowUpRight className="size-4" /> Gelir Ekle
          </button>
          <button onClick={() => openNew("expense")} className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#d64526] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8381e] active:scale-[0.98]">
            <ArrowDownLeft className="size-4" /> Gider Ekle
          </button>
        </div>
      </div>

      {!secure && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <strong>Güvenlik güncellemesi gerekli:</strong> Gelir-gider tablonuzda kullanıcı ayrımı yok, bu yüzden kayıtlar herkese açık olabilir.
            Supabase SQL Editor&apos;de <code className="rounded bg-amber-100 px-1">supabase/001_play_store_uyumluluk.sql</code> dosyasını çalıştırın.
          </span>
        </div>
      )}
      {loadError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{loadError}</div>}

      {/* Dönem seçimi */}
      <div className="space-y-2.5">
        <div className="-mx-4 sm:mx-0">
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 sm:flex-wrap sm:px-0">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                aria-pressed={period === p.key}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-all active:scale-95",
                  period === p.key ? "border-[#122c4a] bg-[#122c4a] text-white shadow-sm" : "border-[#e0e6ed] bg-white text-[#4a6178] hover:border-[#c4d0dc]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-11 flex-1 bg-white text-base md:text-sm" aria-label="Başlangıç tarihi" />
            <span className="text-[#8da0b2]">–</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-11 flex-1 bg-white text-base md:text-sm" aria-label="Bitiş tarihi" />
          </div>
        )}
      </div>

      {/* Özet kartı */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-[#d64526]/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Net bakiye · {periodLabel}</p>
              <p className={cn("mt-1 text-[34px] font-extrabold leading-none tracking-tight tabular-nums sm:text-5xl", cur.net < 0 && "text-[#ff9b85]")}>{TLs(cur.net)}</p>
              {prev && <Delta cur={cur.net} prev={prev.net} goodWhenUp className="mt-2" dark />}
            </div>
            {margin !== null && (
              <div className="shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">Kâr marjı</div>
                <div className={cn("text-xl font-extrabold tabular-nums", margin < 0 && "text-[#ff9b85]")}>%{Math.round(margin)}</div>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300"><TrendingUp className="size-3.5" /> Gelir</div>
              <div className="mt-1 text-lg font-extrabold tabular-nums sm:text-2xl">{TL(cur.income)}</div>
              {prev && <Delta cur={cur.income} prev={prev.income} goodWhenUp dark small />}
            </div>
            <div className="rounded-2xl bg-white/10 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ff9b85]"><TrendingDown className="size-3.5" /> Gider</div>
              <div className="mt-1 text-lg font-extrabold tabular-nums sm:text-2xl">{TL(cur.expense)}</div>
              {prev && <Delta cur={cur.expense} prev={prev.expense} goodWhenUp={false} dark small />}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="Kayıt" value={String(scoped.length)} />
            <Mini label="Günlük ort. gider" value={TL(Math.round(avgDailyExpense))} />
            <Mini label="Ort. gelir kaydı" value={(() => {
              const n = scoped.filter((i) => i.type === "income").length
              return n > 0 ? TL(Math.round(cur.income / n)) : "-"
            })()} />
          </div>
        </div>
      </section>

      {/* Aylık gider bütçesi */}
      <section className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#122c4a]"><Target className="size-4 text-[#d64526]" /> Aylık gider bütçesi</h2>
          {!editBudget && (
            <button onClick={() => { setBudgetInput(budget > 0 ? String(budget) : ""); setEditBudget(true) }} className="text-xs font-semibold text-[#315d83] hover:underline">
              {budget > 0 ? "Düzenle" : "Bütçe belirle"}
            </button>
          )}
        </div>

        {editBudget ? (
          <div className="mt-3 flex items-center gap-2">
            <Input inputMode="decimal" autoFocus value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="Örn: 150000" className="h-11 flex-1 text-base md:text-sm" />
            <button onClick={saveBudget} className="h-11 rounded-xl bg-[#122c4a] px-4 text-xs font-semibold text-white hover:bg-[#1a3d68]">Kaydet</button>
            <button onClick={() => setEditBudget(false)} className="h-11 rounded-xl px-3 text-xs font-semibold text-[#627d98] hover:bg-[#f0f4f8]">Vazgeç</button>
          </div>
        ) : budget > 0 ? (
          <div className="mt-3">
            <div className="mb-1.5 flex items-baseline justify-between text-xs">
              <span className="tabular-nums text-[#627d98]"><strong className="text-sm text-[#122c4a]">{TL(monthSpend)}</strong> / {TL(budget)}</span>
              <span className={cn("font-bold", budgetFrac >= 1 ? "text-red-600" : budgetFrac >= 0.8 ? "text-amber-600" : "text-emerald-600")}>%{Math.round(budgetFrac * 100)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f6]">
              <div className={cn("h-full rounded-full transition-all", budgetFrac >= 1 ? "bg-red-500" : budgetFrac >= 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, budgetFrac * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#718397]">
              {budgetFrac >= 1 ? `Bütçeyi ${TL(monthSpend - budget)} aştınız.` : `Bu ay ${TL(budget - monthSpend)} harcama hakkınız kaldı.`}
              {projected !== null && projected > budget && budgetFrac < 1 && <span className="font-semibold text-amber-700"> Bu hızla ay sonu ≈ {TL(Math.round(projected))} olur.</span>}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#8da0b2]">Bu ay için bir gider limiti belirleyin, harcamanız limite yaklaşınca uyarı görün.</p>
        )}
      </section>

      {/* Raporlar */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
          <button type="button" onClick={() => setShowReports((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:px-5" aria-expanded={showReports}>
            <span className="flex items-center gap-2 text-sm font-bold text-[#122c4a]"><BarChart3 className="size-4 text-[#315d83]" /> Raporlar & analiz</span>
            <ChevronDown className={cn("size-4 text-[#8da0b2] transition-transform", showReports && "rotate-180")} />
          </button>

          {showReports && (
            <div className="space-y-6 border-t border-[#edf0f3] p-4 sm:p-5">
              {insights.length > 0 && (
                <ul className="space-y-2 rounded-2xl bg-[#f6f9fc] p-3.5">
                  {insights.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-[#334e68]">
                      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Aylık trend */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Son 6 ay</h3>
                    <div className="flex items-center gap-3 text-[10px] font-semibold text-[#718397]">
                      <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" />Gelir</span>
                      <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-400" />Gider</span>
                    </div>
                  </div>
                  <div className="flex h-40 items-end gap-2">
                    {monthly.months.map((m) => {
                      const net = m.income - m.expense
                      return (
                        <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                          <div className="flex h-full w-full items-end justify-center gap-1">
                            <div className="w-full max-w-[18px] rounded-t bg-emerald-500" style={{ height: `${(m.income / monthly.max) * 100}%`, minHeight: m.income > 0 ? 3 : 0 }} title={`${m.label} gelir: ${TL(m.income)}`} />
                            <div className="w-full max-w-[18px] rounded-t bg-red-400" style={{ height: `${(m.expense / monthly.max) * 100}%`, minHeight: m.expense > 0 ? 3 : 0 }} title={`${m.label} gider: ${TL(m.expense)}`} />
                          </div>
                          <span className="text-[10px] font-semibold capitalize text-[#718397]">{m.label}</span>
                          <span className={cn("text-[9px] font-bold tabular-nums", m.income + m.expense === 0 ? "text-[#cbd5e1]" : net >= 0 ? "text-emerald-600" : "text-red-500")}>
                            {m.income + m.expense === 0 ? "–" : `${net > 0 ? "+" : ""}${compact(net)}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Dağılım */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Dağılım · {periodLabel}</h3>
                    <div className="flex rounded-lg border border-[#e4e9ef] bg-[#f5f7fa] p-0.5">
                      {(["expense", "income"] as const).map((k) => (
                        <button key={k} onClick={() => setReportKind(k)} className={cn("rounded-md px-2.5 py-1 text-[11px] font-semibold", reportKind === k ? (k === "income" ? "bg-white text-emerald-600 shadow-xs" : "bg-white text-red-600 shadow-xs") : "text-[#718397]")}>
                          {k === "income" ? "Gelir" : "Gider"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {breakdown.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#8da0b2]">Bu dönemde gösterilecek {reportKind === "income" ? "gelir" : "gider"} yok.</p>
                  ) : (
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <Donut data={breakdown} total={breakdownTotal} />
                      <ul className="w-full min-w-0 flex-1 space-y-2">
                        {breakdown.map((d) => (
                          <li key={d.label} className="flex items-center gap-2 text-xs">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                            <span className="min-w-0 flex-1 truncate font-semibold text-[#122c4a]">{d.label}</span>
                            <span className="shrink-0 tabular-nums text-[#718397]">{TL(d.value)}</span>
                            <span className="w-9 shrink-0 text-right font-bold tabular-nums text-[#122c4a]">%{Math.round((d.value / breakdownTotal) * 100)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Araç bazlı */}
              {byPlate.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8da0b2]">Araç bazlı kârlılık</h3>
                  <ul className="space-y-3">
                    {byPlate.map((r) => (
                      <li key={r.plate}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-[#122c4a]"><Truck className="size-3.5 text-[#8da0b2]" />{r.plate}</span>
                          <span className={cn("font-bold tabular-nums", r.net >= 0 ? "text-emerald-700" : "text-red-600")}>{TLs(r.net)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]">
                          <div className={cn("h-full rounded-full", r.net >= 0 ? "bg-emerald-500" : "bg-red-400")} style={{ width: `${(Math.abs(r.net) / plateMax) * 100}%` }} />
                        </div>
                        <div className="mt-1 flex gap-3 text-[11px] tabular-nums text-[#8da0b2]">
                          <span>Gelir {TL(r.income)}</span>
                          <span>Gider {TL(r.expense)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Kayıtlar */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-[#122c4a]">
            Kayıtlar <span className="text-sm font-medium text-[#8da0b2]">({listItems.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8da0b2]" />
              <Input placeholder="Kategori, plaka, not..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 bg-white pl-9 pr-8 text-base md:text-xs" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Aramayı temizle" className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[#8da0b2] hover:bg-[#eef2f6]">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {uniquePlates.length > 0 && (
              <select value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} aria-label="Plaka filtresi" className="h-10 rounded-lg border border-[#e4e9ef] bg-white px-2.5 text-xs font-semibold text-[#122c4a] outline-none">
                <option value="all">Tüm plakalar</option>
                {uniquePlates.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <div className="flex shrink-0 rounded-lg border border-[#e4e9ef] bg-[#f5f7fa] p-0.5">
              {([["all", "Tümü", "text-[#122c4a]"], ["income", "Gelir", "text-emerald-600"], ["expense", "Gider", "text-red-600"]] as const).map(([key, label, active]) => (
                <button key={key} onClick={() => setFilterType(key)} className={cn("rounded-md px-2.5 py-2 text-xs font-semibold transition-colors", filterType === key ? `bg-white ${active} shadow-xs` : "text-[#718397]")}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={exportToCSV} disabled={listItems.length === 0} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e4e9ef] bg-white px-3 text-xs font-semibold text-[#334e68] hover:bg-[#f5f7fa] disabled:opacity-40">
              <Download className="size-3.5" /> CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[68px] animate-pulse rounded-2xl border border-[#e4e9ef] bg-white" />
            ))}
          </div>
        ) : listItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
              <Receipt className="size-7" />
            </div>
            <p className="text-sm font-bold text-[#122c4a]">{items.length === 0 ? "Henüz kayıt yok" : "Bu filtrelerde kayıt bulunamadı"}</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-[#718397]">
              {items.length === 0 ? "Yukarıdaki Gelir Ekle / Gider Ekle düğmeleriyle ilk kaydınızı oluşturun." : period !== "all" || hasFilters ? "Dönemi veya filtreleri değiştirmeyi deneyin." : ""}
            </p>
            {items.length > 0 && (period !== "all" || hasFilters) && (
              <button onClick={() => { setPeriod("all"); setFilterType("all"); setSelectedPlate("all"); setSearchQuery("") }} className="mt-4 h-10 rounded-xl bg-[#122c4a] px-5 text-xs font-semibold text-white hover:bg-[#1a3d68]">
                Tüm kayıtları göster
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.date}>
                <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
                  <span className="font-bold text-[#334e68]">{dayLabel(g.date)}</span>
                  <span className={cn("font-bold tabular-nums", g.net >= 0 ? "text-emerald-600" : "text-red-500")}>{g.net > 0 ? "+" : ""}{TLs(g.net)}</span>
                </div>
                <div className="divide-y divide-[#edf0f3] overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
                  {g.rows.map((item) => {
                    const isIncome = item.type === "income"
                    const meta = catMeta(item.category, item.type)
                    return (
                      <div key={item.id} className="transition-colors hover:bg-[#f8fafc]">
                        <button type="button" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} aria-expanded={expandedId === item.id} className="flex w-full items-center gap-3 p-3.5 text-left">
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.tone)}>
                            <meta.icon className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="truncate text-sm font-bold text-[#122c4a]">{item.category}</span>
                              {item.plate && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                                  <Truck className="size-3 text-[#94a3b8]" />
                                  {item.plate}
                                </span>
                              )}
                            </div>
                            {item.description && <p className={cn("mt-0.5 text-xs text-[#718397]", expandedId !== item.id && "line-clamp-1")}>{item.description}</p>}
                          </div>
                          <div className={cn("shrink-0 text-right text-sm font-extrabold tabular-nums sm:text-base", isIncome ? "text-emerald-600" : "text-red-600")}>
                            {isIncome ? "+" : "-"}{TL(item.amount)}
                          </div>
                        </button>
                        {expandedId === item.id && <div className="flex justify-end gap-0.5 px-3.5 pb-3">
                          <button onClick={() => openRepeat(item)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#8da0b2] hover:bg-[#eef4f8] hover:text-[#315d83]" title="Bugünün tarihiyle tekrarla">
                            <Copy className="size-3.5" /> Tekrarla
                          </button>
                          <button onClick={() => openEdit(item)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#8da0b2] hover:bg-[#eef4f8] hover:text-[#315d83]" aria-label="Düzenle">
                            <Pencil className="size-3.5" /> Düzenle
                          </button>
                          <button onClick={() => handleDelete(item)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-[#8da0b2] hover:bg-red-50 hover:text-red-600" aria-label="Sil">
                            <Trash2 className="size-3.5" /> Sil
                          </button>
                        </div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {visible < listItems.length && (
              <button onClick={() => setVisible((v) => v + PAGE)} className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white text-sm font-semibold text-[#122c4a] hover:bg-[#f5f7fa]">
                Daha fazla göster ({listItems.length - visible} kayıt daha)
              </button>
            )}
          </div>
        )}
      </section>

      <p className="px-2 text-center text-[11px] leading-relaxed text-[#8da0b2]">
        Bu bölüm yalnızca kişisel takip içindir; fatura, defter veya mali müşavirlik hizmeti yerine geçmez. Vergi ve yasal kayıt yükümlülükleri kullanıcıya aittir.{" "}
        <a href="/kullanim-kosullari" className="font-semibold underline">Kullanım Koşulları</a>
      </p>

      {/* Kayıt formu */}
      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingItem ? "Kaydı Düzenle" : type === "income" ? "Yeni Gelir" : "Yeni Gider"}
        footer={
          <button
            type="submit"
            form="fin-form"
            disabled={saving}
            className={cn("h-12 w-full rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60", type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#d64526] hover:bg-[#b8381e]")}
          >
            {saving ? "Kaydediliyor..." : editingItem ? "Güncelle" : "Kaydet"}
          </button>
        }
      >
        <form id="fin-form" onSubmit={handleSaveRecord} className="space-y-5 pt-1">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">{formError}</div>}

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#eaeff4] p-1">
            <button type="button" onClick={() => { setType("income"); setCategory(""); setOtherCat(false) }} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", type === "income" ? "bg-emerald-600 text-white shadow-sm" : "text-[#627d98]")}>Gelir</button>
            <button type="button" onClick={() => { setType("expense"); setCategory(""); setOtherCat(false) }} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", type === "expense" ? "bg-[#d64526] text-white shadow-sm" : "text-[#627d98]")}>Gider</button>
          </div>

          {!editingItem && recent.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#334e68]">Son kullanılanlar · tek dokunuşla doldur</p>
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {recent.map((r) => (
                  <button key={r.id} type="button" onClick={() => { setCategory(r.category); setAmount(String(r.amount)); setPlate(r.plate); setOtherCat(!CATEGORY_SUGGESTIONS[type].includes(r.category)) }} className="shrink-0 rounded-xl border border-[#e0e6ed] bg-white px-3 py-2 text-left active:scale-95">
                    <span className="block text-xs font-bold text-[#122c4a]">{r.category}</span>
                    <span className="block text-[11px] tabular-nums text-[#718397]">{TL(r.amount)}{r.plate ? ` · ${r.plate}` : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#334e68]" htmlFor="fin-amount">Tutar</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#8da0b2]">₺</span>
              <input
                id="fin-amount"
                inputMode="decimal"
                autoComplete="off"
                autoFocus={!editingItem}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="h-14 w-full rounded-xl border border-[#dbe3ec] bg-white pl-10 pr-4 text-2xl font-extrabold tabular-nums text-[#122c4a] outline-none transition-colors focus:border-[#122c4a] focus:ring-4 focus:ring-[#122c4a]/10"
              />
            </div>
            <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
              {QUICK_AMOUNTS.map((n) => (
                <button key={n} type="button" onClick={() => setAmount((cur0) => String((Number(String(cur0).replace(",", ".")) || 0) + n))} className="h-9 shrink-0 rounded-full border border-[#e0e6ed] bg-white px-3.5 text-xs font-semibold text-[#4a6178] active:scale-95">+{n.toLocaleString("tr-TR")}</button>
              ))}
              {amount && <button type="button" onClick={() => setAmount("")} className="h-9 shrink-0 rounded-full px-3 text-xs font-semibold text-[#8da0b2]">Sıfırla</button>}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#334e68]">Kategori</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORY_SUGGESTIONS[type].map((cat) => {
                const m = catMeta(cat, type)
                const on = category === cat && !otherCat
                return (
                  <button key={cat} type="button" onClick={() => { setCategory(cat); setOtherCat(false) }} aria-pressed={on} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition-all active:scale-95", on ? "border-[#122c4a] bg-[#122c4a]/[0.04] ring-2 ring-[#122c4a]/15" : "border-[#e4e9ef] bg-white")}>
                    <span className={cn("grid size-9 place-items-center rounded-xl", m.tone)}><m.icon className="size-[18px]" /></span>
                    <span className="text-[11px] font-semibold leading-tight text-[#122c4a]">{cat}</span>
                  </button>
                )
              })}
              <button type="button" onClick={() => { setOtherCat(true); setCategory("") }} aria-pressed={otherCat} className={cn("flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-1.5 py-2.5 text-center text-[11px] font-semibold text-[#4a6178] active:scale-95", otherCat ? "border-[#122c4a] bg-[#122c4a]/[0.04]" : "border-[#cbd5e1] bg-white")}>
                <Pencil className="size-[18px]" />
                Başka…
              </button>
            </div>
            {otherCat && <Input autoFocus value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori adı" className="mt-2 h-11 text-base md:text-sm" />}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#334e68]">Araç (ops.)</p>
            <div className="flex flex-wrap gap-1.5">
              {uniquePlates.map((p) => (
                <button key={p} type="button" onClick={() => { setPlate(plate === p ? "" : p); setOtherPlate(false) }} aria-pressed={plate === p} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors", plate === p ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#4a6178]")}>
                  <Truck className="size-3.5" />{p}
                </button>
              ))}
              {(uniquePlates.length === 0 || otherPlate) ? null : (
                <button type="button" onClick={() => { setOtherPlate(true); setPlate("") }} className="rounded-full border border-dashed border-[#cbd5e1] px-3 py-2 text-xs font-semibold text-[#4a6178]">+ Yeni plaka</button>
              )}
            </div>
            {(uniquePlates.length === 0 || otherPlate) && <Input id="fin-plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Örn: 42 DLB 59" className="mt-2 h-11 text-base uppercase md:text-sm" />}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#334e68]">Tarih</p>
            {(() => {
              const t0 = localISO(new Date())
              const yd = new Date(); yd.setDate(yd.getDate() - 1)
              const y0 = localISO(yd)
              const chip = (on: boolean) => cn("h-10 flex-1 rounded-xl border text-xs font-semibold transition-colors", on ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#4a6178]")
              return (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setDate(t0)} className={chip(date === t0)}>Bugün</button>
                  <button type="button" onClick={() => setDate(y0)} className={chip(date === y0)}>Dün</button>
                  <Input id="fin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Başka tarih" className={cn("h-10 flex-[1.4] text-base md:text-sm", date !== t0 && date !== y0 && "border-[#122c4a]")} />
                </div>
              )
            })()}
          </div>

          {showNote ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#334e68]" htmlFor="fin-desc">Not</label>
              <Input id="fin-desc" autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Örn: Konya → Adana seferi, 320 lt" className="h-11 text-base md:text-sm" />
            </div>
          ) : (
            <button type="button" onClick={() => setShowNote(true)} className="text-xs font-semibold text-[#315d83] hover:underline">+ Not ekle</button>
          )}
        </form>
      </Sheet>
    </div>
  )
}

// ---------- küçük bileşenler ----------
function Delta({ cur, prev, goodWhenUp, dark, small, className }: { cur: number; prev: number; goodWhenUp: boolean; dark?: boolean; small?: boolean; className?: string }) {
  const ch = pct(cur, Math.abs(prev))
  if (ch === null || !Number.isFinite(ch)) return null
  const up = cur >= prev
  const good = up === goodWhenUp
  const tone = dark ? (good ? "text-emerald-300" : "text-[#ff9b85]") : good ? "text-emerald-600" : "text-red-600"
  return (
    <div className={cn("flex items-center gap-1 font-semibold", small ? "mt-0.5 text-[11px]" : "text-xs", tone, className)}>
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      %{Math.abs(Math.round(ch))} <span className={dark ? "font-medium text-white/50" : "font-medium text-[#8da0b2]"}>önceki döneme göre</span>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.07] px-2 py-2.5">
      <div className="text-[10px] font-bold uppercase leading-tight tracking-wider text-white/50">{label}</div>
      <div className="mt-0.5 truncate text-sm font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

function Donut({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  let acc = 0
  const stops = data
    .map((d) => {
      const from = (acc / total) * 100
      acc += d.value
      const to = (acc / total) * 100
      return `${d.color} ${from}% ${to}%`
    })
    .join(", ")
  return (
    <div className="relative size-36 shrink-0 rounded-full" style={{ background: total > 0 ? `conic-gradient(${stops})` : "#eef2f6" }} role="img" aria-label="Dağılım grafiği">
      <div className="absolute inset-[24px] grid place-items-center rounded-full bg-white text-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8da0b2]">Toplam</div>
          <div className="text-sm font-extrabold tabular-nums text-[#122c4a]">₺{compact(total)}</div>
        </div>
      </div>
    </div>
  )
}
