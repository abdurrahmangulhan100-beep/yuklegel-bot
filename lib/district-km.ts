// İlçe dahil yaklaşık yol km'si: il merkezleri arası yol tablosu (road-km.json) + ilçenin il merkezine göre konumu.
// İlçe, diğer ile doğru uzaksa km artar, doğru yakınsa azalır. Ağ isteği yok; internetsiz çalışır.
import { estimateKm, approxKm } from "@/lib/distance"

export type DistrictCoords = Record<string, [number, number]>
const R = 6371, RAD = Math.PI / 180
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")

const index = new WeakMap<DistrictCoords, Map<string, [number, number]>>()
function find(coords: DistrictCoords, city: string, name: string): [number, number] | null {
  let m = index.get(coords)
  if (!m) { m = new Map(); for (const [k, v] of Object.entries(coords)) { const [c, n] = k.split("|"); m.set(`${c}|${fold(n)}`, v) } index.set(coords, m) }
  return m.get(`${city}|${fold(name)}`) ?? null
}
/** İlin ilçe adları (seçim listesi için) */
export function districtNames(coords: DistrictCoords, city: string): string[] {
  return Object.keys(coords).filter((k) => k.startsWith(city + "|")).map((k) => k.slice(city.length + 1)).sort((a, b) => a.localeCompare(b, "tr"))
}
const vec = (p: [number, number], q: [number, number]): [number, number] => [(q[1] - p[1]) * RAD * Math.cos(p[0] * RAD) * R, (q[0] - p[0]) * RAD * R]
const dist = (p: [number, number], q: [number, number]) => { const v = vec(p, q); return Math.hypot(v[0], v[1]) }
const WIND = 1.3 // kuş uçuşu → yol katsayısı (kısa mesafede)

export function districtKm(aCity: string, aDist: string | undefined, bCity: string, bDist: string | undefined, coords: DistrictCoords, centers: Record<string, [number, number]>): number | null {
  const pa = aDist ? find(coords, aCity, aDist) : null, pb = bDist ? find(coords, bCity, bDist) : null
  const ca = centers[aCity], cb = centers[bCity]
  if (!ca || !cb) return null
  if (aCity === bCity) {
    const x = pa ?? ca, y = pb ?? cb
    if (!pa && !pb) return null
    return Math.max(3, Math.round(dist(x, y) * WIND))
  }
  const base = estimateKm(aCity, bCity) ?? approxKm(aCity, bCity)
  if (!base) return null
  // ilçenin, karşı ile doğrultusundaki izdüşümü: karşıya doğruysa km azalır, uzağa doğruysa artar
  const adj = (c: [number, number], p: [number, number] | null, other: [number, number]) => {
    if (!p) return 0
    const v = vec(c, p), u = vec(c, other), un = Math.hypot(u[0], u[1]) || 1
    const along = (v[0] * u[0] + v[1] * u[1]) / un
    const lateral = Math.abs((v[0] * u[1] - v[1] * u[0]) / un)
    return -along * WIND + lateral * 0.2
  }
  return Math.max(3, Math.round(base + adj(ca, pa, cb) + adj(cb, pb, ca)))
}
