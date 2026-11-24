import test from "node:test"
import assert from "node:assert/strict"
import { foldSearch, normalizeSearchInput, searchTokens, searchVariants } from "../lib/search"

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

test("sunucu araması katlaması: Türkçe/ASCII/büyük-küçük harf aynı sonucu verir", () => {
  for (const v of ["soguk", "SOĞUK", "Soğuk", "SOGUK"]) assert.equal(foldSearch(v), "soguk")
  assert.equal(foldSearch("İstanbul"), "istanbul")
  assert.equal(foldSearch("ISPARTA"), "isparta")
  assert.equal(foldSearch("Kırıkkale"), "kirikkale")
  assert.equal(foldSearch("güzergâh"), "guzergah")
})

test("arama kelimeleri tekrarsız ve en fazla 6", () => {
  assert.deepEqual(searchTokens("Konya konya KONYA ankara"), ["konya", "ankara"])
  assert.equal(searchTokens("a b c d e f g h").length, 6)
  assert.deepEqual(searchTokens("  %  ,  "), [])
})
