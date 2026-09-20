"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"

export function FavoritesView() {
  const [favoriteLoads, setFavoriteLoads] = useState<Load[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      if (!supabase) return

      // 1. Giriş yapmış kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 2. Favorites tablosundan kullanıcının favorilerini çek
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id)

      if (favError) throw favError

      if (!favData || favData.length === 0) {
        setFavoriteLoads([])
        setFavoriteIds([])
        setLoading(false)
        return
      }

      // Ham ID listesi (Örn: ["user-70d7741a...", "70d7741a..."])
      const rawFavIds = favData.map((f) => String(f.listing_id))
      setFavoriteIds(rawFavIds)

      // "user-" ön eki temizlenmiş alternatif ID kümesi
      const cleanFavIds = rawFavIds.map((id) => id.replace(/^user-/, ""))
      
      // Tüm olası ID kombinasyonlarını birleştir
      const searchIds = Array.from(new Set([...rawFavIds, ...cleanFavIds]))

      // 3. İlanları ilgili tablolardan çek
      const [userListingsRes, botListingsRes, ilanlarRes] = await Promise.all([
        supabase.from("listings").select("*").in("id", searchIds),
        supabase.from("bot_listings").select("*").in("id", searchIds),
        supabase.from("ilanlar").select("*").in("id", searchIds)
      ])

      // 4. Farklı tablolardan gelen verileri standart 'Load' formatına dönüştür
      const userLoads: Load[] = (userListingsRes.data || []).map((item) => ({
        id: String(item.id),
        company: item.company_name || item.company || "İsimsiz Firma",
        initials: (item.company_name || item.company || "NK").substring(0, 2).toUpperCase(),
        from: item.from_location || item.from || "-",
        to: item.to_location || item.to || "-",
        cargo: item.cargo_type || item.cargo || "Yük detayı yok",
        message: item.description || item.message,
        vehicle: item.vehicle_type || item.vehicle || "-",
        price: item.price ? `₺${item.price}` : undefined,
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' }) : "Yeni",
        source: "user",
        phone: item.phone || "Belirtilmedi",
        userId: item.user_id
      }))

      const botLoads: Load[] = (botListingsRes.data || []).map((item) => ({
        id: String(item.id),
        company: item.company || "Saha Lojistik Ağı",
        initials: "SL",
        from: item.from || "-",
        to: item.to || "-",
        cargo: item.content || item.cargo || "Bot Yük Detayı",
        vehicle: item.vehicle || "-",
        time: item.time || "Yeni",
        source: "bot",
        phone: item.phone || "Belirtilmedi"
      }))

      const ilanlarLoads: Load[] = (ilanlarRes.data || []).map((item) => ({
        id: String(item.id),
        company: item.firma_adi || item.company || "Firma",
        initials: "NK",
        from: item.nereden || item.from || "-",
        to: item.nereye || item.to || "-",
        cargo: item.yuk_tipi || item.cargo || "Yük",
        vehicle: item.arac_tipi || item.vehicle || "-",
        time: "Yeni",
        source: "user",
        phone: item.telefon || item.phone || "Belirtilmedi"
      }))

      // Tüm eşleşen verileri birleştir
      const combinedLoads = [...userLoads, ...botLoads, ...ilanlarLoads]
      setFavoriteLoads(combinedLoads)

    } catch (err) {
      console.error("Favoriler yüklenirken hata oluştu:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = (listingId?: string) => {
    if (!listingId) return
    setFavoriteLoads((prev) => prev.filter((load) => load.id !== listingId && `user-${load.id}` !== listingId))
    setFavoriteIds((prev) => prev.filter((id) => id !== listingId))
  }

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

      {favoriteLoads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 text-center shadow-xs">
          <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-sm text-gray-500">Henüz favorilerinize eklediğiniz bir ilan bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              isFavorite={favoriteIds.some(id => id === load.id || id === `user-${load.id}`)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FavoritesView
