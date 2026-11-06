// TEK KM MOTORU: ilan kartı, ilan sıralama ve Sefer Hesapla aynı fonksiyonu kullanır (ağ isteği yok, anında, internetsiz çalışır).
// 1) İl–il: road-km.json (OSRM yol ağı, tutarsız detourlar temizlenmiş) -> kesin değer
// 2) İlçe verilmişse: il tablosu + ilçenin il merkezine göre konumu -> yaklaşık (≈) değer
import { CITY_NAMES } from "@/lib/route"
import ROAD from "@/lib/road-km.json"
import DCOORDS from "@/lib/district-coords.json"

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

export const CITY_CENTERS = C
export const CITY_LIST: string[] = [...CITY_NAMES].sort((a, b) => a.localeCompare(b, "tr"))

/** Ortalama yakıt tüketimi (lt / 100 km) – tır için varsayılan */
export const AVG_CONSUMPTION = 32

const roadTable = ROAD as Record<string, number>
const pairKey = (a: string, b: string) => (a.localeCompare(b, "tr") < 0 ? `${a}|${b}` : `${b}|${a}`)

/** Yalnızca yol tablosundaki il–il mesafesi. */
export function estimateKm(a?: string | null, b?: string | null): number | null {
  if (!a || !b || a === b) return null
  const known = roadTable[pairKey(a, b)]
  return Number.isFinite(known) && known > 0 ? known : null
}

type LL = [number, number]
const R = 6371, RAD = Math.PI / 180
const vec = (p: LL, q: LL): LL => [(q[1] - p[1]) * RAD * Math.cos(p[0] * RAD) * R, (q[0] - p[0]) * RAD * R]
const dist = (p: LL, q: LL) => { const v = vec(p, q); return Math.hypot(v[0], v[1]) }

/** Tablo yoksa son çare: kuş uçuşu × 1,28 */
export function approxKm(a?: string | null, b?: string | null): number | null {
  const p = a ? C[a] : undefined, q = b ? C[b] : undefined
  if (!p || !q || a === b) return null
  return Math.max(5, Math.round((dist(p, q) * 1.28) / 5) * 5)
}

const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
const DISTRICT_IX = new Map<string, LL>()
for (const [k, v] of Object.entries(DCOORDS as Record<string, LL>)) { const [c, n] = k.split("|"); DISTRICT_IX.set(`${c}|${fold(n)}`, v) }
const findDistrict = (city: string, name?: string): LL | null => (name ? DISTRICT_IX.get(`${city}|${fold(name)}`) ?? null : null)

/** İl seçildiğinde ilçe önerileri */
export function districtNames(city: string): string[] {
  return Object.keys(DCOORDS).filter((k) => k.startsWith(city + "|")).map((k) => k.slice(city.length + 1)).sort((a, b) => a.localeCompare(b, "tr"))
}

const WIND = 1.3 // kuş uçuşu → yol katsayısı (kısa mesafe)
export type KmResult = { km: number; /** true: il–il tablo değeri; false: ilçeli/yaklaşık (≈ ile gösterilir) */ exact: boolean }

/**
 * Her yerde kullanılan TEK mesafe fonksiyonu. İlçe yoksa tablo değeri (kesin), ilçe varsa yaklaşık.
 * İlçe, il merkezine göre karşı yöne doğruysa km azalır, ters yöndeyse artar.
 */
export function routeKm(aCity?: string | null, aDist?: string | null, bCity?: string | null, bDist?: string | null): KmResult | null {
  if (!aCity || !bCity) return null
  const ca = C[aCity], cb = C[bCity]
  if (!ca || !cb) return null
  const pa = findDistrict(aCity, aDist ?? undefined), pb = findDistrict(bCity, bDist ?? undefined)
  const hasDistrict = Boolean(aDist || bDist)
  const round5 = (n: number) => Math.round(n / 5) * 5

  if (aCity === bCity) {
    if (!pa && !pb) return null
    return { km: Math.max(3, Math.round(dist(pa ?? ca, pb ?? cb) * WIND)), exact: false }
  }
  const table = estimateKm(aCity, bCity)
  const base = table ?? approxKm(aCity, bCity)
  if (!base) return null
  if (!pa && !pb) return { km: base, exact: Boolean(table) && !hasDistrict }

  // Karşıya doğru olan ilçede km düşer, ters yöndeyse artar. Uzun mesafede yollar düz gitmediği için
  // "karşıya doğru" indirimi yumuşatılır (ör. Manisa→Milas: Milas, Muğla yolu üzerinde değil, ayrı bir koldur).
  const kToward = base <= 120 ? WIND : base >= 250 ? 0.5 : WIND - ((base - 120) * (WIND - 0.5)) / 130
  const adj = (c: LL, p: LL | null, other: LL) => {
    if (!p) return 0
    const v = vec(c, p), u = vec(c, other), un = Math.hypot(u[0], u[1]) || 1
    const along = (v[0] * u[0] + v[1] * u[1]) / un
    const lateral = Math.abs((v[0] * u[1] - v[1] * u[0]) / un)
    return (along > 0 ? -along * kToward : -along * WIND) + lateral * 0.25
  }
  const est = base + adj(ca, pa, cb) + adj(cb, pb, ca)
  const floor = dist(pa ?? ca, pb ?? cb) * 1.15 // yol, düz çizgiden kısa olamaz
  return { km: Math.max(3, round5(Math.max(est, floor))), exact: false }
}
