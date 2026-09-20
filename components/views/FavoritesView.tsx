"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"

interface FavoritesViewProps {
  loads?: Load[]
  favoriteIds?: string[]
  onToggleFavorite?: (id: string) => void
  searchQuery?: string
}

export function FavoritesView({ 
  loads = [], 
  favoriteIds = [], 
  onToggleFavorite, 
  searchQuery = "" 
}: FavoritesViewProps) {
  const [favoriteLoads, setFavoriteLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true)
      try {
        let combinedFavIds: string[] = [...favoriteIds]

        // 1. LocalStorage'dan favorileri al (Sayfa yenilendiğinde yedek)
        const savedFavs = typeof window !== "undefined" ? localStorage.getItem("favorite_loads") : null
        if (savedFavs) {
          try {
            const parsed = JSON.parse(savedFavs)
            if (Array.isArray(parsed)) {
              combinedFavIds = Array.from(new Set([...combinedFavIds, ...parsed]))
            }
          } catch (e) {
            console.error("LocalStorage favori okuma hatası:", e)
          }
        }

        // 2. Supabase oturum açmış kullanıcı varsa veritabanından favorileri al
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: favData, error } = await supabase
              .from("favorites")
              .select("listing_id")
              .eq("user_id", user.id)

            if (!error && favData) {
              const dbFavIds = favData.map((f) => String(f.listing_id))
              combinedFavIds = Array.from(new Set([...combinedFavIds, ...dbFavIds]))
            }
          }
        }

        // 3. 'loads' listesindeki ilanlarla favori ID'leri eşleştir
        // ID eşleştirmesinde 'user-', 'bot-' gibi ön ekler veya ham ID uyuşmazlıkları toleranslı kontrol edilir
        const matchedLoads = loads.filter((load) => {
          const cleanLoadId = String(load.id).replace(/^(user-|bot-)/, "")
          
          return combinedFavIds.some((favId) => {
            const cleanFavId = String(favId).replace(/^(user-|bot-)/, "")
            return (
              favId === load.id ||
              cleanFavId === cleanLoadId ||
              `user-${cleanLoadId}` === favId ||
              `bot-${cleanLoadId}` === favId
            );
          });
        })

        setFavoriteLoads(matchedLoads)
      } catch (err) {
        console.error("Favoriler işlenirken hata:", err)
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [loads, favoriteIds])

  // Arama filtresi uygula
  const filteredLoads = favoriteLoads.filter((load) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      load.company.toLowerCase().includes(q) ||
      load.from.toLowerCase().includes(q) ||
      load.to.toLowerCase().includes(q) ||
      load.cargo.toLowerCase().includes(q) ||
      (load.message && load.message.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Favoriler yükleniyor...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <span className="text-xs font-bold tracking-wider text-orange-600 uppercase">ÖZEL İLAN LİSTENİZ</span>
        <h1 className="text-2xl font-bold text-[#122c4a]">Favori İlanlarım</h1>
        <p className="text-sm text-gray-500">Takip etmek üzere kaydettiğiniz tüm yük ve taşıma ilanları burada listelenir.</p>
      </div>

      {filteredLoads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 text-center shadow-xs">
          <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-sm text-gray-500">Henüz favorilerinize eklediğiniz bir ilan bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              searchQuery={searchQuery}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FavoritesView
