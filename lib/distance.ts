// Şehir koordinatları, yalnızca yol ağı tablosunu üretme betiğinde kullanılır.
// Uygulama ekranında kuş uçuşu katsayısıyla sahte karayolu mesafesi üretilmez.
import { CITY_NAMES } from "@/lib/route"
import ROAD from "@/lib/road-km.json" // OSRM/Google yol ağı verisi; boşsa mesafe gösterilmez

const C: Record<string, [number, number]> = {
  Adana: [37.0, 35.32], Adıyaman: [37.76, 38.28], Afyonkarahisar: [38.76, 30.54], Ağrı: [39.72, 43.05], Aksaray: [38.37, 34.03],
  Amasya: [40.65, 35.83], Ankara: [39.93, 32.86], Antalya: [36.9, 30.69], Ardahan: [41.11, 42.7], Artvin: [41.18, 41.82],
  Aydın: [37.85, 27.84], Balıkesir: [39.65, 27.89], Bartın: [41.64, 32.34], Batman: [37.88, 41.13], Bayburt: [40.26, 40.23],
  Bilecik: [40.14, 29.98], Bingöl: [38.88, 40.5], Bitlis: [38.4, 42.11], Bolu: [40.73, 31.61], Burdur: [37.72, 30.29],
  Bursa: [40.19, 29.06], Çanakkale: [40.15, 26.41], Çankırı: [40.6, 33.62], Çorum: [40.55, 34.95], Denizli: [37.78, 29.09],
  Diyarbakır: [37.91, 40.24], Düzce: [40.84, 31.16], Edirne: [41.68, 26.56], Elazığ: [38.67, 39.22], Erzincan: [39.75, 39.49],
  Erzurum: [39.9, 41.27], Eskişehir: [39.78, 30.52], Gaziantep: [37.07, 37.38], Giresun: [40.91, 38.39], Gümüşhane: [40.46, 39.48],
  Hakkari: [37.57, 43.74], Hatay: [36.4, 36.35], Iğdır: [39.92, 44.05], Isparta: [37.76, 30.55], İstanbul: [41.01, 28.98],
  İzmir: [38.42, 27.14], Kahramanmaraş: [37.58, 36.94], Karabük: [41.2, 32.62], Karaman: [37.18, 33.22], Kars: [40.6, 43.1],
  Kastamonu: [41.38, 33.78], Kayseri: [38.73, 35.49], Kilis: [36.72, 37.12], Kırıkkale: [39.85, 33.51], Kırklareli: [41.74, 27.23],
  Kırşehir: [39.15, 34.16], Kocaeli: [40.77, 29.94], Konya: [37.87, 32.48], Kütahya: [39.42, 29.98], Malatya: [38.35, 38.31],
  Manisa: [38.61, 27.43], Mardin: [37.31, 40.74], Mersin: [36.8, 34.64], Muğla: [37.22, 28.36], Muş: [38.74, 41.49],
  Nevşehir: [38.62, 34.71], Niğde: [37.97, 34.68], Ordu: [40.98, 37.88], Osmaniye: [37.07, 36.25], Rize: [41.02, 40.52],
  Sakarya: [40.76, 30.4], Samsun: [41.29, 36.33], Şanlıurfa: [37.16, 38.79], Siirt: [37.93, 41.94], Sinop: [42.03, 35.15],
  Sivas: [39.75, 37.02], Şırnak: [37.52, 42.46], Tekirdağ: [40.98, 27.51], Tokat: [40.31, 36.55], Trabzon: [41.0, 39.72],
  Tunceli: [39.11, 39.55], Uşak: [38.68, 29.41], Van: [38.5, 43.38], Yalova: [40.65, 29.27], Yozgat: [39.82, 34.81],
  Zonguldak: [41.45, 31.79],
}


export const CITY_LIST: string[] = [...CITY_NAMES].sort((a, b) => a.localeCompare(b, "tr"))

/** Ortalama yakıt tüketimi (lt / 100 km) – tır için varsayılan */
export const AVG_CONSUMPTION = 32

const roadTable = ROAD as Record<string, number>
const pairKey = (a: string, b: string) => (a.localeCompare(b, "tr") < 0 ? `${a}|${b}` : `${b}|${a}`)

/** Yalnızca doğrulanmış karayolu tablosundaki mesafe. Tahmini/kuş uçuşu değer üretmez. */
export function estimateKm(a?: string | null, b?: string | null): number | null {
  if (!a || !b || a === b) return null
  const known = roadTable[pairKey(a, b)]
  return Number.isFinite(known) && known > 0 ? known : null
}

/** Tek yön km, yakıt litresi ve maliyeti (fuelPrice yoksa maliyet null) */
export function tripEstimate(a?: string | null, b?: string | null, fuelPrice?: number | null, consumption = AVG_CONSUMPTION) {
  const km = estimateKm(a, b)
  if (!km) return null
  const liters = Math.round((km / 100) * consumption)
  const cost = fuelPrice && fuelPrice > 0 ? Math.round(liters * fuelPrice / 10) * 10 : null
  return { km, liters, cost, hours: driveHours(km), exact: true }
}

/** Tır için ortalama sürüş süresi (saat): ort. 62 km/s + her 4,5 saatte 45 dk zorunlu mola (tahmini) */
export const driveHours = (km: number) => {
  const drive = km / 62
  return Math.round((drive + Math.floor(drive / 4.5) * 0.75) * 10) / 10
}

/** 7,5 → "7 sa 30 dk", 26 → "1 gün 2 sa" */
export function fmtHours(h: number): string {
  const total = Math.round(h * 60)
  if (total < 60) return `${total} dk`
  if (total >= 24 * 60) { const d = Math.floor(total / 1440); const r = Math.round((total % 1440) / 60); return r ? `${d} gün ${r} sa` : `${d} gün` }
  const hh = Math.floor(total / 60), mm = total % 60
  return mm ? `${hh} sa ${mm} dk` : `${hh} sa`
}

export type PlaceKm = { km: number; hours: number }

// ---- Gerçek yol mesafesi (OpenStreetMap yol ağı: Nominatim + OSRM) ----
// Sıra: 1) cihazdaki kayıt  2) Supabase route-km (sunucu önbelleği)  3) doğrudan OSM (Edge Function kurulu değilse de çalışır)
const LS_KEY = "route_km_v2"
const readLocal = (key: string): number | null => {
  try {
    const v = Number(JSON.parse(localStorage.getItem(LS_KEY) || "{}")[key])
    return Number.isFinite(v) && v > 0 ? v : null
  } catch { return null }
}
const writeLocal = (key: string, km: number) => {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || "{}")
    all[key] = km
    const keys = Object.keys(all)
    if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete all[k] // sınırsız büyümesin
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch { /* depolama kapalıysa sorun değil */ }
}
const timeout = (ms: number) => (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(ms) : undefined)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let diag: string[] = []
/** Son mesafe denemesinde hangi adımın neden başarısız olduğu (ekranda küçük tanı satırı için) */
export const getRouteDiag = () => diag.join(" · ")

async function viaEdge(a: string, b: string): Promise<number | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) { diag.push("sunucu: adres yok"); return null }
  try {
    const r = await fetch(`${base}/functions/v1/route-km?from=${encodeURIComponent(a)}&to=${encodeURIComponent(b)}`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      signal: timeout(25000),
    })
    if (!r.ok) { diag.push(`sunucu: HTTP ${r.status}`); return null }
    const j = await r.json()
    if (!(j && j.km > 0)) { diag.push("sunucu: boş yanıt"); return null }
    return Math.round(j.km)
  } catch { diag.push("sunucu: ulaşılamadı"); return null }
}

const geoCache = new Map<string, [number, number]>()
async function geocode(place: string): Promise<[number, number] | null> {
  const hit = geoCache.get(place)
  if (hit) return hit
  const [city, district] = place.split("/")
  const q = district ? `${district}, ${city}, Türkiye` : `${city}, Türkiye`
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q)}`, { signal: timeout(12000) })
    if (!r.ok) { diag.push(`konum(${place}): HTTP ${r.status}`); return null }
    const j = await r.json()
    const lat = parseFloat(j?.[0]?.lat), lon = parseFloat(j?.[0]?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { diag.push(`konum bulunamadı: ${place}`); return null }
    geoCache.set(place, [lat, lon])
    return [lat, lon]
  } catch { diag.push(`konum(${place}): ağ/engel`); return null }
}

async function viaOsm(a: string, b: string): Promise<number | null> {
  const from = await geocode(a)
  await sleep(1100) // Nominatim: saniyede en fazla 1 istek
  const to = await geocode(b)
  if (!from || !to) return null
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=false`, { signal: timeout(15000) })
    const j = await r.json()
    const m = j?.routes?.[0]?.distance
    if (!(j?.code === "Ok" && m > 0)) { diag.push(`yol: ${j?.code ?? "yanıt yok"}`); return null }
    return Math.round(m / 1000)
  } catch { diag.push("yol: ağ/engel"); return null }
}

const placeCache = new Map<string, Promise<PlaceKm | null>>()
let active = 0
const queue: (() => void)[] = []
const run = <T,>(fn: () => Promise<T>): Promise<T> => new Promise((res, rej) => {
  const go = () => { active++; fn().then(res, rej).finally(() => { active--; queue.shift()?.() }) }
  active < 2 ? go() : queue.push(go) // aynı anda en fazla 2 istek: ücretsiz kaynakları yormamak için
})

/**
 * İlçe dahil gerçek yol km'si. Başarısız sonuç önbelleğe alınmaz: ağ düzelince tekrar denendiğinde hesaplanır.
 * Doğrulanmamış (kuş uçuşu/tahmini) mesafe ASLA üretilmez; alınamazsa null döner.
 */
export function placeKm(fromCity: string, fromDistrict: string | undefined, toCity: string, toDistrict: string | undefined): Promise<PlaceKm | null> {
  const a = fromDistrict ? `${fromCity}/${fromDistrict}` : fromCity
  const b = toDistrict ? `${toCity}/${toDistrict}` : toCity
  const key = `${a}>${b}`
  const cached = placeCache.get(key)
  if (cached) return cached
  const saved = typeof window !== "undefined" ? readLocal(key) : null
  const p: Promise<PlaceKm | null> = saved
    ? Promise.resolve({ km: saved, hours: driveHours(saved) })
    : run(async () => { diag = []; return (await viaEdge(a, b)) ?? (await viaOsm(a, b)) })
        .then((km) => {
          if (!km) { placeCache.delete(key); return null }
          if (typeof window !== "undefined") writeLocal(key, km)
          return { km, hours: driveHours(km) }
        })
        .catch(() => { placeCache.delete(key); return null })
  placeCache.set(key, p)
  return p
}
