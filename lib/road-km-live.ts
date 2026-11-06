// İLÇE DAHİL KESİN KM — dış servis ve sunucu YOK.
// public/data/district-km.{json,bin} dosyaları (scripts/build-district-km.mjs ile bir kez üretilir) uygulamayla birlikte yayınlanır.
// İlk ilçeli güzergâhta bir kez indirilir (tarayıcı önbelleğe alır), sonrası tamamen cihazda anlık arama. Dosya yoksa/bozuksa
// sessizce lib/distance.ts'deki yerel tahmine (≈) düşer; uygulama hiçbir zaman bozulmaz.
import { useEffect, useState } from "react"
import { routeKm, type KmResult } from "@/lib/distance"

type Q = string | null | undefined
type Matrix = { n: number; index: Map<string, number>; km: Uint16Array }

const MISSING = 0xffff
let matrix: Matrix | null = null
let loading: Promise<Matrix | null> | null = null
let retryAt = 0

const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
const keyOf = (city: Q, district: Q) => `${fold(city || "")}|${fold((district || "").trim())}`

async function loadMatrix(): Promise<Matrix | null> {
  if (matrix) return matrix
  if (typeof window === "undefined" || Date.now() < retryAt) return null
  if (!loading) {
    loading = (async () => {
      try {
        const [mj, mb] = await Promise.all([fetch("/data/district-km.json"), fetch("/data/district-km.bin")])
        if (!mj.ok || !mb.ok) throw new Error("data missing")
        const meta = (await mj.json()) as { n: number; places: string[] }
        const buf = await mb.arrayBuffer()
        const n = meta.n
        if (!Array.isArray(meta.places) || meta.places.length !== n || buf.byteLength !== ((n * (n - 1)) / 2) * 2) throw new Error("data corrupt")
        const index = new Map<string, number>()
        meta.places.forEach((p, i) => { const s = p.indexOf("/"); index.set(s < 0 ? keyOf(p, "") : keyOf(p.slice(0, s), p.slice(s + 1)), i) })
        matrix = { n, index, km: new Uint16Array(buf) }
        return matrix
      } catch {
        retryAt = Date.now() + 5 * 60_000 // veri yoksa 5 dk boyunca tekrar deneme
        return null
      } finally {
        loading = null
      }
    })()
  }
  return loading
}

function lookup(m: Matrix, aCity: Q, aDist: Q, bCity: Q, bDist: Q): number | null {
  const ia = m.index.get(keyOf(aCity, aDist)), ib = m.index.get(keyOf(bCity, bDist))
  if (ia === undefined || ib === undefined || ia === ib) return null
  const i = Math.min(ia, ib), j = Math.max(ia, ib)
  const v = m.km[i * m.n - (i * (i + 1)) / 2 + (j - i - 1)]
  return v === MISSING || v === 0 ? null : v
}

/** Veri yüklüyse anında döner (ağ yok) */
export function cachedRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): number | null {
  return matrix ? lookup(matrix, aCity, aDist, bCity, bDist) : null
}

/** Kesin yol km'si; veri/yer yoksa null (çağıran yerel tahmini kullanır) */
export async function getRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): Promise<number | null> {
  const m = await loadMatrix()
  return m ? lookup(m, aCity, aDist, bCity, bDist) : null
}

/**
 * Kart/ekran için km: ilçe yoksa il–il tablo (zaten kesin); ilçe varsa önce anında tahmin (≈),
 * veri yüklenince kesin değerle otomatik değişir.
 */
export function useRoadKm(aCity: Q, aDist: Q, bCity: Q, bDist: Q): KmResult | null {
  const local = routeKm(aCity, aDist, bCity, bDist)
  const [, bump] = useState(0)
  const needs = Boolean(aCity && bCity && ((aDist && aDist.trim()) || (bDist && bDist.trim())))
  useEffect(() => {
    if (!needs || matrix) return
    let alive = true
    void loadMatrix().then((m) => { if (alive && m) bump((n) => n + 1) })
    return () => { alive = false }
  }, [needs])
  const precise = needs ? cachedRoadKm(aCity, aDist, bCity, bDist) : null
  return precise ? { km: precise, exact: true } : local
}
