"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"
import { Heart, Lock } from "lucide-react"

export function FavoritesView() {
  const [favoriteLoads, setFavoriteLoads] = useState<Load[]>([])
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    loadUserFavorites()
  }, [])

  const loadUserFavorites = async () => {
    setLoading(true)

    // Misafir Kontrolü
    const guestCheck = typeof window !== "undefined" ? localStorage.getItem("is_guest") === "true" : false
    setIsGuest(guestCheck)

    if (guestCheck) {
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFavoriteLoads([])
        setLoading(false)
        return
      }

      // 1. Supabase 'favorites' tablosundan bu kullanıcının favorilerini al
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)

      if (favError) throw favError

      const favIds = (favData || []).map((f) => String(f.listing_id))

      if (favIds.length === 0) {
        setFavoriteLoads([])
        setLoading(false)
        return
      }

      // 2. Kullanıcı İlanlarından (listings) eşleşenleri çek
      const { data: userListings } = await supabase
        .from("listings")
        .select("*")
        .in("id", favIds)

      // 3. Bot/Saha İlanlarından (bot_listings) eşleşenleri çek
      const { data: botListings } = await supabase
        .from("bot_listings")
        .select("*")
        .in("id", favIds)

      // 4. İlanları formatla
      const formattedUserLoads: Load[] = (userListings || []).map((item) => ({
        id: String(item.id),
        userId: item.user_id,
        company: item.company_name || "Şirket Adı",
        initials: (item.company_name || "NK").substring(0, 2).toUpperCase(),
        from: item.from_city || "-",
        to: item.to_city || "-",
        cargo: item.cargo_detail || "Belirtilmedi",
        message: item.message,
        vehicle: item.vehicle_type || "-",
        price: item.price ? `₺${Number(item.price).toLocaleString("tr-TR")}` : "₺0",
        urgent: item.urgent || false,
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        source: "user",
        phone: item.phone || "Belirtilmedi"
      }))

      const formattedBotLoads: Load[] = (botListings || []).map((item) => ({
        id: String(item.id),
        company: item.company_name || "Saha Lojistik Ağ",
        initials: "SL",
        from: item.from_city || "-",
        to: item.to_city || "-",
        cargo: item.description || item.cargo_detail || "Saha İlanı",
        message: item.message,
        vehicle: item.vehicle_type || "Belirtilmedi",
        price: item.price ? `₺${Number(item.price).toLocaleString("tr-TR")}` : "Belirtilmedi",
        urgent: false,
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        source: "bot",
        phone: item.phone || "-"
      }))

      setFavoriteLoads([...formattedUserLoads, ...formattedBotLoads])
    } catch (err) {
      console.error("Favoriler yüklenirken hata:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", String(listingId))

      setFavoriteLoads((prev) => prev.filter((load) => String(load.id) !== String(listingId)))
    } catch (err) {
      console.error("Favori silinirken hata:", err)
    }
  }

  if (isGuest) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-red-50 text-[#d64526] rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-[#122c4a]">Favorilerim Özelliği Kısıtlı</h2>
        <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
          Misafir hesaplar favori ilanı kaydedemez. Takip etmek istediğiniz ilanları listenize eklemek için lütfen üye girişi yapın.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#d64526]">ÖZEL İLAN LİSTENİZ</span>
        <h1 className="text-2xl font-bold text-[#122c4a]">Favori İlanlarım</h1>
        <p className="text-xs text-gray-500 mt-1">Takip etmek üzere kaydettiğiniz tüm yük ve taşıma ilanları burada listelenir.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 shadow-xs">
          Favorileriniz yükleniyor...
        </div>
      ) : favoriteLoads.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 shadow-xs">
          <Heart className="size-8 text-gray-300 mx-auto mb-2" />
          Henüz favorilerinize eklediğiniz bir ilan bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              isFavorite={true}
              onToggleFavorite={() => handleRemoveFavorite(String(load.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FavoritesView
