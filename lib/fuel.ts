// Güncel mazot fiyatı (app_settings.fuel_diesel): tüm kartlar için tek sefer çekilir, bellekte tutulur (ekstra istek yok)
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/** app_settings'te fuel_diesel yoksa kullanılan varsayılan (Sefer Hesapla ile aynı) */
export const DEFAULT_FUEL_PRICE = 42
/** Bu süreden eski fiyat "canlı" sayılmaz (otomatik güncelleme durmuş demektir) */
const FRESH_MS = 3 * 86400000

type Fuel = { price: number; updatedAt: string | null }
let cached: Fuel | null = null
let pending: Promise<Fuel | null> | null = null

function load(): Promise<Fuel | null> {
  if (cached) return Promise.resolve(cached)
  if (!supabase) return Promise.resolve(null)
  pending ??= Promise.resolve(supabase.from("app_settings").select("value,updated_at").eq("key", "fuel_diesel").maybeSingle())
    .then(({ data }) => {
      const v = data ? parseFloat(String(data.value).replace(",", ".")) : 0
      cached = v > 0 ? { price: v, updatedAt: data?.updated_at ?? null } : null
      return cached
    })
    .catch(() => null)
  return pending
}

/** "2 saat önce" / "dün" gibi kısa güncelleme etiketi */
export function agoLabel(iso: string | null): string {
  if (!iso) return ""
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${Math.max(1, m)} dk önce`
  if (m < 1440) return `${Math.round(m / 60)} sa önce`
  return `${Math.round(m / 1440)} gün önce`
}

export function useFuelPrice(): { price: number; live: boolean; updatedAt: string | null } {
  const [f, setF] = useState<Fuel | null>(cached)
  useEffect(() => {
    let alive = true
    load().then((v) => { if (alive && v) setF(v) })
    return () => { alive = false }
  }, [])
  const fresh = Boolean(f?.updatedAt) && Date.now() - new Date(f!.updatedAt as string).getTime() < FRESH_MS
  return { price: f?.price ?? DEFAULT_FUEL_PRICE, live: fresh, updatedAt: f?.updatedAt ?? null }
}
