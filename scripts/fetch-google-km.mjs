// Tek seferlik: 81 il arası GERÇEK karayolu km'sini Google Haritalar'dan çekip lib/road-km.json'a yazar.
// Kullanım:  GOOGLE_MAPS_KEY=xxxx node scripts/fetch-google-km.mjs
// Gerekli: Google Cloud'da "Distance Matrix API" açık + faturalandırma (aylık 200$ ücretsiz kredi bu işe fazlasıyla yeter, ~3240 çift).
import { readFileSync, writeFileSync } from "node:fs"

const KEY = process.env.GOOGLE_MAPS_KEY
if (!KEY) { console.error("GOOGLE_MAPS_KEY ortam değişkeni yok"); process.exit(1) }

const src = readFileSync(new URL("../lib/distance.ts", import.meta.url), "utf8")
const block = src.slice(src.indexOf("const C:"), src.indexOf("const ROAD_FACTOR"))
const cities = [...block.matchAll(/([A-Za-zÇĞİÖŞÜçğıöşü]+): \[/g)].map((m) => m[1])
const out = JSON.parse(readFileSync(new URL("../lib/road-km.json", import.meta.url), "utf8"))
const key = (a, b) => (a.localeCompare(b, "tr") < 0 ? `${a}|${b}` : `${b}|${a}`)
const q = (c) => encodeURIComponent(`${c}, Türkiye`)

for (const from of cities) {
  const todo = cities.filter((c) => c !== from && !out[key(from, c)])
  for (let i = 0; i < todo.length; i += 25) {           // istek başına en fazla 25 varış
    const chunk = todo.slice(i, i + 25)
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${q(from)}&destinations=${chunk.map(q).join("|")}&mode=driving&key=${KEY}`
    const j = await (await fetch(url)).json()
    if (j.status !== "OK") { console.error(j.status, j.error_message); process.exit(1) }
    j.rows[0].elements.forEach((e, k) => { if (e.status === "OK") out[key(from, chunk[k])] = Math.round(e.distance.value / 1000) })
  }
  writeFileSync(new URL("../lib/road-km.json", import.meta.url), JSON.stringify(out))   // her şehirden sonra kaydet: yarıda kalırsa devam eder
  console.log(from, "tamam", Object.keys(out).length)
}
