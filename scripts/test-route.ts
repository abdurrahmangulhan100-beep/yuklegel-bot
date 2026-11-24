import test from "node:test"
import assert from "node:assert/strict"
import { normalizeSearchInput, searchVariants } from "../lib/search"

const hasBoth = (value: string, expected: string[]) => {
  const variants = searchVariants(value)
  for (const item of expected) assert.ok(variants.includes(item), `${value}: ${item} varyantı bulunamadı`)
}

test("ASCII ve Türkçe yazım birbirini bulur", () => {
  hasBoth("soguk", ["soguk", "soğuk"])
  hasBoth("soğuk", ["soğuk", "soguk"])
  hasBoth("kirikkale", ["kirikkale", "kırıkkale"])
  hasBoth("kırıkkale", ["kırıkkale", "kirikkale"])
  hasBoth("cagri", ["cagri", "çağrı"])
  hasBoth("çağrı", ["çağrı", "cagri"])
})

test("İstanbul ve büyük/küçük harf dönüşümü korunur", () => {
  hasBoth("İSTANBUL", ["istanbul"])
  hasBoth("istanbul", ["istanbul"])
})

test("varyant sayısı sınırlandırılır", () => {
  assert.ok(searchVariants("soguk yuk", 8).length <= 8)
  assert.deepEqual(searchVariants("ankara", 0), [])
})

test("arama metni PostgREST ayraçlarını temizler", () => {
  assert.equal(normalizeSearchInput("Konya, (Ankara) % yük"), "Konya AnKara yük".replace("AnKara", "Ankara"))
})
