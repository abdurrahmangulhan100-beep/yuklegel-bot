"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"
import { mapUserListing, mapBotListing, type DatabaseListing } from "@/lib/listings"

interface FavoritesViewProps {
  loads?: Load[]
  favoriteIds?: string[]
  onToggleFavorite?: (id: string) => void
  searchQuery?: string
  onUserBlocked?: (key: string) => void
  onCitySearch?: (city: string) => void
}

export function FavoritesView({ 
  loads = [], 
  onToggleFavorite, 
  searchQuery = "",
  onUserBlocked,
  onCitySearch
}: FavoritesViewProps) {
  const [favoriteLoads, setFavoriteLoads] = useState<Load[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true)
      try {
        if (!supabase) {
          setLoading(false)
          return
        }

        // 1. Giriş yapmış kullanıcıyı kontrol et
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setFavoriteLoads([])
          setFavoriteIds([])
          setLoading(false)
          return
        }

        // 2. Sadece BU KULLANICIYA ait favori kayıtlarını çek
        const { data: favData, error } = await supabase
          .from("favorites")
          .select("listing_id")
          .eq("user_id", user.id)

        if (error || !favData) {
          setFavoriteLoads([])
          setFavoriteIds([])
          setLoading(false)
          return
        }

        const userFavIds = favData.map((f) => String(f.listing_id))
        setFavoriteIds(userFavIds)

        // 3. 'loads' prop'u ile veritabanından gelen kullanıcı favorilerini ID bazında eşleştir
        const matchedLoads = loads.filter((load) => {
          const cleanLoadId = String(load.id).replace(/^(user-|bot-)/, "")
          return userFavIds.some((favId) => {
            const cleanFavId = String(favId).replace(/^(user-|bot-)/, "")
            return (
              favId === load.id ||
              cleanFavId === cleanLoadId ||
              `user-${cleanLoadId}` === favId ||
              `bot-${cleanLoadId}` === favId
            )
          })
        })

        // Ana listede (son 60 ilan) görünmeyen eski favorileri veritabanından tamamla
        const matchedKeys = new Set(matchedLoads.map((l) => String(l.id)))
        const matchedClean = new Set(matchedLoads.map((l) => String(l.id).replace(/^(user-|bot-)/, "")))
        const userIds: string[] = []
        const botIds: string[] = []
        for (const favId of userFavIds) {
          const clean = favId.replace(/^(user-|bot-)/, "")
          if (favId.startsWith("user-")) {
            if (!matchedKeys.has(favId)) userIds.push(clean)
          } else if (favId.startsWith("bot-")) {
            if (!matchedKeys.has(favId)) botIds.push(clean)
          } else if (!matchedClean.has(clean)) {
            userIds.push(clean)
            botIds.push(clean)
          }
        }

        let extraLoads: Load[] = []
        if (userIds.length > 0 || botIds.length > 0) {
          const [u, b] = await Promise.all([
            userIds.length > 0 ? supabase.from("listings").select("*").in("id", userIds) : Promise.resolve({ data: [] as DatabaseListing[] }),
            botIds.length > 0 ? supabase.from("bot_listings").select("*").in("id", botIds) : Promise.resolve({ data: [] as DatabaseListing[] }),
          ])
          extraLoads = [
            ...((u.data || []) as DatabaseListing[]).map(mapUserListing),
            ...((b.data || []) as DatabaseListing[]).map(mapBotListing),
          ]
        }

        const all = [...matchedLoads, ...extraLoads].sort(
          (a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0)
        )
        setFavoriteLoads(all)
      } catch (err) {
        console.error("Favoriler yüklenirken hata:", err)
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [loads])

  const handleToggleFavorite = (id?: string) => {
    if (!id) return
    const cleanId = id.replace(/^(user-|bot-)/, "")
    
    setFavoriteLoads((prev) => 
      prev.filter((load) => String(load.id).replace(/^(user-|bot-)/, "") !== cleanId)
    )
    setFavoriteIds((prev) => 
      prev.filter((favId) => favId.replace(/^(user-|bot-)/, "") !== cleanId)
    )

    if (onToggleFavorite) {
      onToggleFavorite(id)
    }
  }

  const filteredLoads = favoriteLoads.filter((load) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      load.company.toLowerCase().includes(q) ||
      load.from.toLowerCase().includes(q) ||
      load.to.toLowerCase().includes(q) ||
      (load.cities ?? []).some((c) => c.toLowerCase().includes(q)) ||
      load.cargo.toLowerCase().includes(q) ||
      (load.message && load.message.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8da0b2]">
        <div className="mb-3 size-8 animate-spin rounded-full border-2 border-[#d64526] border-t-transparent" />
        <p className="text-sm font-medium">Favorileriniz yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#d64526]">Özel ilan listeniz</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Favori İlanlarım</h1>
        <p className="mt-1 text-sm text-[#627d98]">Takip etmek üzere kaydettiğiniz tüm yük ve taşıma ilanları burada listelenir.</p>
      </div>

      {filteredLoads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#cbd5e1] bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-500">
            <Star className="size-8" />
          </div>
          <p className="text-base font-bold text-[#122c4a]">Henüz favori ilanınız yok</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#627d98]">İlanlardaki yıldız simgesine dokunarak beğendiğiniz yükleri buraya ekleyebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              searchQuery={searchQuery}
              isFavorite={true}
              onToggleFavorite={handleToggleFavorite}
              onUserBlocked={onUserBlocked}
              onCitySearch={onCitySearch}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FavoritesView
