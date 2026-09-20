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
    checkAndLoadFavorites()
  }, [])

  const checkAndLoadFavorites = async () => {
    setLoading(true)

    // 1. Misafir Kontrolü
    const guestCheck = typeof window !== "undefined" ? localStorage.getItem("is_guest") === "true" : false
    setIsGuest(guestCheck)

    if (guestCheck) {
      setLoading(false)
      return
    }

    try {
      // 2. Kullanıcının Supabase ID'sini Al
      const { data: { user } } = await supabase.auth.getUser()

      // 3. LocalStorage'dan kayıtlı favori ID'lerini çek
      const localFavs: string[] = JSON.parse(localStorage.getItem("favorites") || "[]")
      let dbFavIds: string[] = []

      // 4. Supabase DB'den kayıtlı favori ID'lerini çek
      if (user) {
        const { data: favData } = await supabase
          .from("favorites")
          .select("listing_id")
          .eq("user_id", user.id)

        if (favData) {
          dbFavIds = favData.map((f) => String(f.listing_id))
        }
      }

      // İki kaynaktaki ID'leri birleştir (Benzersiz yap)
      const allFavIds = Array.from(new Set([...localFavs.map(String), ...dbFavIds]))

      if (allFavIds.length === 0) {
        setFavoriteLoads([])
        setLoading(false)
        return
      }

      // 5. İlan Detaylarını Getir (Kullanıcı İlanları)
      const { data: listingsData } = await supabase
        .from("listings")
        .select("*")
        .in("id", allFavIds)

      const formattedListings: Load[] = (listingsData || []).map((item) => ({
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

      // 6. Eğer bot/önbellek ilanları varsa onları da ekle
      const cachedLoads: Load[] = JSON.parse(localStorage.getItem("all_cached_loads") || "[]")
      const matchedCachedLoads = cachedLoads.filter((load) => allFavIds.includes(String(load.id)))

      // Tüm eşleşen favorileri birleştir
      const mergedLoads = [...formattedListings]
      matchedCachedLoads.forEach((cached) => {
        if (!mergedLoads.some((m) => String(m.id) === String(cached.id))) {
          mergedLoads.push(cached)
        }
      })

      setFavoriteLoads(mergedLoads)
    } catch (err) {
      console.error("Favoriler yüklenirken hata oluştu:", err)
    } finally {
      setLoading(false)
    }
  }

  // Favoriden Çıkarma Fonksiyonu
  const handleRemoveFavorite = async (listingId: string) => {
    const idStr = String(listingId)

    // LocalStorage Güncelle
    const localFavs: string[] = JSON.parse(localStorage.getItem("favorites") || "[]")
    const updatedLocal = localFavs.filter((id) => String(id) !== idStr)
    localStorage.setItem("favorites", JSON.stringify(updatedLocal))

    // Supabase DB Güncelle
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", idStr)
    }

    // State Güncelle
    setFavoriteLoads((prev) => prev.filter((load) => String(load.id) !== idStr))
  }

  // Misafir Görünümü
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
        <button
          onClick={() => (window.location.href = "/login")}
          className="mt-6 px-6 py-2.5 bg-[#d64526] text-white rounded-lg text-xs font-semibold hover:bg-[#b93820] transition-colors"
        >
          Giriş Yap / Üye Ol
        </button>
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
