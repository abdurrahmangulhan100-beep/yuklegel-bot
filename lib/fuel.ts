// Motorin fiyatı çıkış iline göre Opet'ten otomatik alınır ve Supabase'de il bazında önbelleklenir.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const FRESH_MS = 6 * 60 * 60 * 1000
const REFRESH_MS = FRESH_MS
const PROVINCE_CODES: Record<string, number> = {
  Adana: 1, Adıyaman: 2, Afyonkarahisar: 3, Ağrı: 4, Amasya: 5, Ankara: 6, Antalya: 7, Artvin: 8, Aydın: 9,
  Balıkesir: 10, Bilecik: 11, Bingöl: 12, Bitlis: 13, Bolu: 14, Burdur: 15, Bursa: 16, Çanakkale: 17,
  Çankırı: 18, Çorum: 19, Denizli: 20, Diyarbakır: 21, Edirne: 22, Elazığ: 23, Erzincan: 24, Erzurum: 25,
  Eskişehir: 26, Gaziantep: 27, Giresun: 28, Gümüşhane: 29, Hakkari: 30, Hatay: 31, Isparta: 32, Mersin: 33,
  İstanbul: 34, İzmir: 35, Kars: 36, Kastamonu: 37, Kayseri: 38, Kırklareli: 39, Kırşehir: 40, Kocaeli: 41,
  Konya: 42, Kütahya: 43, Malatya: 44, Manisa: 45, Kahramanmaraş: 46, Mardin: 47, Muğla: 48, Muş: 49,
  Nevşehir: 50, Niğde: 51, Ordu: 52, Rize: 53, Sakarya: 54, Samsun: 55, Siirt: 56, Sinop: 57, Sivas: 58,
  Tekirdağ: 59, Tokat: 60, Trabzon: 61, Tunceli: 62, Şanlıurfa: 63, Uşak: 64, Van: 65, Yozgat: 66,
  Zonguldak: 67, Aksaray: 68, Bayburt: 69, Karaman: 70, Kırıkkale: 71, Batman: 72, Şırnak: 73, Bartın: 74,
  Ardahan: 75, Iğdır: 76, Yalova: 77, Karabük: 78, Kilis: 79, Osmaniye: 80, Düzce: 81,
}
type Fuel = { price: number; updatedAt: string | null; approx?: boolean }
const fuelDiag = new Map<number, string>()
/** Son yakıt denemesinin başarısızlık nedeni (tanı satırı için) */
export const getFuelDiag = (code?: number) => (code ? fuelDiag.get(code) ?? "" : "")
export const provinceCode = (city?: string) => (city ? PROVINCE_CODES[city] : undefined)
const cache = new Map<number, Fuel | null>()
const pending = new Map<number, Promise<Fuel | null>>()

async function readPrice(code: number): Promise<Fuel | null> {
  if (!supabase) return null
  const key = `fuel_diesel_${code}`
  const { data } = await supabase.from("app_settings").select("value,updated_at").eq("key", key).maybeSingle()
  const price = data ? parseFloat(String(data.value).replace(",", ".")) : 0
  return price > 0 && data?.updated_at ? { price, updatedAt: data.updated_at } : null
}

// İlin kendi fiyatı yoksa (sunucu ulaşılamadıysa) bilinen büyük illerden biri yaklaşık değer olarak kullanılır; asla "canlı" sayılmaz
async function readFallback(): Promise<Fuel | null> {
  if (!supabase) return null
  const keys = ["fuel_diesel_34", "fuel_diesel_6", "fuel_diesel_35", "fuel_diesel_42"]
  const { data } = await supabase.from("app_settings").select("key,value,updated_at").in("key", keys)
  for (const k of keys) {
    const row = (data ?? []).find((r: any) => r.key === k)
    const price = row ? parseFloat(String(row.value).replace(",", ".")) : 0
    if (price > 0) return { price, updatedAt: row.updated_at ?? null, approx: true }
  }
  return null
}

async function load(code: number): Promise<Fuel | null> {
  if (!supabase) return null
  const hit = cache.get(code)
  if (hit?.updatedAt && !hit.approx && Date.now() - new Date(hit.updatedAt).getTime() < REFRESH_MS) return hit
  if (pending.has(code)) return pending.get(code)!
  const task = (async () => {
    let current = await readPrice(code)
    if (!current || !current.updatedAt || Date.now() - new Date(current.updatedAt).getTime() > REFRESH_MS) {
      // Edge Function her il için en fazla 6 saatte bir Opet kaynağına çıkar.
      const res = await supabase.functions.invoke("fuel-price-sync", { body: { provinceCode: code } }).catch(() => null)
      const reason = !res ? "sunucuya ulaşılamadı" : res.error ? `sunucu hatası (${res.error.context?.status ?? res.error.message ?? "?"})` : res.data?.ok === false ? `kaynak: ${res.data.error}${res.data.status ? ` ${res.data.status}` : ""}` : ""
      if (reason) fuelDiag.set(code, reason); else fuelDiag.delete(code)
      current = await readPrice(code)
    }
    if (!current) current = await readFallback().catch(() => null)
    cache.set(code, current)
    return current
  })().catch(() => cache.get(code) ?? null).finally(() => pending.delete(code))
  pending.set(code, task)
  return task
}

export function agoLabel(iso: string | null): string {
  if (!iso) return ""
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${Math.max(1, m)} dk önce`
  if (m < 1440) return `${Math.round(m / 60)} sa önce`
  return `${Math.round(m / 1440)} gün önce`
}

export function useFuelPrice(originCity?: string): { price: number | null; live: boolean; loading: boolean; updatedAt: string | null; lastPrice: number | null; lastUpdatedAt: string | null } {
  const code = originCity ? PROVINCE_CODES[originCity] : undefined
  const [fuel, setFuel] = useState<Fuel | null>(code ? cache.get(code) ?? null : null)
  const [loading, setLoading] = useState(Boolean(code))
  useEffect(() => {
    let alive = true
    if (!code || !supabase) { setFuel(null); setLoading(false); return }
    setLoading(true)
    load(code).then((value) => {
      if (!alive) return
      setFuel(value)
      setLoading(false)
    }).catch(() => {
      if (alive) { setFuel(null); setLoading(false) }
    })
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        setLoading(true)
        load(code).then((value) => {
          if (alive) { setFuel(value); setLoading(false) }
        }).catch(() => { if (alive) setLoading(false) })
      }
    }
    window.addEventListener("focus", onFocus)
    return () => {
      alive = false
      window.removeEventListener("focus", onFocus)
    }
  }, [code])
  const live = !fuel?.approx && Boolean(fuel?.updatedAt) && Date.now() - new Date(fuel!.updatedAt as string).getTime() <= FRESH_MS
  // price/updatedAt yalnızca taze (6 sa) veride dolu; lastPrice son bilinen değeri (eski olsa da) verir, ekran "güncel değil" etiketiyle gösterebilir
  return { price: live ? fuel!.price : null, live, loading, updatedAt: live ? fuel!.updatedAt : null, lastPrice: fuel?.price ?? null, lastUpdatedAt: fuel?.updatedAt ?? null }
}

// ---- İlan kartları için: TEK fiyat, uygulama başına bir kez, sessiz (hata olursa null; kart yalnızca litreyi gösterir) ----
let dieselCache: number | null | undefined
let dieselTask: Promise<number | null> | null = null
async function loadDiesel(): Promise<number | null> {
  try {
    if (!supabase) return null
    const keys = ["fuel_diesel_34", "fuel_diesel_6", "fuel_diesel_35", "fuel_diesel_42"]
    const read = async () => {
      const { data } = await supabase!.from("app_settings").select("key,value,updated_at").in("key", keys)
      const rows = (data ?? []) as { key: string; value: string; updated_at: string | null }[]
      for (const k of keys) {
        const r = rows.find((x) => x.key === k)
        const v = r ? parseFloat(String(r.value).replace(",", ".")) : 0
        if (v > 0) return { price: v, at: r?.updated_at ? new Date(r.updated_at).getTime() : 0 }
      }
      return null
    }
    let hit = await read()
    // Başarısız olsa bile en çok saatte bir deneme: ücretsiz Edge Function kotasını korur
    let lastTry = 0
    try { lastTry = Number(localStorage.getItem("fuel_try") || 0) } catch {}
    if ((!hit || Date.now() - hit.at > REFRESH_MS) && Date.now() - lastTry > 60 * 60 * 1000) {
      try { localStorage.setItem("fuel_try", String(Date.now())) } catch {}
      await supabase.functions.invoke("fuel-price-sync", { body: { provinceCode: 34 } }).catch(() => null) // sessiz yenileme
      hit = (await read()) ?? hit
    }
    return hit?.price ?? null
  } catch { return null }
}
export function useDieselPrice(): number | null {
  const [price, setPrice] = useState<number | null>(dieselCache ?? null)
  useEffect(() => {
    if (dieselCache !== undefined) { setPrice(dieselCache); return }
    let alive = true
    dieselTask ??= loadDiesel().then((v) => { dieselCache = v; return v })
    dieselTask.then((v) => { if (alive) setPrice(v) })
    return () => { alive = false }
  }, [])
  return price
}
