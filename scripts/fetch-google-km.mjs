// ÜCRETSİZ, anahtarsız, kartsız: 81 il arası karayolu km'sini OSRM (OpenStreetMap yol ağı) ile tek istekte alıp lib/road-km.json'a yazar.
// Kullanım:  node scripts/fetch-road-km.mjs      (Node 18+)
// Not: Google Haritalar ile genelde birkaç km farkla çıkar; birebir Google değeri için scripts/fetch-google-km.mjs kullan.
import { readFileSync, writeFileSync } from "node:fs"

const src = readFileSync(new URL("../lib/distance.ts", import.meta.url), "utf8")
const block = src.slice(src.indexOf("const C:"), src.indexOf("const ROAD_FACTOR"))
const cities = [...block.matchAll(/([A-Za-zÇĞİÖŞÜçğıöşü]+): \[([\d.]+), ([\d.]+)\]/g)].map((m) => ({ name: m[1], lat: m[2], lon: m[3] }))
if (cities.length !== 81) { console.error(`81 il bekleniyordu, ${cities.length} bulundu`); process.exit(1) }

const coords = cities.map((c) => `${c.lon},${c.lat}`).join(";")
const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`
const res = await fetch(url, { headers: { "User-Agent": "nakliye-cepte-km-script" } })
const j = await res.json()
if (j.code !== "Ok" || !j.distances) { console.error("OSRM hatası:", j.code, j.message); process.exit(1) }

const key = (a, b) => (a.localeCompare(b, "tr") < 0 ? `${a}|${b}` : `${b}|${a}`)
const out = {}
cities.forEach((a, i) => cities.forEach((b, k) => {
  if (k <= i) return
  const m = j.distances[i][k] ?? j.distances[k][i]
  if (m > 0) out[key(a.name, b.name)] = Math.round(m / 1000)
}))
writeFileSync(new URL("../lib/road-km.json", import.meta.url), JSON.stringify(out))
console.log(`${Object.keys(out).length} şehir çifti yazıldı (beklenen 3240)`)
