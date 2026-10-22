"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { Load, LoadCard } from "@/components/LoadCard"
import { AdSlot } from "@/components/AdSlot"
import { PackageSearch, Plus, Zap, Phone, X, MapPin, Crown } from "lucide-react"
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

const FILTER_OPTIONS = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo", "Kırkayak", "Dorse", "Damperli"]

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

  // Şehir filtresi: ilanda herhangi bir yerde geçen şehre göre (yön ayrımı yok)
  const [city, setCity] = useState("")
  const [onlyPhone, setOnlyPhone] = useState(false)

  const cityOptions = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of loads) for (const c of l.cities ?? []) m.set(c, (m.get(c) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1] || byTr(a[0], b[0]))
  }, [loads])

  const visibleLoads = useMemo(
    () =>
      loads.filter((l) => {
        if (city && !(l.cities ?? []).includes(city)) return false
        if (onlyPhone && isMissing(l.phone)) return false
        return true
      }),
    [loads, city, onlyPhone]
  )

  // Uzun listeyi tek seferde çizmek mobilde kasmaya yol açar: ekran kaydıkça parça parça ekle
  const CHUNK = 20
  const [shown, setShown] = useState(CHUNK)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const filterKey = `${activeFilter}|${sourceFilter}|${city}|${onlyPhone}|${searchQuery}`
  useEffect(() => { setShown(CHUNK) }, [filterKey])

  const renderedLoads = useMemo(() => visibleLoads.slice(0, shown), [visibleLoads, shown])
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

  const hasExtraFilters = Boolean(city || onlyPhone)
  const clearAll = () => { setActiveFilter("Tümü"); setSourceFilter("all"); setCity(""); setOnlyPhone(false) }

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
          <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#d64526]">Pazar Yeri</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Güncel İlanlar</h1>
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
              "flex min-h-12 flex-col items-center justify-center rounded-xl px-1.5 py-1.5 transition-all",
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
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
          {FILTER_OPTIONS.map((option) => {
            const active = activeFilter === option
            return (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-all active:scale-95",
                  active
                    ? "border-[#122c4a] bg-[#122c4a] text-white shadow-sm"
                    : "border-[#e0e6ed] bg-white text-[#4a6178] hover:border-[#c4d0dc]"
                )}
              >
                {option === "Acil" && <Zap className={cn("size-3.5", active ? "fill-white" : "fill-[#d64526] text-[#d64526]")} />}
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Şehir filtresi */}
      {(cityOptions.length > 0 || onlyPhone) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none sm:min-w-[200px]">
            <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8da0b2]" />
            <select aria-label="Şehir" value={city} onChange={(e) => setCity(e.target.value)} className={cn(selectClass, "w-full pl-9")}>
              <option value="">Şehir: Tümü</option>
              {cityOptions.map(([c, n]) => (
                <option key={c} value={c}>{c} ({n})</option>
              ))}
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
              onClick={() => { setCity(""); setOnlyPhone(false) }}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[#d64526] hover:bg-[#fff0ec]"
            >
              <X className="size-3.5" /> Temizle
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#627d98]">Filtrelerinizi değiştirmeyi veya arama teriminizi temizlemeyi deneyin.</p>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {renderedLoads.map((load, i) => (
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
