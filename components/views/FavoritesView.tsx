"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { LoadCard, Load } from "@/components/LoadCard"

export default function FavoritesView() {
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

      // Ham ID listesi (Örn: ["user-70d7741a...", "user-14e0c945..."])
      const rawFavIds = favData.mapBu durum genellikle frontend tarafındaki **veri çekme (fetch) sorgusu** ile Supabase'deki **veri yapısının veya yetkilerin** uyuşmamasından kaynaklanır. Supabase panelinizde 2 adet kayıt görünmesine ve menüde rozet olarak "2" yazmasına rağmen listede "Henüz favorilerinize eklediğiniz bir ilan bulunmuyor" uyarısı almanızın en olası nedenleri şunlardır:

---

### 1. RLS (Row Level Security) veya Postgres Rolü Sorunu
Supabase tablonuzda **RLS disabled** (RLS kapalı) olarak görünüyor. Ancak istemci (client) tarafından sorgu atarken anon/authenticated rolü ile `SELECT` yaparken izin sorunu yaşıyor olabilirsiniz ya da RLS kapalı olduğu halde politikalar çakışıyor olabilir.
* **Çözüm:** Supabase panelinde `favorites` tablosu için RLS'yi aktif edin (**Enable RLS**) ve authenticated kullanıcılar için okuma politikası ekleyin:
  ```sql
  CREATE POLICY "Kullanıcılar kendi favorilerini görebilir" 
  ON favorites FOR SELECT 
  USING (auth.uid() = user_id);
