"use client"

import { useEffect, useState } from "react"
import { Star, BookmarkCheck, PackageOpen, Sparkles } from "lucide-react"
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
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-52 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="h-56 animate-pulse rounded-[24px] border border-border bg-card" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5">
      <header className="relative overflow-hidden rounded-[26px] border border-border/80 bg-card p-4 shadow-sm sm:rounded-[30px] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-amber-400/[0.09] blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
              <Sparkles className="size-3" /> Kişisel listen
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-foreground sm:text-3xl">Favoriler</h1>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Daha sonra incelemek istediğin yükler burada.
            </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 sm:size-14 sm:rounded-[20px]">
            <BookmarkCheck className="size-6 sm:size-7" />
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
            <PackageOpen className="size-4 shrink-0" />
            <span>Kaydedilen ilan</span>
          </div>
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-extrabold tabular-nums text-foreground">
            {filteredLoads.length.toLocaleString("tr-TR")}
          </span>
        </div>
      </header>

      {filteredLoads.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-border bg-card px-5 py-12 text-center sm:rounded-[30px] sm:py-16">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-[22px] bg-amber-500/10 text-amber-600">
            <Star className="size-7" />
          </div>
          <p className="text-base font-bold text-foreground">
            {searchQuery ? "Aramana uygun favori bulunamadı" : "Henüz favori ilan yok"}
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {searchQuery
              ? "Farklı bir şehir, firma veya yük adıyla tekrar arayabilirsin."
              : "İlan kartlarındaki yıldız simgesine dokunarak ilgilendiğin yükleri burada saklayabilirsin."}
          </p>
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
