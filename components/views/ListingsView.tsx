"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Load, LoadCard } from "@/components/LoadCard"
import { AdSlot } from "@/components/AdSlot"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { PackageSearch, Plus, Phone, X, MapPin, Crown, Clock, ArrowRight, Bell, SlidersHorizontal } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_DELAY_MINUTES, openPremium } from "@/lib/premium"
import { cn } from "@/lib/utils"
import { isMissing } from "@/lib/route"
import { SourceInfoButton } from "@/components/SourceInfo"

type ListingsViewProps = {
  loads: Load[]
  stats: {
    activeTotal: number
    todayUserCount: number
    pendingTrips: number
    activeRoutesCount: number
    botCount?: number
  }
  loading: boolean
  activeFilter: string
  setActiveFilter: (filter: string) => void
  sourceFilter: "all" | "user" | "bot"
  setSourceFilter: (source: "all" | "user" | "bot") => void
  setIsCreateOpen: (open: boolean) => void
  searchQuery?: string
  favoriteIds?: string[]
  onToggleFavorite?: (id?: string) => void
  onUserBlocked?: (key: string) => void
  onCitySearch?: (city: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
  /** Ücretsiz kullanıcı için: son gecikme penceresinde gelen ama henüz gösterilmeyen ilan sayısı */
  lockedCount?: number
}

const FILTER_ICON: Record<string, VehicleKind> = { "Tümü": "tumu", Acil: "acil", "Kapalı Dorse": "tir", Kamyon: "kamyon", Frigo: "frigo", "Kırkayak": "kirkayak", "13.60 Açık Dorse": "acikdorse", Damperli: "damperli" }
const FILTER_OPTIONS = ["Tümü", "Acil", "Kapalı Dorse", "Kamyon", "Frigo", "Kırkayak", "13.60 Açık Dorse", "Damperli"]

const selectClass =
  "h-10 min-w-0 flex-1 rounded-xl border border-[#e0e6ed] bg-white px-3 text-[13px] font-semibold text-[#334e68] outline-none transition-colors focus:border-[#122c4a] sm:flex-none sm:min-w-[170px]"

const byTr = (a: string, b: string) => a.localeCompare(b, "tr-TR")

export function ListingsView({
  loads,
  stats,
  loading,
  activeFilter,
  setActiveFilter,
  sourceFilter,
  setSourceFilter,
  setIsCreateOpen,
  searchQuery = "",
  favoriteIds = [],
  onToggleFavorite,
  onUserBlocked,
  onCitySearch,
  hasMore = false,
  onLoadMore,
  lockedCount = 0
}: ListingsViewProps) {
  const fmt = (n: number) => n.toLocaleString("tr-TR")
  const { isPremium, loading: premiumLoading } = usePremium()

  // Güzergâh filtresi: Nereden / Nereye (yönü belli olmayan ilanlarda metinde geçen şehir de sayılır)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [age, setAge] = useState<"" | "1h" | "6h" | "today">("")
  const [onlyPhone, setOnlyPhone] = useState(false)

  // Son seçilen güzergâh bu cihazda hatırlansın (uygulamayı her açışta yeniden seçmek gerekmesin)
  const PREF_KEY = "listing_filters_v1"
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null")
      if (p) { setFrom(p.from || ""); setTo(p.to || ""); setAge(p.age || ""); setOnlyPhone(Boolean(p.onlyPhone)) }
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ from, to, age, onlyPhone })) } catch {}
  }, [from, to, age, onlyPhone])

  const matchFrom = (l: Load, c: string) => (l.fromCity ? l.fromCity === c : (l.cities ?? []).includes(c))
  const matchTo = (l: Load, c: string) => (l.toCity ? l.toCity === c || (l.destinations ?? []).includes(c) : (l.cities ?? []).includes(c))

  // Seçenek sayıları diğer seçime göre hesaplanır: "Nereden: Konya" seçiliyken Nereye listesinde yalnızca Konya çıkışlı yüklerin gittiği şehirler görünür
  const fromOptions = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of loads) {
      if (to && !matchTo(l, to)) continue
      for (const c of Array.from(new Set([l.fromCity, ...(l.fromCity ? [] : l.cities ?? [])].filter(Boolean) as string[]))) m.set(c, (m.get(c) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || byTr(a[0], b[0]))
  }, [loads, to])
  const toOptions = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of loads) {
      if (from && !matchFrom(l, from)) continue
      for (const c of Array.from(new Set([l.toCity, ...(l.destinations ?? []), ...(l.toCity ? [] : l.cities ?? [])].filter(Boolean) as string[]))) m.set(c, (m.get(c) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || byTr(a[0], b[0]))
  }, [loads, from])

  const visibleLoads = useMemo(() => {
    const now = Date.now()
    const maxAge = age === "1h" ? 3600_000 : age === "6h" ? 6 * 3600_000 : age === "today" ? 24 * 3600_000 : 0
    return loads.filter((l) => {
      if (from && !matchFrom(l, from)) return false
      if (to && !matchTo(l, to)) return false
      if (from && to && from !== to && l.fromCity && l.toCity && !(l.fromCity === from && matchTo(l, to))) return false
      if (maxAge && (!l.createdAt || now - Date.parse(l.createdAt) > maxAge)) return false
      if (onlyPhone && isMissing(l.phone)) return false
      return true
    })
  }, [loads, from, to, age, onlyPhone])

  // Uzun listeyi tek seferde çizmek mobilde kasmaya yol açar: ekran kaydıkça parça parça ekle
  const CHUNK = 20
  const [shown, setShown] = useState(CHUNK)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const filterKey = `${activeFilter}|${sourceFilter}|${from}|${to}|${age}|${onlyPhone}|${searchQuery}`
  useEffect(() => { setShown(CHUNK) }, [filterKey])

  const renderedItems = useMemo(() => visibleLoads.slice(0, shown), [visibleLoads, shown])
  const hasHiddenLocal = shown < visibleLoads.length

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasHiddenLocal) return
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setShown((n) => n + CHUNK) },
      { rootMargin: "600px 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasHiddenLocal, shown])

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])

  const [filterOpen, setFilterOpen] = useState(false)
  const extraCount = [from, to, age, onlyPhone].filter(Boolean).length
  const hasExtraFilters = Boolean(from || to || age || onlyPhone)
  const clearExtra = () => { setFrom(""); setTo(""); setAge(""); setOnlyPhone(false) }
  const clearAll = () => { setActiveFilter("Tümü"); setSourceFilter("all"); clearExtra() }

  const sources: { key: "all" | "user" | "bot"; label: string; count?: number; active: string }[] = [
    { key: "all", label: "Tümü", count: stats.activeTotal, active: "bg-[#122c4a] text-white shadow-sm" },
    { key: "user", label: "Nakliye Cepte", count: stats.todayUserCount, active: "bg-[#d64526] text-white shadow-sm" },
    { key: "bot", label: "Saha Ağı", count: stats.botCount, active: "bg-[#315d83] text-white shadow-sm" },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Ücretsiz plan: gecikme bilgisi + Premium'a yönlendirme */}
      {!premiumLoading && !isPremium && (
        <button
          type="button"
          onClick={openPremium}
          className="flex w-full items-center gap-2 rounded-xl border border-[#f3dfb0] bg-[#fff9ec] px-3 py-2.5 text-left text-xs font-semibold text-[#8a5a00] active:scale-[0.99]"
        >
          <Crown className="size-4 shrink-0" />
          {lockedCount > 0
            ? `Son ${FREE_DELAY_MINUTES} dakikada ${lockedCount} yeni ilan eklendi. Premium üyeler bunları şu an görüyor, siz ${FREE_DELAY_MINUTES} dk sonra göreceksiniz. Anında görmek için Premium'a geçin.`
            : `Ücretsiz planda yeni ilanlar ${FREE_DELAY_MINUTES} dakika gecikmeyle görünür. Anında görmek için Premium'a geçin.`}
        </button>
      )}

      {/* Başlık */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-0.5 hidden text-[11px] font-bold uppercase tracking-wider text-[#d64526] sm:block">Pazar Yeri</div>
          <h1 className="text-xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Güncel İlanlar</h1>
          <p className="mt-1 hidden text-sm text-[#627d98] sm:block">
            Saha ve kullanıcı ilanları güncel esas alınarak listelenmektedir.
          </p>
          <SourceInfoButton className="mt-1 -ml-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-[#315d83] active:opacity-70" />
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d64526] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8381e] sm:inline-flex"
        >
          <Plus className="size-5" />
          İlan Oluştur
        </button>
      </div>

      {/* Kaynak sekmeleri */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#e4e9ef] bg-white p-1 shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => setSourceFilter(s.key)}
            aria-pressed={sourceFilter === s.key}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-all sm:min-h-12 sm:py-1.5",
              sourceFilter === s.key ? s.active : "text-[#627d98] hover:bg-[#f5f7fa]"
            )}
          >
            <span className="text-[13px] font-semibold leading-tight">{s.label}</span>
            {typeof s.count === "number" && (
              <span className={cn("text-[11px] font-medium tabular-nums", sourceFilter === s.key ? "text-white/75" : "text-[#8da0b2]")}>
                {fmt(s.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Araç / tip çipleri (yatay kaydırma) */}
      <div className="-mx-4 sm:mx-0">
        <div className="no-scrollbar flex items-stretch gap-2.5 overflow-x-auto px-4 pb-1.5 sm:flex-wrap sm:px-0">
          {FILTER_OPTIONS.map((option) => {
            const active = activeFilter === option
            return (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                aria-pressed={active}
                className={cn(
                  "flex h-11 shrink-0 flex-row items-center gap-1.5 rounded-full border-2 pl-2 pr-3.5 text-[12.5px] font-bold transition-all active:scale-95 sm:h-[96px] sm:w-[112px] sm:flex-col sm:justify-between sm:rounded-2xl sm:px-2 sm:pb-2 sm:pt-2.5",
                  active
                    ? "border-[#122c4a] bg-[#eaf1f8] text-[#122c4a] shadow-[0_8px_18px_-12px_rgba(18,44,74,0.7)]"
                    : "border-[#e4e9ef] bg-white text-[#4a6178] hover:border-[#c4d0dc]"
                )}
              >
                <span className="flex h-7 w-11 items-center justify-center sm:h-12 sm:w-full">
                  <VehicleIcon kind={FILTER_ICON[option]} className="h-full w-full" />
                </span>
                <span className={cn("whitespace-nowrap", option.length > 10 && "sm:text-[11.5px] sm:tracking-tight")}>{option}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobil: tek "Filtreler" düğmesi + alttan açılan pencere */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={cn("inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-bold active:scale-[0.99]", extraCount ? "border-[#122c4a] bg-[#eaf1f8] text-[#122c4a]" : "border-[#e0e6ed] bg-white text-[#4a6178]")}
        >
          <SlidersHorizontal className="size-4" />
          {from && to ? `${from} → ${to}` : from ? `${from} çıkışlı` : to ? `${to} varışlı` : "Güzergâh ve filtreler"}
          {extraCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#d64526] text-[11px] font-black text-white">{extraCount}</span>}
        </button>
        {hasExtraFilters && (
          <button type="button" onClick={clearExtra} aria-label="Filtreleri temizle" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#e0e6ed] bg-white text-[#d64526] active:scale-95">
            <X className="size-4" />
          </button>
        )}
      </div>
      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filtreler"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={clearExtra} className="h-12 rounded-xl border border-[#d9e2ec] bg-white text-sm font-bold text-[#122c4a] active:scale-95">Temizle</button>
            <button type="button" onClick={() => setFilterOpen(false)} className="h-12 rounded-xl bg-[#122c4a] text-sm font-bold text-white active:scale-95">{visibleLoads.length} ilanı göster</button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#486581]">Nereden</span>
            <select aria-label="Nereden" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(selectClass, "w-full")}>
              <option value="">Tümü</option>
              {from && !fromOptions.some(([c]) => c === from) && <option value={from}>{from} (0)</option>}
              {fromOptions.map(([c, n]) => (<option key={c} value={c}>{c} ({n})</option>))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#486581]">Nereye</span>
            <select aria-label="Nereye" value={to} onChange={(e) => setTo(e.target.value)} className={cn(selectClass, "w-full")}>
              <option value="">Tümü</option>
              {to && !toOptions.some(([c]) => c === to) && <option value={to}>{to} (0)</option>}
              {toOptions.map(([c, n]) => (<option key={c} value={c}>{c} ({n})</option>))}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-bold text-[#486581]">Zaman</span>
            <div className="grid grid-cols-4 gap-1.5">
              {([["", "Tümü"], ["1h", "1 saat"], ["6h", "6 saat"], ["today", "24 saat"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setAge(k)} aria-pressed={age === k} className={cn("h-10 rounded-xl border text-xs font-bold", age === k ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#4a6178]")}>{label}</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setOnlyPhone((v) => !v)} aria-pressed={onlyPhone} className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold", onlyPhone ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-[#e0e6ed] bg-white text-[#4a6178]")}>
            <Phone className="size-4" /> Sadece telefonlu ilanlar
          </button>
        </div>
      </Sheet>

      {/* Güzergâh filtresi: Nereden → Nereye */}
      {(fromOptions.length > 0 || toOptions.length > 0 || hasExtraFilters) && (
        <div className="hidden space-y-2 sm:block">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8da0b2]" />
              <select aria-label="Nereden" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(selectClass, "w-full pl-9")}>
                <option value="">Nereden: Tümü</option>
                {from && !fromOptions.some(([c]) => c === from) && <option value={from}>{from} (0)</option>}
                {fromOptions.map(([c, n]) => (<option key={c} value={c}>{c} ({n})</option>))}
              </select>
            </div>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-[#8da0b2]" />
            <div className="relative min-w-0 flex-1">
              <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8da0b2]" />
              <select aria-label="Nereye" value={to} onChange={(e) => setTo(e.target.value)} className={cn(selectClass, "w-full pl-9")}>
                <option value="">Nereye: Tümü</option>
                {to && !toOptions.some(([c]) => c === to) && <option value={to}>{to} (0)</option>}
                {toOptions.map(([c, n]) => (<option key={c} value={c}>{c} ({n})</option>))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:flex-none sm:min-w-[170px]">
              <Clock aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8da0b2]" />
              <select aria-label="Zaman" value={age} onChange={(e) => setAge(e.target.value as "" | "1h" | "6h" | "today")} className={cn(selectClass, "w-full pl-9")}>
                <option value="">Zaman: Tümü</option>
                <option value="1h">Son 1 saat</option>
                <option value="6h">Son 6 saat</option>
                <option value="today">Son 24 saat</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setOnlyPhone((v) => !v)}
              aria-pressed={onlyPhone}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors",
                onlyPhone ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-[#e0e6ed] bg-white text-[#4a6178]"
              )}
            >
              <Phone className="size-3.5" />
              Telefonlu
            </button>
            {hasExtraFilters && (
              <button
                type="button"
                onClick={clearExtra}
                className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[#d64526] hover:bg-[#fff0ec]"
              >
                <X className="size-3.5" /> Temizle
              </button>
            )}
          </div>
          {/* Güzergâh seçiliyse ücretsiz kullanıcıya anlık bildirim önerisi */}
          {!premiumLoading && !isPremium && from && (
            <button
              type="button"
              onClick={openPremium}
              className="flex w-full items-center gap-2 rounded-xl border border-[#cfe0ee] bg-[#f1f7fc] px-3 py-2.5 text-left text-xs font-semibold text-[#315d83] active:scale-[0.99]"
            >
              <Bell className="size-4 shrink-0" />
              {from} çıkışlı yeni ilanlar gelince anında bildirim almak için Premium'a geçin.
            </button>
          )}
        </div>
      )}

      {!loading && (
        <div className="px-1 text-xs font-medium text-[#8da0b2]">
          <span className="font-bold text-[#122c4a]">{visibleLoads.length}</span> ilan gösteriliyor
        </div>
      )}

      {/* İlan kartları */}
      {loading ? (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-[#eef2f6]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded bg-[#eef2f6]" />
                  <div className="h-3 w-1/4 rounded bg-[#f3f6f9]" />
                </div>
              </div>
              <div className="mt-4 h-10 rounded-xl bg-[#f3f6f9]" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-[#f3f6f9]" />
                <div className="h-3 w-3/4 rounded bg-[#f3f6f9]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="h-12 rounded-xl bg-[#eef2f6]" />
                <div className="h-12 rounded-xl bg-[#eef2f6]" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleLoads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
            <PackageSearch className="size-8" />
          </div>
          <p className="text-base font-bold text-[#122c4a]">Aramanıza uygun aktif ilan bulunamadı</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#627d98]">
            {from && to
              ? `${from} → ${to} güzergâhında şu an ilan yok.`
              : "Filtrelerinizi değiştirmeyi veya arama teriminizi temizlemeyi deneyin."}
          </p>
          {from && to && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={() => setTo("")} className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-4 text-[13px] font-semibold text-[#122c4a]">
                Tüm {from} çıkışlı ilanlar
              </button>
              <button onClick={() => setFrom("")} className="h-10 rounded-xl border border-[#cbd5e1] bg-white px-4 text-[13px] font-semibold text-[#122c4a]">
                Tüm {to} ilanları
              </button>
            </div>
          )}
          {(activeFilter !== "Tümü" || sourceFilter !== "all" || hasExtraFilters) && (
            <button
              onClick={clearAll}
              className="mt-5 h-11 rounded-xl bg-[#122c4a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a3d68]"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {renderedItems.map((load, i) => (
            <Fragment key={load.id}>
              <LoadCard
                load={load}
                searchQuery={searchQuery}
                isFavorite={favoriteSet.has(load.id)}
                onToggleFavorite={onToggleFavorite}
                onUserBlocked={onUserBlocked}
                onCitySearch={onCitySearch}
              />
              {(i + 1) % 8 === 0 && <AdSlot promoOnly className="col-span-full" />}
            </Fragment>
          ))}
        </div>
      )}

      {hasHiddenLocal && <div ref={sentinelRef} aria-hidden className="h-8" />}

      {!loading && !hasHiddenLocal && hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="h-12 w-full rounded-xl border border-[#cbd5e1] bg-white px-6 text-sm font-semibold text-[#122c4a] transition-colors hover:bg-[#f5f7fa] sm:w-auto"
          >
            Daha fazla ilan göster
          </button>
        </div>
      )}
    </div>
  )
}
