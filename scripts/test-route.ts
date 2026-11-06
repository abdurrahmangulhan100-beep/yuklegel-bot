// Çalıştırma:  npx tsx scripts/test-route.ts      (ya da: pnpm dlx tsx scripts/test-route.ts)
// İlan ayrıştırıcısının (lib/route.ts) bilinen sorunlu / kritik örnekleri. Yeni bir hata bulursanız buraya satır ekleyin.
import test from "node:test"
import assert from "node:assert/strict"
import { analyzeListing, classifyListing, classifyVehicle, fold } from "../lib/route"

type Case = { text: string; from?: string; to?: string; note?: string }
const rota = ({ text, from, to }: Case) => {
  const a = analyzeListing({ cargo: text, trustFields: false })
  return { from: a.from?.label, to: a.to?.label }
}

const CASES: Case[] = [
  // --- Ekran görüntüsündeki gerçek ilanlar ---
  { text: "Nevşehir Samsun havza 1360 açık", from: "Nevşehir", to: "Samsun / Havza" },
  { text: "ADANA FRİGO YÜKLEMELER • ANKARA TİR", from: "Adana", to: "Ankara" },
  { text: "Ereğli'den hatay Kırıkhan'a 9 metre 10 ton açık tır", from: "Konya / Ereğli", to: "Hatay / Kırıkhan" },
  { text: "SARAYÖNÜ DEN TİRE TIR KISA ARPA 1000", from: "Konya / Sarayönü", to: "İzmir / Tire" },
  { text: "KARAMAN AYRANCI DAN", from: "Karaman / Ayrancı", to: undefined },
  { text: "BOLU TIR KISA 1100", from: "Bolu", to: undefined },
  // --- Yeni ilçe sözlüğü ---
  { text: "Tire'den Konya'ya 13.60 açık", from: "İzmir / Tire", to: "Konya" },
  { text: "Konya - Tire tır lazım", from: "Konya", to: "İzmir / Tire" },
  { text: "Kdz Ereğli'den Konya'ya tır", from: "Zonguldak / Ereğli", to: "Konya" },
  { text: "Kozan'dan Mersin'e kamyon", from: "Adana / Kozan", to: "Mersin" },
  // --- Sıradan kelimeler ilçe sanılmamalı ---
  { text: "Konya'dan Ankara'ya lastik tire yükü var", from: "Konya", to: "Ankara" },
  { text: "Bor madeni yükü Eskişehir'den Konya'ya", from: "Eskişehir", to: "Konya" },
  { text: "Ankara'dan İzmir'e tır, kantar acik of of", from: "Ankara", to: "İzmir" },
]

for (const c of CASES) {
  test(c.text, () => {
    const r = rota(c)
    assert.equal(r.from, c.from, "çıkış")
    assert.equal(r.to, c.to, "varış")
  })
}

test("bottan gelen doğru alan, ilçe metinde geçiyorsa silinmez", () => {
  const a = analyzeListing({ from: "Konya / Karapınar", to: "Hatay", cargo: "Karapınar'dan hatay 10 ton", trustFields: false })
  assert.equal(a.from?.city, "Konya")
  assert.equal(a.to?.city, "Hatay")
})

test("metinde hiç geçmeyen grup şehri alana güvenilmez", () => {
  const a = analyzeListing({ from: "Kayseri", to: "Ankara", cargo: "Konya'dan Ankara'ya tır", trustFields: false })
  assert.equal(a.from?.city, "Konya")
})

// --- Araç kategorisi (ilan listesi filtresi + bildirim aynı fonksiyonu kullanır) ---
const KATEGORI: [string, string | null][] = [
  ["Konya'dan Ankara'ya düz kasa 13.60 tır", "Açık Dorse"],
  ["Açık Kasa kamyon İzmir'e", "Kamyon"],
  ["açık kasa tır Ankara", "Açık Dorse"],
  ["Konya Ankara kamyonet yük var", "Kamyonet"],
  ["Panelvan Konya", "Kamyonet"],
  ["Pikap Mersin", "Kamyonet"],
  ["Konya'dan Adana'ya 10 teker kamyon", "Kamyon"],
  ["Konya'dan Ankara'ya 13.60 açık tır", "Açık Dorse"],
  ["Tenteli tır Mersin'e acil", "Kapalı Dorse"],
  ["Damperli Tır", "Damperli"],
  ["Konya'dan Adana'ya TIR lazım", "Kapalı Dorse"],
  ["Frigo tır", "Frigo"],
]
for (const [text, beklenen] of KATEGORI) {
  test(`kategori: ${text}`, () => assert.equal(classifyVehicle(fold(text)), beklenen))
}

test("kullanıcı ilanında formdaki araç tipi esastır, metindeki 'tır' onu ezmez", () => {
  assert.equal(classifyListing("Panelvan", "tır ile de olur dorse", true), "Kamyonet")
  assert.equal(classifyListing("13.60 Açık Dorse", "Kömür", true), "Açık Dorse")
})

test("saha ilanında metin esastır, alan yalnızca yedektir", () => {
  assert.equal(classifyListing("Kamyon", "Konya Ankara 13.60 açık tır", false), "Açık Dorse")
  assert.equal(classifyListing("Frigo", "Konya Ankara yük var", false), "Frigo")
})
