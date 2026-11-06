// ÜCRETSİZ, anahtarsız: 81 ilin tüm ilçelerinin konumunu OpenStreetMap'ten (Overpass) alıp lib/district-coords.json'a yazar.
// Kullanım (proje klasöründe):  node scripts/fetch-district-coords.mjs     (Node 18+, yaklaşık 3-5 dakika sürer)
// Kesilirse tekrar çalıştırın: daha önce alınan iller atlanır.
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const fuel = readFileSync(new URL("../lib/fuel.ts", import.meta.url), "utf8")
const block = fuel.slice(fuel.indexOf("const PROVINCE_CODES"), fuel.indexOf("type Fuel"))
const provinces = [...block.matchAll(/([A-Za-zÇĞİÖŞÜçğıöşü]+): (\d+)/g)].map((m) => ({ name: m[1], code: Number(m[2]) }))
if (provinces.length !== 81) { console.error(`81 il bekleniyordu, ${provinces.length} bulundu`); process.exit(1) }

const outUrl = new URL("../lib/district-coords.json", import.meta.url)
const out = existsSync(outUrl) ? JSON.parse(readFileSync(outUrl, "utf8") || "{}") : {}
const done = new Set(Object.keys(out).map((k) => k.split("|")[0]))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

async function query(code) {
  const iso = `TR-${String(code).padStart(2, "0")}`
  const q = `[out:json][timeout:60];area["ISO3166-2"="${iso}"]["admin_level"="4"]->.a;rel(area.a)["admin_level"="6"]["boundary"="administrative"];out tags center;`
  for (let attempt = 0; attempt < 4; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length]
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "nakliye-cepte-script" }, body: "data=" + encodeURIComponent(q) })
      if (res.ok) return (await res.json()).elements ?? []
      console.log(`  ${iso}: HTTP ${res.status}, tekrar deneniyor…`)
    } catch (e) { console.log(`  ${iso}: ${e.message}, tekrar deneniyor…`) }
    await sleep(4000)
  }
  return null
}

for (const p of provinces) {
  if (done.has(p.name)) { console.log(`${p.name}: atlandı (zaten var)`); continue }
  const els = await query(p.code)
  if (!els) { console.log(`${p.name}: ALINAMADI`); continue }
  let n = 0
  for (const e of els) {
    const name = e.tags?.["name:tr"] || e.tags?.name
    if (!name || !e.center) continue
    out[`${p.name}|${name.replace(/ İlçesi$/i, "")}`] = [Math.round(e.center.lat * 1000) / 1000, Math.round(e.center.lon * 1000) / 1000]
    n++
  }
  console.log(`${p.name}: ${n} ilçe`)
  writeFileSync(outUrl, JSON.stringify(out)) // her ilden sonra kaydet
  await sleep(1500)
}
console.log(`Toplam ${Object.keys(out).length} ilçe yazıldı (Türkiye'de yaklaşık 970 bekleniyor).`)
