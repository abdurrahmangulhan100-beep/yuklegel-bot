// İLÇE DAHİL KESİN KM: tarayıcı, güzergâhı Supabase "route-km" fonksiyonundan (OpenStreetMap/OSRM yol ağı) sorar.
// Sunucu her güzergâhı YALNIZCA BİR KEZ hesaplayıp route_cache'e yazar; burada ayrıca cihazda da saklanır.
// Sonuç gelene kadar lib/distance.ts'deki anında (≈) tahmin gösterilir, gelince kesin değerle değişir.
import { useEffect, useState } from "react"
import { routeKm, type KmResult } from "@/lib/distance"

type Q = string | null | undefined
const LS_KEY = "road_km_v1"
const MAX_SAVED = 3000
const MAX_PARALLEL = 3 // aynı anda en fazla 3 sorgu (ilan listesi açılınca sunucu/OSRM yorulmasın)

const mem = new Map<string, number>()
const failed = new Set<string>() // bu oturumda bulunamayanları tekrar sorma
const inflight = new Map<string, Promise<number | null>>()
let loaded = false
let saveTimer: ReturnType<typeof setTimeout> | undefined

function loadSaved() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}") as Record<string, unknown>
    for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && v > 0) mem.set(k, v)
  } catch {}
}
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      while (mem.size > MAX_SAVED) mem.delete(mem.keys().next().value as string) // en eskiyi at
      localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(mem)))
    } catch {}
  }, 600)
}

const place = (city: Q, district: Q) => (city ? (district && district.trim() ? `${city}/${district.trim()}` : city) : "")
/** A→B ve B→A aynı kayıt: sıralı anahtar, hem önbellek hem sunucu isteği yarıya iner */
function pairOf(aCity: Q, aDist: Q, bCity: Q, bDist: Q): [string, string] | null {
  const a = place(aCity, aDist), b = place(bCity, bDist)
  if (!a || !b || a === b) return null
  return a.localeCompare(b, "tr") <= 0 ? [a, b] : [b, a]
}

let active = 0
const waiting: Array<() => void> = []
const acquire = async () => { if (active >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r)); active++ }
const release = () => { active--; waiting.shift()?.() }

async function fetchKm(from: string, to: string): Promise<number | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base) return null
  await acquire()
  try {
    const res = await fetch(`${base}/functions/v1/route-km?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      headers: key ? { apikey: key, Authorization: `Bearer ${key}` } : undefined,
    })
    const j = (await res.json().catch(() => null)) as { ok?: boolean; km?: number } | null
    return j?.ok && Number(j.km) > 0 ? Number(j.km) : null
  } catch {
    return null
  } finally {
    release()
  }
}

/** Önbellekte varsa anında döner (ağ yok) */
export function cachedRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): number | null {
  loadSaved()
  const p = pairOf(aCity, aDist, bCity, bDist)
  return p ? mem.get(p.join(">")) ?? null : null
}

/** Kesin yol km'si: önce cihaz önbelleği, yoksa sunucu. Bulunamazsa null (çağıran yerel tahmini kullanır). */
export function getRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): Promise<number | null> {
  loadSaved()
  const p = pairOf(aCity, aDist, bCity, bDist)
  if (!p) return Promise.resolve(null)
  const key = p.join(">")
  const hit = mem.get(key)
  if (hit) return Promise.resolve(hit)
  if (failed.has(key)) return Promise.resolve(null)
  let job = inflight.get(key)
  if (!job) {
    job = fetchKm(p[0], p[1])
      .then((km) => { if (km) { mem.set(key, km); persist() } else failed.add(key); return km })
      .finally(() => { inflight.delete(key) })
    inflight.set(key, job)
  }
  return job
}

/**
 * Kart/ekran için km: ilçe yoksa il–il tablo (zaten kesin); ilçe varsa önce anında tahmin (≈),
 * kesin değer gelince otomatik güncellenir.
 */
export function useRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): KmResult | null {
  const local = routeKm(aCity, aDist, bCity, bDist)
  const [, bump] = useState(0)
  const needs = Boolean(aCity && bCity && ((aDist && aDist.trim()) || (bDist && bDist.trim())))
  useEffect(() => {
    if (!needs) return
    let alive = true
    void getRoadKm(aCity, aDist, bCity, bDist).then((v) => { if (alive && v) bump((n) => n + 1) })
    return () => { alive = false }
  }, [needs, aCity, aDist, bCity, bDist])
  const precise = needs ? cachedRoadKm(aCity, aDist, bCity, bDist) : null
  return precise ? { km: precise, exact: true } : local
}
