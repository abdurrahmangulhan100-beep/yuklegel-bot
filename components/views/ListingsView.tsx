"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Load, LoadCard } from "@/components/LoadCard"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { PackageSearch, Plus, X, MapPin, Crown, ArrowLeftRight, TrendingUp } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_DELAY_MINUTES, openPremium } from "@/lib/premium"
import { cn } from "@/lib/utils"
import { CITY_NAMES } from "@/lib/route"
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
  /** Nereden / Nereye: sunucuda TÜM ilanlar arasında filtrelenir (page.tsx) */
  from?: string
  to?: string
  onRouteChange?: (from: string, to: string) => void
}

const FILTER_ICON: Record<string, VehicleKind> = { "Tümü": "tumu", Acil: "acil", "Kapalı Dorse": "tir", Kamyon: "kamyon", Kamyonet: "kamyon", Frigo: "frigo", "Kırkayak": "kirkayak", "13.60 Açık Dorse": "acikdorse", Damperli: "damperli" }
const FILTER_OPTIONS = ["Tümü", "Acil", "Kapalı Dorse", "Kamyon", "Kamyonet", "Frigo", "Kırkayak", "13.60 Açık Dorse", "Damperli"]

const selectClass =
  "h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold text-foreground/80 outline-none transition-colors focus:border-primary sm:flex-none sm:min-w-[170px]"

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
  lockedCount = 0,
  from = "",
  to = "",
  onRouteChange
}: ListingsViewProps) {
  const fmt = (n: number) => n.toLocaleString("tr-TR")
  const { isPremium, loading: premiumLoading } = usePremium()

  const setRoute = (f: string, t: string) => onRouteChange?.(f, t)
  const setFrom = (f: string) => setRoute(f, to)
  const setTo = (t: string) => setRoute(from, t)

  // Son seçilen güzergâh bu cihazda hatırlansın (açılışta bir kez uygulanır)
  const PREF_KEY = "listing_filters_v3"
  const prefsLoaded = useRef(false)
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null")
      if (p && (p.from || p.to)) onRouteChange?.(p.from || "", p.to || "")
    } catch {}
    prefsLoaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!prefsLoaded.current) return
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ from, to })) } catch {}
  }, [from, to])

  const matchFrom = (l: Load, c: string) => (l.fromCity ? l.fromCity === c : (l.cities ?? []).includes(c))
  const matchTo = (l: Load, c: string) => (l.toCity ? l.toCity === c || (l.destinations ?? []).includes(c) : (l.cities ?? []).includes(c))

  // Şehir listesi tüm iller (sunucu tüm ilanlarda arar); sayfadaki 60 ilana bağlı değildir
  const cityList = useMemo(() => [...CITY_NAMES].sort(byTr), [])

  const visibleLoads = useMemo(() => {
    return loads.filter((l) => {
      if (from && !matchFrom(l, from)) return false
      if (to && !matchTo(l, to)) return false
      if (from && to && from !== to && l.fromCity && l.toCity && !(l.fromCity === from && matchTo(l, to))) return false
      return true
    })
  }, [loads, from, to])

  // Tek dokunuşla güzergâh: ilanlarda en çok geçen çıkış → varış çiftleri
  const popularRoutes = useMemo(() => {
    const m = new Map<string, { from: string; to: string; n: number }>()
    for (const l of loads) {
      if (!l.fromCity || !l.toCity || l.fromCity === l.toCity) continue
      const k = `${l.fromCity}>${l.toCity}`
      const e = m.get(k)
      if (e) e.n++
      else m.set(k, { from: l.fromCity, to: l.toCity, n: 1 })
    }
    return Array.from(m.values()).sort((a, b) => b.n - a.n || byTr(a.from, b.from)).slice(0, 8)
  }, [loads])

  // Uzun listeyi tek seferde çizmek mobilde kasmaya yol açar: ekran kaydıkça parça parça ekle
  const CHUNK = 20
  const [shown, setShown] = useState(CHUNK)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const filterKey = `${activeFilter}|${sourceFilter}|${from}|${to}|${searchQuery}`
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

  const hasExtraFilters = Boolean(from || to)
  const clearExtra = () => setRoute("", "")
  const clearAll = () => { setActiveFilter("Tümü"); setSourceFilter("all"); clearExtra() }
  const swapRoute = () => setRoute(to, from)

  const sources: { key: "all" | "user" | "bot"; label: string; count?: number; active: string }[] = [
    { key: "all", label: "Tümü", count: stats.activeTotal, active: "bg-primary text-primary-foreground shadow-sm" },
    { key: "user", label: "Nakliye Cepte", count: stats.todayUserCount, active: "bg-brand text-white shadow-sm" },
    { key: "bot", label: "Saha Ağı", count: stats.botCount, active: "bg-[#315d83] text-white shadow-sm" },
  ]

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* Ücretsiz plan: tek satırlık, sakin Premium bilgisi */}
      {!premiumLoading && !isPremium && (
        <button
          type="button"
          onClick={openPremium}
          className="flex w-full items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-left text-xs font-semibold text-amber-700 active:scale-[0.99] dark:text-amber-300"
        >
          <Crown className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {lockedCount > 0
              ? `${lockedCount} yeni ilan Premium'da şu an açık, siz ${FREE_DELAY_MINUTES} dk sonra göreceksiniz`
              : `Ücretsiz planda yeni ilanlar ${FREE_DELAY_MINUTES} dk gecikmeli görünür`}
          </span>
          <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">Anında gör</span>
        </button>
      )}

      {/* Başlık */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            İlanlar
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Canlı
            </span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {fmt(stats.activeTotal)} aktif ilan · WhatsApp gruplarında aramak yerine güzergâhını seç, ara.
          </p>
          <SourceInfoButton className="mt-0.5 -ml-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-foreground/80 active:opacity-70" />
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 sm:inline-flex"
        >
          <Plus className="size-5" />
          İlan Ver
        </button>
      </div>

      {/* Kaynak sekmeleri */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm dark:shadow-none">
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => setSourceFilter(s.key)}
            aria-pressed={sourceFilter === s.key}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-all sm:min-h-12 sm:py-1.5",
              sourceFilter === s.key ? s.active : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span className="text-[13px] font-semibold leading-tight">{s.label}</span>
            {typeof s.count === "number" && (
              <span className={cn("text-[11px] font-medium tabular-nums", sourceFilter === s.key ? "text-white/75" : "text-muted-foreground")}>
                {fmt(s.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Güzergâh: Nereden ⇄ Nereye (mobilde de her zaman görünür) */}
      <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm dark:shadow-none">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="relative min-w-0">
            <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
            <select aria-label="Nereden" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(selectClass, "w-full bg-muted/50 pl-9")}>
              <option value="">Nereden</option>
              {cityList.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <button
            type="button"
            onClick={swapRoute}
            aria-label="Çıkış ve varışı değiştir"
            className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground active:scale-90"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <div className="relative min-w-0">
            <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand" />
            <select aria-label="Nereye" value={to} onChange={(e) => setTo(e.target.value)} className={cn(selectClass, "w-full bg-muted/50 pl-9")}>
              <option value="">Nereye</option>
              {cityList.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Popüler güzergâhlar: tek dokunuşla uygula */}
      {!loading && !from && !to && popularRoutes.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="size-3.5 text-brand" />Son ilanlardaki güzergâhlar
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {popularRoutes.map((r) => (
              <button
                key={`${r.from}>${r.to}`}
                type="button"
                onClick={() => setRoute(r.from, r.to)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground active:scale-95"
              >
                {r.from}<span aria-hidden className="text-muted-foreground">→</span>{r.to}
                <span className="rounded-full bg-brand/10 px-1.5 text-[11px] font-bold tabular-nums text-brand">{r.n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
                  "flex h-10 shrink-0 flex-row items-center gap-1.5 rounded-full border pl-2 pr-3.5 text-[12.5px] font-semibold transition-all active:scale-95",
                  active ? "border-brand bg-brand/10 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-input"
                )}
              >
                <span className="flex h-6 w-10 items-center justify-center">
                  <VehicleIcon kind={FILTER_ICON[option]} className="h-full w-full" />
                </span>
                <span className="whitespace-nowrap">{option}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs font-medium text-muted-foreground">
          <span><span className="font-bold text-foreground">{visibleLoads.length}</span> ilan gösteriliyor</span>
          {(hasExtraFilters || activeFilter !== "Tümü" || sourceFilter !== "all") && (
            <button type="button" onClick={clearAll} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-muted/60 dark:bg-brand/15 px-2.5 font-semibold text-brand active:scale-95">
              <X className="size-3" /> Filtre açık · Temizle
            </button>
          )}
        </div>
      )}

      {/* İlan kartları */}
      {loading ? (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </div>
              <div className="mt-4 h-10 rounded-xl bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="h-12 rounded-xl bg-muted" />
                <div className="h-12 rounded-xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleLoads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-input bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-muted text-foreground/80">
            <PackageSearch className="size-8" />
          </div>
          <p className="text-base font-bold text-foreground">Aramanıza uygun aktif ilan bulunamadı</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {from && to
              ? `${from} → ${to} güzergâhında şu an ilan yok.`
              : "Filtrelerinizi değiştirmeyi veya arama teriminizi temizlemeyi deneyin."}
          </p>
          {from && to && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={() => setTo("")} className="h-10 rounded-xl border border-input bg-card px-4 text-[13px] font-semibold text-foreground">
                Tüm {from} çıkışlı ilanlar
              </button>
              <button onClick={() => setFrom("")} className="h-10 rounded-xl border border-input bg-card px-4 text-[13px] font-semibold text-foreground">
                Tüm {to} ilanları
              </button>
            </div>
          )}
          {(activeFilter !== "Tümü" || sourceFilter !== "all" || hasExtraFilters) && (
            <button
              onClick={clearAll}
              className="mt-5 h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {renderedItems.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              searchQuery={searchQuery}
              isFavorite={favoriteSet.has(load.id)}
              onToggleFavorite={onToggleFavorite}
              onUserBlocked={onUserBlocked}
              onCitySearch={onCitySearch}
            />
          ))}
        </div>
      )}

      {hasHiddenLocal && <div ref={sentinelRef} aria-hidden className="h-8" />}

      {!loading && !hasHiddenLocal && hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="h-12 w-full rounded-xl border border-input bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            Daha fazla ilan göster
          </button>
        </div>
      )}
    </div>
  )
}
