// BİR KEZ çalıştırılır, sonuç uygulamayla birlikte yayınlanır (sunucu / kota / dış servis bağımlılığı kalmaz).
//
//   node scripts/build-district-km.mjs                 -> tüm il + ilçe
//   ONLY=Konya,Karaman node scripts/build-district-km.mjs   -> önce küçük deneme (yalnızca bu iller)
//
// Ne yapar?
//  1) 81 il merkezi + lib/districts.ts ve lib/district-coords.json'daki tüm ilçeler için koordinat toplar.
//     Koordinatı olmayan ilçeleri OpenStreetMap Nominatim ile BİR KEZ bulur (saniyede 1 istek, sonuç scripts/.cache'e yazılır).
//  2) Tüm yerler arası karayolu km'sini OSRM "table" ile bloklar hâlinde hesaplar (OpenStreetMap yol ağı).
//  3) public/data/district-km.json + district-km.bin dosyalarını yazar. Uygulama bunları okur; internet/sunucu gerekmez.
//
// Kesilirse aynı komutla kaldığı yerden devam eder. Yeni ilçe eklenirse yeniden çalıştırın (koordinatlar önbellekten gelir, km matrisi baştan hesaplanır).
// Ortam değişkenleri: OSRM_URL, NOMINATIM_URL (kendi sunucunuz için), BLOCK (varsayılan 45), KM_DELAY_MS (varsayılan 1100), RETRY_FAILED=1
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CACHE = path.join(ROOT, "scripts", ".cache")
const OUT = path.join(ROOT, "public", "data")
const OSRM = (process.env.OSRM_URL || "https://router.project-osrm.org").replace(/\/$/, "")
const NOMINATIM = (process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "")
const DELAY = Number(process.env.KM_DELAY_MS ?? 1100)
const BLOCK = Math.max(5, Math.min(48, Number(process.env.BLOCK ?? 45))) // OSRM demo: istek başına en fazla 100 koordinat
const MAX_FROM_CENTER_KM = 250 // il merkezinden bu kadar uzaktaki arama sonucu yanlış eşleşme sayılır
const UA = { "User-Agent": "yuklegel-km-builder/1.0 (tek seferlik derleme)" }
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fold = (s) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
const readJSON = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, "utf8")) } catch { return fb } }
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)) }
const R = 6371, RAD = Math.PI / 180
const hav = (a, b) => {
  const dLat = (b[0] - a[0]) * RAD, dLon = (b[1] - a[1]) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const die = (msg) => { console.error("\n✖ " + msg); process.exit(1) }

// ---------- 1) Yer listesi ----------
const distanceSrc = fs.readFileSync(path.join(ROOT, "lib", "distance.ts"), "utf8")
const cBlock = distanceSrc.slice(distanceSrc.indexOf("const C:"), distanceSrc.indexOf("export const CITY_CENTERS"))
const CITY = {}
for (const m of cBlock.matchAll(/([\p{L}]+):\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/gu)) CITY[m[1]] = [parseFloat(m[2]), parseFloat(m[3])]
if (Object.keys(CITY).length !== 81) die(`lib/distance.ts içinde 81 il merkezi bulunamadı (bulunan: ${Object.keys(CITY).length}).`)

const distSrc = fs.readFileSync(path.join(ROOT, "lib", "districts.ts"), "utf8")
const wanted = {} // "il|fold(ilçe)" -> { city, name }
const nonAscii = (s) => (s.match(/[^a-zA-Z0-9 ]/g) || []).length
const addDistrict = (city, name) => {
  name = name.trim()
  if (!name || !CITY[city] || fold(name) === fold(city)) return
  const k = `${city}|${fold(name)}`
  if (!wanted[k] || nonAscii(name) > nonAscii(wanted[k].name)) wanted[k] = { city, name } // "Çerkezkoy" yerine "Çerkezköy"
}
for (const blockName of ["RAW", "EXTRA"]) {
  const a = distSrc.indexOf(`const ${blockName}`)
  if (a < 0) continue
  const b = distSrc.indexOf("\n}", a)
  for (const m of distSrc.slice(a, b).matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)) for (const n of m[2].split(",")) addDistrict(m[1], n)
}
const known = readJSON(path.join(ROOT, "lib", "district-coords.json"), {})
const given = {} // "il|fold(ilçe)" -> [lat, lon]
for (const [k, v] of Object.entries(known)) {
  const [c, n] = k.split("|")
  addDistrict(c, n)
  given[`${c}|${fold(n)}`] = v
}
let entries = Object.entries(wanted)
if (ONLY.length) entries = entries.filter(([, v]) => ONLY.includes(v.city))
console.log(`Yer listesi: ${Object.keys(CITY).length} il, ${entries.length} ilçe/bölge${ONLY.length ? ` (yalnızca: ${ONLY.join(", ")})` : ""}`)

// ---------- 2) Koordinatlar (eksikler Nominatim'den, bir kez) ----------
const geoPath = path.join(CACHE, "geocode.json")
const geo = readJSON(geoPath, {}) // anahtar -> [lat,lon] | null (bulunamadı)
const saveGeo = () => writeJSON(geoPath, geo)
process.on("SIGINT", () => { saveGeo(); console.log("\nKaydedildi, kaldığı yerden devam edebilir."); process.exit(130) })

async function geocode(city, name) {
  const q = `${name}, ${city}, Türkiye`
  const url = `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q)}`
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.status === 429 || r.status >= 500) { await sleep(attempt * 5000); continue }
      if (!r.ok) return undefined
      const arr = await r.json()
      for (const x of Array.isArray(arr) ? arr : []) {
        const p = [parseFloat(x.lat), parseFloat(x.lon)]
        if (Number.isFinite(p[0]) && Number.isFinite(p[1]) && hav(CITY[city], p) <= MAX_FROM_CENTER_KM) return [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]
      }
      return null
    } catch { await sleep(attempt * 3000) }
  }
  return undefined // ağ sorunu: "bulunamadı" diye kaydetme
}

const missing = entries.filter(([k]) => !given[k] && (geo[k] === undefined || (geo[k] === null && process.env.RETRY_FAILED)))
if (missing.length) console.log(`Koordinatı olmayan ${missing.length} ilçe aranacak (≈ ${Math.ceil((missing.length * (DELAY / 1000 + 0.4)) / 60)} dk, kesilirse devam eder)…`)
let netFails = 0
for (let i = 0; i < missing.length; i++) {
  const [k, v] = missing[i]
  const res = await geocode(v.city, v.name)
  if (res === undefined) { if (++netFails >= 5) { saveGeo(); die("Nominatim'e art arda ulaşılamadı. İnterneti kontrol edip komutu tekrar çalıştırın (kaldığı yerden devam eder).") } }
  else { netFails = 0; geo[k] = res }
  if ((i + 1) % 10 === 0 || i === missing.length - 1) { saveGeo(); process.stdout.write(`\r  koordinat ${i + 1}/${missing.length}   `) }
  await sleep(DELAY)
}
if (missing.length) console.log()

const cities = Object.keys(CITY).filter((c) => !ONLY.length || ONLY.includes(c)).sort((a, b) => a.localeCompare(b, "tr"))
const districts = []
const notFound = []
for (const [k, v] of entries) {
  const p = given[k] || geo[k]
  if (p) districts.push({ key: `${v.city}/${v.name}`, city: v.city, name: v.name, ll: p })
  else notFound.push(`${v.city}/${v.name}`)
}
districts.sort((a, b) => a.city.localeCompare(b.city, "tr") || a.name.localeCompare(b.name, "tr"))
const places = [...cities.map((c) => ({ key: c, ll: CITY[c] })), ...districts]
const N = places.length
console.log(`Koordinatı bulunan yer: ${N}${notFound.length ? ` · bulunamayan ${notFound.length} (uygulama bunlar için eski tahmini kullanır)` : ""}`)

// ---------- 3) OSRM ile km matrisi (bloklar hâlinde, kaldığı yerden devam eder) ----------
const hash = crypto.createHash("sha1").update(JSON.stringify(places.map((p) => [p.key, p.ll]))).digest("hex")
const statePath = path.join(CACHE, "state.json"), matPath = path.join(CACHE, "matrix.bin")
let state = readJSON(statePath, null)
let M = new Uint16Array(N * N).fill(0xffff)
if (state && state.hash === hash && fs.existsSync(matPath)) {
  const raw = fs.readFileSync(matPath)
  if (raw.length === N * N * 2) for (let i = 0; i < N * N; i++) M[i] = raw.readUInt16LE(i * 2)
  else state = null
} else state = null
if (!state) state = { hash, done: [] }
const done = new Set(state.done)
const saveState = () => {
  const b = Buffer.alloc(N * N * 2)
  for (let i = 0; i < N * N; i++) b.writeUInt16LE(M[i], i * 2)
  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(matPath, b)
  writeJSON(statePath, { hash, done: [...done] })
}

async function osrmTable(path_) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(`${OSRM}/table/v1/driving/${path_}`, { headers: UA })
      if (r.status === 429 || r.status >= 500) { await sleep(attempt * 5000); continue }
      const j = await r.json().catch(() => null)
      if (j?.code === "Ok" && Array.isArray(j.distances)) return j.distances
      if (j?.code === "TooBig") die(`OSRM bu kadar koordinatı kabul etmiyor. Şöyle deneyin: BLOCK=30 node scripts/build-district-km.mjs`)
      die(`OSRM beklenmeyen yanıt verdi: ${j?.code || r.status} ${j?.message || ""}`)
    } catch (e) { if (attempt === 5) die(`OSRM'e ulaşılamadı (${e.message}). Komutu tekrar çalıştırın, kaldığı yerden devam eder.`); await sleep(attempt * 3000) }
  }
  die("OSRM art arda hata verdi (sunucu yoğun olabilir). Biraz sonra komutu tekrar çalıştırın, kaldığı yerden devam eder.")
}
const toKm = (m) => (m == null || !Number.isFinite(m) ? 0xffff : Math.min(0xfffe, Math.max(1, Math.round(m / 1000))))
const ll = (p) => `${p.ll[1]},${p.ll[0]}`
const nb = Math.ceil(N / BLOCK)
const total = (nb * (nb + 1)) / 2
console.log(`Km matrisi: ${N} yer, ${total} blok (${done.size ? "devam ediliyor" : "başlıyor"})…`)
let n = 0, t0 = Date.now()
for (let bi = 0; bi < nb; bi++) {
  for (let bj = bi; bj < nb; bj++) {
    n++
    const id = `${bi}-${bj}`
    if (done.has(id)) continue
    const A = places.slice(bi * BLOCK, (bi + 1) * BLOCK), B = places.slice(bj * BLOCK, (bj + 1) * BLOCK)
    let d
    if (bi === bj) d = await osrmTable(`${A.map(ll).join(";")}?annotations=distance`)
    else {
      const coords = [...A, ...B].map(ll).join(";")
      const src = A.map((_, i) => i).join(";"), dst = B.map((_, i) => A.length + i).join(";")
      d = await osrmTable(`${coords}?annotations=distance&sources=${src}&destinations=${dst}`)
    }
    for (let r = 0; r < A.length; r++) for (let c = 0; c < B.length; c++) {
      const gi = bi * BLOCK + r, gj = bj * BLOCK + c
      if (gi < gj) M[gi * N + gj] = toKm(d[r][c])
    }
    done.add(id)
    saveState()
    process.stdout.write(`\r  blok ${n}/${total}  (geçen ${Math.round((Date.now() - t0) / 60000)} dk)   `)
    await sleep(DELAY)
  }
}
console.log()

// ---------- 4) Kontrol + yazma ----------
let bad = 0, nulls = 0
const badList = []
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  const v = M[i * N + j]
  if (v === 0xffff) { nulls++; continue }
  const straight = hav(places[i].ll, places[j].ll)
  if (v < straight * 0.9 - 2 || v > straight * 3.5 + 40) { bad++; if (badList.length < 12) badList.push(`${places[i].key} ↔ ${places[j].key}: yol ${v} km, kuş uçuşu ${Math.round(straight)} km`) }
}
if (badList.length) console.log(`⚠ Şüpheli ${bad} çift (ilk ${badList.length}):\n  ` + badList.join("\n  ") + "\n  (koordinat yanlış olabilir; scripts/.cache/geocode.json içinde düzeltip yeniden çalıştırın)")
if (nulls) console.log(`⚠ ${nulls} çift için yol bulunamadı (ada vb.); uygulama bunlarda eski tahmini kullanır.`)

const tri = Buffer.alloc((N * (N - 1)) / 2 * 2)
let k = 0
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { tri.writeUInt16LE(M[i * N + j], k * 2); k++ }
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, "district-km.bin"), tri)
fs.writeFileSync(path.join(OUT, "district-km.json"), JSON.stringify({ v: 1, n: N, built: new Date().toISOString().slice(0, 10), places: places.map((p) => p.key) }))
console.log(`\n✔ Bitti: public/data/district-km.bin (${(tri.length / 1048576).toFixed(2)} MB, sıkıştırılmış ≈ ${(zlib.gzipSync(tri).length / 1048576).toFixed(2)} MB) + district-km.json`)
console.log("  Şimdi uygulamayı yeniden derleyip yayınlayın (pnpm build). Başka bir şey gerekmez.")
