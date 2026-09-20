"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"

export default function FavoritesPage() {
  const [favoriteLoads, setFavoriteLoads] = useState<Load[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserFavorites()
  }, [])

  const loadUserFavorites = async () => {
    setLoading(true)
    try {
      if (!supabase) return

      // 1. Giriş yapan kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFavoriteLoads([])
        setLoading(false)
        return
      }

      // 2. Kullanıcının Supabase'deki favori ilan ID'lerini çek
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)

      if (favError) throw favError

      const ids = favData.map((f) => f.listing_id)
      setFavoriteIds(ids)

      if (ids.length === 0) {
        setFavoriteLoads([])
        setLoading(false)
        return
      }

      // 3. Favorideki ilanların detaylarını listings tablosundan getir
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .in("id", ids)

      if (listingsError) throw listingsError

      // Veriyi Load tipine dönüştür
      const formattedLoads: Load[] = (listingsData || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        company: item.company_name || "İsimsiz Firma",
        initials: (item.company_name || "NK").substring(0, 2).toUpperCase(),
        from: item.from_city || "-",
        to: item.to_city || "-",
        cargo: item.cargo_detail || "Belirtilmedi",
        message: item.message,
        vehicle: item.vehicle_type || "-",
        price: item.price ? `₺${item.price.toLocaleString("tr-TR")}` : "₺0",
        urgent: item.urgent || false,
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        source: "user",
        phone: item.phone || "Belirtilmedi"
      }))

      setFavoriteLoads(formattedLoads)
    } catch (err) {
      console.error("Favoriler yüklenirken hata oluştu:", err)
    } finally {
      setLoading(false)
    }
  }

  // Favoriden Çıkarma Fonksiyonu
  const handleToggleFavorite = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Supabase'den sil
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId)

      // Ekrandan kaldır
      setFavoriteLoads((prev) => prev.filter((load) => load.id !== listingId))
      setFavoriteIds((prev) => prev.filter((id) => id !== listingId))
    } catch (err) {
      console.error("Favori silinirken hata oluştu:", err)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#d64526]">Özel İlan Listeniz</span>
        <h1 className="text-2xl font-bold text-[#122c4a]">Favori İlanlarım</h1>
        <p className="text-xs text-gray-500 mt-1">Takip etmek üzere kaydettiğiniz tüm yük ve taşıma ilanları burada listelenir.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Favori ilanlar yükleniyor...</div>
      ) : favoriteLoads.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-100 p-8 shadow-xs">
          Henüz favorilerinize eklediğiniz bir ilan bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              isFavorite={favoriteIds.includes(load.id)}
              onToggleFavorite={() => handleToggleFavorite(load.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
