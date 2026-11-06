"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Load, LoadCard } from "@/components/LoadCard"
import { estimateKm, approxKm } from "@/lib/distance"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { PackageSearch, Plus, X, MapPin, Crown, ArrowLeftRight, Search } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_DELAY_MINUTES, openPremium } from "@/lib/premium"
import { cn } from "@/lib/utils"
import { CITY_NAMES, analyzeListing } from "@/lib/route"
import { supabase } from "@/lib/supabase"
import { SourceInfoButton } from "@/components/SourceInfo"

type ListingsViewProps = {
  loads: Load[]
  stats: {
    activeTotal: number
    todayUserCount: number
    pendingTrips: number
    activeRoutesCount: number
    botCount?: number
    last24h?: number
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

// ---- Güzergâh sayıları: seçilen şehir için TÜM ilanlarda "nereye/nereden kaç ilan var" ----
type CityStat = { total: number; map: Map<string, number>; failed?: boolean }
const STAT_TTL = 2 * 60_000
const statCache = new Map<string, { at: number; stat: CityStat }>()
const cityVariants = (t: string) => {
  const ascii = t.replace(/ı/g, "i").replace(/İ/g, "I").replace(/ş/g, "s").replace(/Ş/g, "S").replace(/ğ/g, "g").replace(/Ğ/g, "G").replace(/ü/g, "u").replace(/Ü/g, "U").replace(/ö/g, "o").replace(/Ö/g, "O").replace(/ç/g, "c").replace(/Ç/g, "C")
  return Array.from(new Set([t, ascii, t.toLocaleLowerCase("tr-TR"), t.toLocaleUpperCase("tr-TR"), ascii.toLowerCase(), ascii.toUpperCase()]))
}

/** mode "dest": city çıkışlı ilanların varış şehirleri; mode "orig": city varışlı ilanların çıkış şehirleri. Veri tasarrufu için yalnızca gerekli sütunlar çekilir. */
async function loadStat(city: string, mode: "dest" | "orig", premium: boolean): Promise<CityStat> {
  const key = `${mode}|${city}|${premium ? 1 : 0}`
  const hit = statCache.get(key)
  if (hit && Date.now() - hit.at < STAT_TTL) return hit.stat
  if (!supabase) return { total: 0, map: new Map(), failed: true }
  try {
    const or = (fields: string[]) => fields.flatMap((f) => cityVariants(city).map((v) => `${f}.ilike.%${v}%`)).join(",")
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString()
    let bq = supabase.from("bot_listings").select("from_city,to_city,cargo_detail").gte("created_at", cutoff).or(or(["from_city", "to_city", "cargo_detail"]))
    if (!premium) bq = bq.lte("created_at", new Date(Date.now() - FREE_DELAY_MINUTES * 60000).toISOString())
    const uq = supabase.from("listings").select("from_city,to_city,cargo_detail,message").or(or(["from_city", "to_city", "cargo_detail", "message"]))
    const [b, u] = await Promise.all([
      bq.order("created_at", { ascending: false }).limit(400),
      uq.order("created_at", { ascending: false }).limit(400),
    ])
    if (b.error && u.error) throw b.error
    const rows: { r: any; user: boolean }[] = [
      ...((u.data as any[]) ?? []).map((r) => ({ r, user: true })),
      ...((b.data as any[]) ?? []).map((r) => ({ r, user: false })),
    ]
    const map = new Map<string, number>()
    let total = 0
    for (const { r, user } of rows) {
      const a: any = analyzeListing({ from: r.from_city, to: r.to_city, cargo: r.cargo_detail, message: user ? r.message : undefined, trustFields: user })
      const fromCity: string | undefined = a.from?.city
      const toCity: string | undefined = a.to?.city
      const cities: string[] = a.cities ?? []
      const dests: string[] = a.destinations ?? []
      const origins = Array.from(new Set([fromCity, ...(fromCity ? [] : cities)].filter(Boolean) as string[]))
      const targets = Array.from(new Set([toCity, ...dests, ...(toCity ? [] : cities)].filter(Boolean) as string[]))
      const ok = mode === "dest" ? origins.includes(city) : targets.includes(city)
      if (!ok) continue
      total++
      for (const c of mode === "dest" ? targets : origins) {
        if (c === city) continue
        map.set(c, (map.get(c) ?? 0) + 1)
      }
    }
    const stat = { total, map }
    statCache.set(key, { at: Date.now(), stat })
    return stat
  } catch {
    return { total: 0, map: new Map(), failed: true }
  }
}

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

  // Seçilen şehre göre diğer listedeki şehirlerin ilan sayıları (tüm ilanlar)
  const [destStat, setDestStat] = useState<CityStat | null>(null) // from seçiliyken: varışlar
  const [origStat, setOrigStat] = useState<CityStat | null>(null) // to seçiliyken: çıkışlar
  useEffect(() => {
    setDestStat(null)
    if (!from) return
    let dead = false
    loadStat(from, "dest", isPremium).then((st) => { if (!dead) setDestStat(st) })
    return () => { dead = true }
  }, [from, isPremium])
  useEffect(() => {
    setOrigStat(null)
    if (!to) return
    let dead = false
    loadStat(to, "orig", isPremium).then((st) => { if (!dead) setOrigStat(st) })
    return () => { dead = true }
  }, [to, isPremium])

  // Sayısı olan şehirler önce ve sayısıyla, kalanlar "İlanı olmayanlar" grubunda
  const renderCityOptions = (stat: CityStat | null, anchor: string, selected: string) => {
    if (!stat || stat.failed) return cityList.map((c) => <option key={c} value={c}>{c}</option>)
    const keep = (c: string) => c !== anchor || c === selected
    const withCount = cityList.filter((c) => keep(c) && (stat.map.get(c) ?? 0) > 0).sort((a, b) => (stat.map.get(b) ?? 0) - (stat.map.get(a) ?? 0) || byTr(a, b))
    const rest = cityList.filter((c) => keep(c) && !withCount.includes(c))
    return (
      <>
        {withCount.length > 0 && (
          <optgroup label="İlanı olanlar">
            {withCount.map((c) => <option key={c} value={c}>{c} ({stat.map.get(c)})</option>)}
          </optgroup>
        )}
        <optgroup label="İlanı olmayanlar">
          {rest.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      </>
    )
  }

  // Seçime göre tek satırlık durum: ilan var mı yok mu
  const routeHint = (() => {
    if (from && to) {
      if (!destStat) return { text: "Güzergâh kontrol ediliyor…", tone: "muted" as const }
      if (destStat.failed) return null
      const n = destStat.map.get(to) ?? 0
      return n > 0 ? { text: `${from} → ${to}: ${n} ilan var`, tone: "ok" as const } : { text: `${from} → ${to} güzergâhında şu an ilan yok`, tone: "none" as const }
    }
    if (from) {
      if (!destStat) return { text: "Varış şehirleri kontrol ediliyor…", tone: "muted" as const }
      if (destStat.failed) return null
      return destStat.total > 0
        ? { text: `${from} çıkışlı ${destStat.total} ilan · ${destStat.map.size} farklı varış`, tone: "ok" as const }
        : { text: `${from} çıkışlı ilan bulunamadı`, tone: "none" as const }
    }
    if (to) {
      if (!origStat) return { text: "Çıkış şehirleri kontrol ediliyor…", tone: "muted" as const }
      if (origStat.failed) return null
      return origStat.total > 0
        ? { text: `${to} varışlı ${origStat.total} ilan · ${origStat.map.size} farklı çıkış`, tone: "ok" as const }
        : { text: `${to} varışlı ilan bulunamadı`, tone: "none" as const }
    }
    return null
  })()

  const [sort, setSort] = useState<"new" | "near" | "far">("new")
  const visibleLoads = useMemo(() => {
    const list = loads.filter((l) => {
      if (from && !matchFrom(l, from)) return false
      if (to && !matchTo(l, to)) return false
      if (from && to && from !== to && l.fromCity && l.toCity && !(l.fromCity === from && matchTo(l, to))) return false
      return true
    })
    if (sort === "new") return list
    // Mesafe sırası: km'si bilinmeyen ilanlar (şehir çifti yok) sona gider
    const km = (l: Load) => estimateKm(l.fromCity, l.toCity) ?? approxKm(l.fromCity, l.toCity) ?? Infinity
    return [...list].sort((a, b) => (sort === "near" ? km(a) - km(b) : (km(b) === Infinity ? -1 : km(b)) - (km(a) === Infinity ? -1 : km(a))))
  }, [loads, from, to, sort])

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
            {typeof stats.last24h === "number" && stats.last24h > 0 && (
              <><b className="font-bold text-foreground">{fmt(stats.last24h)}</b> yeni ilan son 24 saatte · </>
            )}
            {fmt(stats.activeTotal)} aktif ilan · güzergâhını seç, ara.
          </p>
          <SourceInfoButton className="mt-0.5 -ml-0.5 inline-flex min-h-9 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-foreground/80 active:opacity-70" />
        </div>
        <button
          type="button"
          aria-label="Yeni ilan oluştur"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-white shadow-sm shadow-brand/15 transition-all hover:bg-brand/90 active:scale-[0.97] sm:h-11 sm:gap-2 sm:px-5 sm:text-sm"
        >
          <Plus className="size-4 sm:size-5" />
          <span className="hidden min-[390px]:inline">İlan Ver</span>
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
              "flex min-h-11 flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-all active:scale-[0.98] sm:min-h-12 sm:py-1.5",
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
            <select aria-label="Nereden" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(selectClass, "h-11 w-full rounded-xl border-0 bg-muted/55 pl-9 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-brand/30")}>
              <option value="">Nereden</option>
              {renderCityOptions(to ? origStat : null, to, from)}
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
            <select aria-label="Nereye" value={to} onChange={(e) => setTo(e.target.value)} className={cn(selectClass, "h-11 w-full rounded-xl border-0 bg-muted/55 pl-9 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-brand/30")}>
              <option value="">Nereye</option>
              {renderCityOptions(from ? destStat : null, from, to)}
            </select>
          </div>
        </div>
        {routeHint && (
          <p
            role="status"
            className={cn(
              "mt-2 px-1 text-xs font-semibold",
              routeHint.tone === "ok" && "text-emerald-600",
              routeHint.tone === "none" && "text-amber-600",
              routeHint.tone === "muted" && "text-muted-foreground"
            )}
          >
            {routeHint.text}
          </p>
        )}
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

      {!loading && searchQuery.trim().length > 0 && (
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-brand/[0.06] px-3 py-2 text-xs text-foreground">
          <Search className="size-3.5 shrink-0 text-brand" />
          <span className="truncate">Arama: <b>{searchQuery}</b></span>
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs font-medium text-muted-foreground">
          <span><span className="font-bold text-foreground">{visibleLoads.length}</span> ilan gösteriliyor</span>
          <label className="ml-auto inline-flex items-center gap-1.5">
            <span className="sr-only">Sırala</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "near" | "far")} className="h-8 rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-foreground">
              <option value="new">En yeni</option>
              <option value="near">Mesafe: yakın → uzak</option>
              <option value="far">Mesafe: uzak → yakın</option>
            </select>
          </label>
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
