"use client"

import { Star, BookmarkX } from "lucide-react"
import { Load, LoadCard } from "@/components/LoadCard"

type FavoritesViewProps = {
  loads: Load[]
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
  searchQuery?: string
}

export function FavoritesView({ loads, favoriteIds, onToggleFavorite, searchQuery = "" }: FavoritesViewProps) {
  const favoriteLoads = loads.filter((load) => favoriteIds.includes(load.id))

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold text-[#d64526] uppercase tracking-wider mb-1">Özel İlan Listeniz</div>
        <h1 className="text-2xl font-bold text-[#122c4a] sm:text-3xl">Favori İlanlarım</h1>
        <p className="mt-1 text-sm text-[#627d98]">
          Takip etmek üzere kaydettiğiniz tüm yük ve taşıma ilanları burada listelenir.
        </p>
      </div>

      {favoriteLoads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center shadow-xs">
          <div className="grid size-14 place-items-center rounded-full bg-[#f8fafc] text-[#8da0b2] mb-4">
            <BookmarkX className="size-7" />
          </div>
          <h3 className="text-base font-bold text-[#122c4a]">Henüz favori ilanınız yok</h3>
          <p className="mt-1 max-w-sm text-xs text-[#627d98]">
            İlanlar sekmesinde ilgilendiğiniz ilanların üzerindeki yıldız butonuna basarak buraya ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favoriteLoads.map((load) => (
            <LoadCard 
              key={load.id} 
              load={load} 
              searchQuery={searchQuery}
              isFavorite={favoriteIds.includes(load.id)}
              onToggleFavorite={() => onToggleFavorite(load.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
