// Güncel mazot fiyatı (app_settings.fuel_diesel): tüm kartlar için tek sefer çekilir, bellekte tutulur (ekstra istek yok)
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

let cached: number | null = null
let pending: Promise<number | null> | null = null

function load(): Promise<number | null> {
  if (cached !== null) return Promise.resolve(cached)
  if (!supabase) return Promise.resolve(null)
  pending ??= Promise.resolve(supabase.from("app_settings").select("value").eq("key", "fuel_diesel").maybeSingle())
    .then(({ data }) => {
      const v = data ? parseFloat(String(data.value).replace(",", ".")) : 0
      cached = v > 0 ? v : null
      return cached
    })
    .catch(() => null)
  return pending
}

export function useFuelPrice(): number | null {
  const [price, setPrice] = useState<number | null>(cached)
  useEffect(() => {
    let alive = true
    load().then((v) => { if (alive && v) setPrice(v) })
    return () => { alive = false }
  }, [])
  return price
}
