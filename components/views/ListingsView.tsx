"use client"

import { Load, LoadCard } from "@/components/LoadCard"
import { PackageSearch, Plus, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

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
  onToggleFavorite?: (id: string) => void
  onUserBlocked?: (key: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
}

const FILTER_OPTIONS = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo"]

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
  hasMore = false,
  onLoadMore
}: ListingsViewProps) {
  const fmt = (n: number) => n.toLocaleString("tr-TR")

  const sources: { key: "all" | "user" | "bot"; label: string; count?: number; active: string }[] = [
    { key: "all", label: "Tümü", count: stats.activeTotal, active: "bg-[#122c4a] text-white shadow-sm" },
    { key: "user", label: "Nakliye Cepte", count: stats.todayUserCount, active: "bg-[#d64526] text-white shadow-sm" },
    { key: "bot", label: "Saha Ağı", count: stats.botCount, active: "bg-[#315d83] text-white shadow-sm" },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Başlık */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#d64526]">Pazar Yeri</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Güncel İlanlar</h1>
          <p className="mt-1 hidden text-sm text-[#627d98] sm:block">
            Saha ve kullanıcı ilanları güncel esas alınarak listelenmektedir.
          </p>
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

      {!loading && (
        <div className="px-1 text-xs font-medium text-[#8da0b2]">
          <span className="font-bold text-[#122c4a]">{loads.length}</span> ilan gösteriliyor
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
              <div className="mt-4 h-24 rounded-2xl bg-[#f3f6f9]" />
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
      ) : loads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
            <PackageSearch className="size-8" />
          </div>
          <p className="text-base font-bold text-[#122c4a]">Aramanıza uygun aktif ilan bulunamadı</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#627d98]">Filtrelerinizi değiştirmeyi veya arama teriminizi temizlemeyi deneyin.</p>
          {(activeFilter !== "Tümü" || sourceFilter !== "all") && (
            <button
              onClick={() => { setActiveFilter("Tümü"); setSourceFilter("all") }}
              className="mt-5 h-11 rounded-xl bg-[#122c4a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a3d68]"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {loads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              searchQuery={searchQuery}
              isFavorite={favoriteIds.includes(load.id)}
              onToggleFavorite={() => onToggleFavorite && onToggleFavorite(load.id)}
              onUserBlocked={onUserBlocked}
            />
          ))}
        </div>
      )}

      {!loading && hasMore && onLoadMore && (
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
