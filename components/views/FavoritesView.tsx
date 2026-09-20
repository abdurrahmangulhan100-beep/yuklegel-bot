"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"

export function FavoritesView() {
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

      // 1. Giriş yapan aktif kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFavoriteLoads([])
        setFavoriteIds([])
        setLoading(false)
        return
      }

      // 2. Kullanıcının favori ilan ID'lerini çek
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)

      if (favError) {
        console.error("Favoriler çekilirken hata:", favError)
        setLoading(false)
        return
      }

      // ID'lerin string tipinde olduğundan emin ol
      const ids = (favData || []).map((f) => String(f.listing_id)).filter(Boolean)
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

      if (listingsError) {
        console.error("İlan detayları çekilirken hata:", listingsError)
        setLoading(false)
        return
      }

      // Verileri Load yapısına dönüştür
      const formattedLoads: Load[] = (listingsData || []).map((item) => ({
        id: String(item.id),
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
      console.error("Favoriler yüklenirken beklenmeyen hata:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (listingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Supabase'den favoriyi sil
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId)

      // State'i anlık güncelle
      setFavoriteLoads((prev) => prev.filter((load) => String(load.id) !== String(listingId)))
      setFavoriteIds((prev) => prev.filter((id) => id !== String(listingId)))
    } catch (err) {
      console.error("Favori silinirken hata:", err)
    }
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
          Favori ilanlarınız yükleniyor...
        </div>
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
              isFavorite={favoriteIds.includes(String(load.id))}
              onToggleFavorite={() => handleToggleFavorite(String(load.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
