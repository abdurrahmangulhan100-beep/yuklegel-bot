import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import ROAD from "../lib/road-km.json"
import { CITY_CENTERS, estimateKm, routeKm } from "../lib/distance"

const cities = Object.keys(CITY_CENTERS)
const RAD = Math.PI / 180
const air = (a: string, b: string) => {
  const p = CITY_CENTERS[a], q = CITY_CENTERS[b]
  return Math.hypot((q[1] - p[1]) * RAD * Math.cos(p[0] * RAD) * 6371, (q[0] - p[0]) * RAD * 6371)
}

test("81 il için her çiftin yol mesafesi tabloda var", () => {
  assert.equal(cities.length, 81)
  for (let i = 0; i < cities.length; i++)
    for (let j = i + 1; j < cities.length; j++)
      assert.ok(estimateKm(cities[i], cities[j]), `${cities[i]}-${cities[j]} eksik`)
  assert.equal(Object.keys(ROAD).length, (81 * 80) / 2)
})

test("yol mesafesi kuş uçuşundan kısa olamaz ve simetriktir", () => {
  for (let i = 0; i < cities.length; i++)
    for (let j = i + 1; j < cities.length; j++) {
      const a = cities[i], b = cities[j]
      assert.ok(estimateKm(a, b)! >= air(a, b), `${a}-${b} yol kuştan kısa`)
      assert.equal(estimateKm(a, b), estimateKm(b, a))
    }
})

test("bilinen güzergâhlar makul aralıkta (gerçek karayolu ±%8)", () => {
  const known: [string, string, number][] = [["İstanbul", "Ankara", 450], ["Konya", "Ankara", 260], ["Adana", "Mersin", 70], ["İzmir", "İstanbul", 480]]
  for (const [a, b, km] of known) {
    const got = estimateKm(a, b)!
    assert.ok(Math.abs(got - km) / km <= 0.08, `${a}-${b}: ${got} km, beklenen ~${km}`)
  }
})

test("ilçe matrisi dosyası bütün ve il–il tablosuyla uyumlu", () => {
  const meta = JSON.parse(fs.readFileSync("public/data/district-km.json", "utf8")) as { n: number; places: string[] }
  const buf = fs.readFileSync("public/data/district-km.bin")
  assert.equal(meta.places.length, meta.n)
  assert.equal(buf.byteLength, (meta.n * (meta.n - 1)) / 2 * 2)
  const km = new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)
  const idx = new Map(meta.places.map((p, i) => [p, i]))
  const look = (a: string, b: string) => {
    const x = idx.get(a)!, y = idx.get(b)!, i = Math.min(x, y), j = Math.max(x, y)
    return km[i * meta.n - (i * (i + 1)) / 2 + (j - i - 1)]
  }
  // il merkezi–il merkezi hücresi, il tablosuyla birebir aynı olmalı (iki ayrı kaynak çelişmesin)
  for (const [a, b] of [["Konya", "Ankara"], ["Kayseri", "Bitlis"], ["Adana", "Mersin"]]) assert.equal(look(a, b), estimateKm(a, b), `${a}-${b}`)
})

test("routeKm: il–il kesin, ilçeli güzergâh yaklaşık işaretlenir", () => {
  assert.deepEqual(routeKm("Konya", undefined, "Ankara", undefined), { km: estimateKm("Konya", "Ankara")!, exact: true })
  const d = routeKm("Kayseri", undefined, "Bitlis", "Ahlat")
  assert.ok(d && d.exact === false && d.km > 700 && d.km < 900)
  assert.equal(routeKm("Konya", undefined, "Konya", undefined), null)
})
