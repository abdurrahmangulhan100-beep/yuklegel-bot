"use client"

import { Load, LoadCard } from "@/components/LoadCard"
import { Filter, Plus } from "lucide-react"

type ListingsViewProps = {
  loads: Load[]
  stats: {
    activeTotal: number
    todayUserCount: number
    pendingTrips: number
    activeRoutesCount: number
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
}

// Türkçe karakter duyarlı metin normalizasyon fonksiyonu (Tüm il ve ilçeler için hatasız arama sağlar)
function normalizeText(text: string): string {
  if (!text) return ""
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş")
    .replace(/Ö/g, "ö")
    .replace(/Ç/g, "ç")
    .trim()
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
  onToggleFavorite
}: ListingsViewProps) {
  const filterOptions = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo"]

  // Arama filtresini tüm il ve ilçeler için güvenli hale getirme
  const normalizedSearch = normalizeText(searchQuery)
  
  const filteredLoads = loads.filter((load) => {
    if (!normalizedSearch) return true
    
    // İlanın arama yapılabilen alanlarını birleştirip normalize ediyoruz
    // (Load objenizin yapısına göre buradaki alanları çoğaltabilirsiniz, örn: load.title, load.from, load.to vb.)
    const searchableContent = normalizeText(
      `${load.title || ""} ${load.content || ""} ${load.from || ""} ${load.to || ""}`
    )
    
    return searchableContent.includes(normalizedSearch)
  })

  return (
    <div className="space-y-6">
      {/* ÜST BİLGİ & İLAN EKLE BUTONU */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold text-[#d64526] uppercase tracking-wider mb-1">Pazar Yeri</div>
          <h1 className="text-2xl font-bold text-[#122c4a] sm:text-3xl">Güncel İlanlar</h1>
          <p className="mt-1 text-sm text-[#627d98]">
            Saha ve kullanıcı ilanları son 3 gün esas alınarak listelenmektedir.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d64526] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b8381e] transition-colors cursor-pointer shrink-0"
        >
          <Plus className="size-5" />
          İlan Oluştur
        </button>
      </div>

      {/* İLAN KAYNAĞI FİLTRELERİ */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e4e9ef] bg-white p-2 shadow-xs">
        <button
          onClick={() => setSourceFilter("all")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            sourceFilter === "all" ? "bg-[#122c4a] text-white" : "text-[#627d98] hover:bg-[#f5f7fa]"
          }`}
        >
          Tüm İlanlar ({stats.activeTotal})
        </button>
        <button
          onClick={() => setSourceFilter("user")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            sourceFilter === "user" ? "bg-[#d64526] text-white" : "text-[#627d98] hover:bg-[#f5f7fa]"
          }`}
        >
          Nakliye Cepte İlanları ({stats.todayUserCount})
        </button>
        <button
          onClick={() => setSourceFilter("bot")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            sourceFilter === "bot" ? "bg-[#315d83] text-white" : "text-[#627d98] hover:bg-[#f5f7fa]"
          }`}
        >
          Saha Lojistik İlanları
        </button>
      </div>

      {/* ARAÇ & TİP FİLTRELERİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e4e9ef] bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => setActiveFilter(option)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                activeFilter === option
                  ? "bg-[#122c4a] text-white font-semibold"
                  : "text-[#627d98] hover:bg-[#f5f7fa]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#8da0b2] font-medium flex items-center gap-1">
          <Filter className="size-3.5" />
          <span>{filteredLoads.length} ilan listeleniyor</span>
        </div>
      </div>

      {/* İLAN KARTLARI GRİDİ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#8da0b2]">
          <div className="size-8 rounded-full border-2 border-[#d64526] border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-medium">Son 3 günün ilanları yükleniyor...</p>
        </div>
      ) : filteredLoads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center shadow-xs">
          <p className="text-base font-bold text-[#122c4a]">Aramanıza uygun aktif ilan bulunamadı</p>
          <p className="mt-1 text-xs text-[#627d98]">Filtrelerinizi değiştirmeyi veya arama teriminizi temizlemeyi deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              searchQuery={searchQuery}
              isFavorite={favoriteIds.includes(load.id)}
              onToggleFavorite={() => onToggleFavorite && onToggleFavorite(load.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
