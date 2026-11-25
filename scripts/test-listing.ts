import test from "node:test"
import assert from "node:assert/strict"
import { analyzeListing } from "../lib/route"

const bot = (cargo: string) => analyzeListing({ cargo, trustFields: false })
const labels = (cargo: string) => bot(cargo).routes?.map((r) => r.label)

test("'1 TIR X, 1 TIR Y' kalıbı iki rota üretir", () => {
  const a = bot("KONYA YÜKLEME 1 TIR BURSA, 1 TIR İSTANBUL AVRUPA 13.60 açık")
  assert.deepEqual(a.routes?.map((r) => r.label), ["Bursa", "İstanbul (Avrupa)"])
  assert.deepEqual(a.routes?.map((r) => r.count), [1, 1])
  assert.deepEqual(a.destinations, ["Bursa", "İstanbul"])
  assert.equal(a.from?.city, "Konya")
  assert.equal(a.to?.city, "Bursa")
})

test("-a/-e ekli çoklu varış ayrılır", () => {
  assert.deepEqual(labels("Konya'dan Bursa'ya 1 tır, Ankara'ya 1 tır"), ["Bursa", "Ankara"])
})

test("belirsiz çıplak şehir dizisi tek rota kalır", () => {
  assert.equal(bot("Konya yükleme Bursa İstanbul Ankara 24 ton").routes, undefined)
})

test("tek rota ve yan bilgi çoklu rota sayılmaz", () => {
  assert.equal(bot("Konya - Adana 13.60 açık tır").routes, undefined)
  assert.equal(bot("Konya yükleme Ankara teslim 25 ton demir").routes, undefined)
  assert.equal(bot("Konya'dan Ankara'ya yük var, İzmir'de Ahmet'i arayın").routes, undefined)
})

test("çıkış bilinmiyorsa çoklu rota üretilmez", () => {
  assert.equal(bot("1 TIR BURSA, 1 TIR ANKARA").routes, undefined)
})
