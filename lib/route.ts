/**
 * İlan metninden güzergah, araç, zaman gibi bilgileri çıkaran yardımcılar.
 *
 * Amaç: veritabanında "Belirtilmedi" / "-" gibi boş değerler olsa bile ilan metninden
 * (örn. "Konya'dan Kırşehir'e 13.60 açık tır") şehirleri bulmak ve bulunamayan bilgiyi
 * ekranda HİÇ göstermemek. Dışarıya sadece bulunabilen bilgi döner.
 */

import { DISTRICTS } from "./districts"

export type Place = {
  /** Ekranda gösterilecek metin: "Konya" veya "Konya / Beyşehir" */
  label: string
  /** İl adı (biliniyorsa) - filtre ve arama için */
  city?: string
  district?: string
}

export type ListingAnalysis = {
  /**
   * İlan metninde geçen tüm şehirler (metindeki sırayla, tekrarsız, en fazla 6).
   * Ekranda yön (nereden → nereye) göstermek yerine şehir etiketi olarak kullanılır.
   */
  cities: string[]
  /** il -> metinde geçen ilçe adı (varsa), etikette "Tekirdağ · Çerkezköy" göstermek için */
  districtOf: Record<string, string>
  from?: Place
  to?: Place
  /** Güzergahta geçen ama yükleme/teslimat olarak ayrılamayan diğer şehirler */
  extraCities: string[]
  vehicle?: string
  trailer?: string
  tonnage?: string
  timing?: string
  /** Telefon numaraları ayıklanmış, okunur yük metni */
  cargoText: string
}

const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
]

/** Yaygın kısa adlar / ağız kullanımları */
const ALIAS_TO_CITY: Record<string, string> = {
  afyon: "Afyonkarahisar",
  antep: "Gaziantep",
  maras: "Kahramanmaraş",
  urfa: "Şanlıurfa",
  izmit: "Kocaeli",
  adapazari: "Sakarya",
  icel: "Mersin",
}

/** Günlük dilde başka anlamları olan adlar: ek alıyorsa kesme işareti, çıplaksa büyük harf şart */
const WEAK = new Set(["van", "mus", "ordu", "kilis", "tokat", "agri"])

const FOLD_MAP: Record<string, string> = {
  "ı": "i", "İ": "i", "I": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
  "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c", "â": "a", "î": "i", "û": "u",
}

/** Küçük harf + Türkçe karakterleri sadeleştirir. Uzunluk korunur (indeksler aynı kalır). */
export function fold(s: string): string {
  let out = ""
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const mapped = FOLD_MAP[ch]
    if (mapped) { out += mapped; continue }
    const low = ch.toLowerCase()
    out += low.length === 1 ? low : ch
  }
  return out
}

const CANON: Map<string, string> = new Map()
for (const c of CITIES) CANON.set(fold(c), c)
for (const [alias, city] of Object.entries(ALIAS_TO_CITY)) CANON.set(alias, city)

/** katlanmış ad -> il (+ilçe). Önce il adı/takma ad, sonra ilçe sözlüğü */
function resolveName(key: string): { city: string; district?: string } | undefined {
  const c = CANON.get(key)
  if (c) return { city: c }
  const d = DISTRICTS.get(key)
  return d ? { city: d.city, district: d.name } : undefined
}

type SuffixKind = "from" | "to" | "at"
const SUFFIXES: [string, SuffixKind][] = [
  ["dan", "from"], ["den", "from"], ["tan", "from"], ["ten", "from"],
  ["ya", "to"], ["ye", "to"], ["na", "to"], ["ne", "to"], ["a", "to"], ["e", "to"],
  ["da", "at"], ["de", "at"], ["ta", "at"], ["te", "at"],
]
const SUFFIX_MAP = new Map(SUFFIXES)
const SUFFIXES_LONGEST_FIRST = [...SUFFIXES].sort((a, b) => b[0].length - a[0].length)

/** Şehrin yanındaki kelimeden yönünü anlar: "Ankara teslim" -> varış, "Bursa yükleme" -> çıkış */
const ORIGIN_KW = ["yukle", "cikis", "kalkis"]
const DEST_KW = ["bosalt", "teslim", "varis", "inecek", "gidecek", "gidis", "indir", "tahliye"]
function roleOfWord(w: string): "from" | "to" | null {
  if (ORIGIN_KW.some((k) => w.startsWith(k))) return "from"
  if (DEST_KW.some((k) => w.startsWith(k))) return "to"
  return null
}

type Mention = {
  city: string
  district?: string
  /** from: -dan/-den, to: -a/-e, at: -da/-de, bare: ek yok */
  kind: SuffixKind | "bare"
  start: number
  end: number
}

const FIRM_WORDS = new Set(["nakliyat", "nakliye", "nakliyecilik", "lojistik", "tasimacilik", "transport", "ticaret"])

const TOKEN_RE = /[A-Za-zÇĞİıÖŞÜçğöşü0-9]+(?:['’´`][A-Za-zÇĞİıÖŞÜçğöşü]+)?/g

function findMentions(text: string): Mention[] {
  text = text.replace(/\b(orhan)\s+(eli|gazi)\b/gi, (m) => m.replace(/\s+/g, "").padEnd(m.length, " "))
  const tokens: { raw: string; start: number; end: number }[] = []
  for (const m of text.matchAll(TOKEN_RE)) {
    tokens.push({ raw: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
  }

  const result: Mention[] = []
  for (let i = 0; i < tokens.length; i++) {
    const { raw, start, end } = tokens[i]
    const aposIdx = raw.search(/['’´`]/)
    const hasApos = aposIdx > 0
    const base = fold(hasApos ? raw.slice(0, aposIdx) : raw)
    const suffixPart = hasApos ? fold(raw.slice(aposIdx + 1)) : ""

    let city: string | undefined
    let district: string | undefined
    let kind: Mention["kind"] = "bare"
    let weakKey = ""

    if (hasApos) {
      let r = resolveName(base)
      let k = SUFFIX_MAP.get(suffixPart)
      if (!(r && k)) {
        // "Karabağ'lardan", "Çiftlik'lerden": kesme yanlış yere konmuş çoğul + hal eki
        const pl = suffixPart.match(/^(lar|ler)(dan|den|tan|ten|a|e|da|de|ta|te)$/)
        if (pl) {
          const r2 = resolveName(base + pl[1])
          const k2 = SUFFIX_MAP.get(pl[2])
          if (r2 && k2) { r = r2; k = k2 }
        }
      }
      if (r && k) { city = r.city; district = r.district; kind = k; weakKey = base }
    } else {
      const direct = resolveName(base)
      if (direct) {
        city = direct.city; district = direct.district; weakKey = base
      } else {
        for (const [suf, k] of SUFFIXES_LONGEST_FIRST) {
          if (base.length > suf.length && base.endsWith(suf)) {
            const stem = base.slice(0, -suf.length)
            const r = resolveName(stem)
            if (r) { city = r.city; district = r.district; kind = k; weakKey = stem; break }
          }
        }
      }
    }
    if (!city) continue

    if (WEAK.has(weakKey)) {
      // "Van'a" geçerli; "vana" / "van" (küçük harf) geçersiz
      const firstChar = raw[0]
      const isCapital = firstChar !== firstChar.toLocaleLowerCase("tr-TR")
      if (kind !== "bare" && !hasApos) continue
      if (kind === "bare" && !isCapital) continue
    }

    // Firma adının parçası olan şehir ("Afyon Doğan Nakliyat", "Konya Lojistik") güzergâh değildir
    if (kind === "bare") {
      const near = [tokens[i + 1], tokens[i + 2]].filter(Boolean).map((t) => fold(t.raw))
      if (near.some((w) => FIRM_WORDS.has(w))) continue
    }

    // "Konya dan Urfa" - ek ayrı yazılmış
    if (kind === "bare" && i + 1 < tokens.length) {
      const next = fold(tokens[i + 1].raw)
      if (next === "dan" || next === "den") {
        kind = "from"
        result.push({ city, district, kind, start, end: tokens[i + 1].end })
        i++
        continue
      }
    }

    // Ekli/ayrı yazılmış yön: "Ankara ya", "Ankara'da teslim", "Ankara boşaltma", "Boşaltma: Ankara"
    if (kind === "bare" || kind === "at") {
      const nxt = tokens[i + 1]
      let role: "from" | "to" | null = null
      let consumed = 0
      if (nxt && kind === "bare") {
        const f = fold(nxt.raw)
        if (f === "ya" || f === "ye" || f === "na" || f === "ne") { role = "to"; consumed = 1 }
      }
      // "Boşaltma: Ankara" biçiminde önceki kelime (iki nokta/tire ile bağlıysa) önceliklidir
      if (!role && i > 0) {
        const pv = tokens[i - 1]
        if (/^\s*[:=\-–]\s*$/.test(text.slice(pv.end, start))) {
          role = roleOfWord(fold(pv.raw))
          // "Yükleme Yeri : ÇORLU" / "İndirme Adresi: ..." -> iki kelime geriye bak
          if (!role && i > 1 && /^(yeri|adresi|yer|adres|noktasi|nokta)$/.test(fold(pv.raw))) role = roleOfWord(fold(tokens[i - 2].raw))
        }
      }
      if (!role && nxt) role = roleOfWord(fold(nxt.raw))
      if (role) {
        result.push({ city, district, kind: role, start, end: consumed ? nxt.end : end })
        i += consumed
        continue
      }
    }

    // Aynı şehir arka arkaya geçiyorsa tekrar ekleme
    const prev = result[result.length - 1]
    if (prev && prev.city === city && prev.kind === kind) { if (!prev.district && district) prev.district = district; continue }
    result.push({ city, district, kind, start, end })
  }
  return result
}

const SEPARATOR_RE = /^\s*(?:[A-Za-zÇĞİıÖŞÜçğöşü]+\s+){0,2}(?:[-–—>→»~/]+|=>|->)\s*$/

type TextRoute = { from?: Mention; to?: Mention; explicit: boolean }

function routeFromMentions(text: string, ms: Mention[]): TextRoute {
  if (ms.length === 0) return { explicit: false }

  // 1) "Konya - Adana", "Konya > Adana"
  for (let i = 0; i < ms.length - 1; i++) {
    if (ms[i].city === ms[i + 1].city) continue
    if (SEPARATOR_RE.test(text.slice(ms[i].end, ms[i + 1].start))) {
      return { from: ms[i], to: ms[i + 1], explicit: true }
    }
  }

  // 2) -dan / -e ekleriyle
  let from = ms.find((m) => m.kind === "from")
  let to = ms.find((m) => m.kind === "to" && m.city !== from?.city)
  const explicit = Boolean(from && to)

  // 3) Eksik tarafı sıraya bakarak tamamla
  if (from && !to) {
    to = ms.find((m) => m.city !== from!.city && m.start > from!.start) ?? ms.find((m) => m.city !== from!.city)
  } else if (!from && to) {
    from = ms.find((m) => m.city !== to!.city && m.kind !== "to" && m.start < to!.start) ?? ms.find((m) => m.city !== to!.city && m.kind !== "to")
  } else if (!from && !to) {
    from = ms.find((m) => m.kind !== "to")
    if (from) to = ms.find((m) => m.city !== from!.city && m.kind !== "from")
    else to = ms[0]
  }
  return { from, to, explicit }
}

const MISSING = new Set(["", "-", "--", "?", "belirtilmedi", "belirtilmemis", "belirsiz", "bilinmiyor", "yok", "null", "undefined", "none", "n/a", "nan"])

export function isMissing(v?: string | null): boolean {
  if (v === null || v === undefined) return true
  return MISSING.has(fold(String(v)).trim())
}

function tidy(s: string): string {
  return s.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim()
}

function trimSeparators(s: string): string {
  return s.replace(/^[\s\-–—/,.:;()>]+|[\s\-–—/,.:;()>]+$/g, "").replace(/\s+/g, " ")
}

/** "Konya / Beyşehir", "Afyonkarahisar - Merkez", "Dazkırı" gibi alanları Place'e çevirir */
function placeFromField(raw?: string | null): Place | undefined {
  if (isMissing(raw)) return undefined
  const text = tidy(String(raw))
  if (isMissing(text)) return undefined

  const first = findMentions(text)[0]
  if (first) {
    const rest = trimSeparators(text.slice(0, first.start) + " " + text.slice(first.end))
    const district = rest && fold(rest) !== "merkez" ? rest.slice(0, 30) : undefined
    return { label: district ? `${first.city} / ${district}` : first.city, city: first.city, district }
  }
  return { label: text.slice(0, 40) }
}

const PHONE_RE_G = /(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/g
const DANGLING = new Set(["tel", "telefon", "iletisim", "irtibat", "ara", "arayin", "whatsapp", "wp", "no", "numara"])

/** Telefon numaralarını ve "Tel:" gibi artıkları metinden çıkarır */
export function stripPhones(text: string): string {
  let t = text.replace(PHONE_RE_G, " ").replace(/\s+/g, " ").trim()
  for (;;) {
    const m = t.match(/(.*?)[\s:.\-–,]*([^\s:.\-–,]+)[\s:.\-–,]*$/)
    if (!m) break
    if (DANGLING.has(fold(m[2]))) t = m[1].trim()
    else break
  }
  return t.replace(/^[\s:.\-–,]+|[\s:.\-–,]+$/g, "")
}

/** "açık tır/dorse" veya "açık … 13.60" / "13.60 … açık" (sıra fark etmez). Kapalı/tenteli/perdeli geçiyorsa açık sayılmaz. f: fold edilmiş metin */
const OPEN_DORSE_RE = /^(?![\s\S]*\b(?:kapali|tenteli|perdeli)\b)(?=[\s\S]*(?:\bacik\s+(?:tir|dorse)\b|\bacik\b\W+(?:\w+\W+){0,2}13[\s.,]?60\b|\b13[\s.,]?60\W+(?:\w+\W+){0,2}acik\b))/
export const isOpenDorse = (f: string) => OPEN_DORSE_RE.test(f)
export const isDamperli = (f: string) => /\bda[nm]per\w*/.test(f) || /\bkisa\s+dorse\b/.test(f)
/** Kapalı Dorse (eski "Tır"): tır / tenteli / kapalı / perdeli / dorse; açık dorse ve damperli ilanlarla karışmaz */
export const isClosedDorse = (f: string) => /\b(?:tir|tirlar|tenteli|kapali|perdeli|dorse)\b/.test(f) && !isOpenDorse(f) && !isDamperli(f)

const VEHICLE_RULES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/\bkirkayak\b/, () => "Kırkayak"],
  [/\b(frigo|frigorifik|soguk zincir|termokin)\b/, () => "Frigo"],
  [/\bkisa\s+dorse\b|\bda[nm]per\s+dorse\b/, () => "Damperli"],
  [/\bda[nm]per(li)?\b/, () => "Damperli Tır"],
  // Kapalı/tenteli/perdeli tır-dorse her zaman "Kapalı Dorse" (açık kapalı yazılsa bile): kategoriler karışmaz
  [/\b(kapali|tenteli|perdeli)\s+(tir|dorse)\b/, () => "Kapalı Dorse"],
  [OPEN_DORSE_RE, (m) => (/\b13[\s.,]?60\b/.test(m.input ?? "") ? "13.60 Açık Dorse" : "Açık Dorse")],
  [/\blow ?be[dt]\b/, () => "Lowbed"],
  [/\bdorse\b/, () => "Dorse"],
  [/\btir\b/, () => "Kapalı Dorse"],
  [/\b(10|on)[\s.]*teker\b/, () => "10 Teker"],
  [/\b(8|sekiz)[\s.]*teker\b/, () => "8 Teker"],
  [/\b(6|alti)[\s.]*teker\b/, () => "6 Teker"],
  [/\bkamyonet\b/, () => "Kamyonet"],
  [/\bkamyon\b/, () => "Kamyon"],
  [/\bpanel ?van\b/, () => "Panelvan"],
  [/\b(pikap|pick ?up)\b/, () => "Pikap"],
]

function inferVehicle(f: string): string | undefined {
  for (const [re, label] of VEHICLE_RULES) {
    const m = f.match(re)
    if (m) return label(m)
  }
  return undefined
}

function inferTrailer(f: string): string | undefined {
  if (/\b13[\s.,]60\b/.test(f)) return "13,60 m"
  if (/\b13[.,]20\b/.test(f)) return "13,20 m"
  return undefined
}

function inferTonnage(f: string): string | undefined {
  const m = f.match(/\b(\d{1,2}(?:[.,]\d)?)\s*(?:ton|tonluk)\b/)
  return m ? `${m[1].replace(".", ",")} ton` : undefined
}

function inferTiming(f: string): string | undefined {
  const m = f.match(/\b(sabah|gece|ogle|aksam)\s*(\d{1,2})(?:[:.](\d{2}))?(\s*kadar)?/)
  if (m) {
    const name = { sabah: "Sabah", gece: "Gece", ogle: "Öğle", aksam: "Akşam" }[m[1] as "sabah"]
    return `${name} ${m[2]}${m[3] ? `:${m[3]}` : ""}${m[4] ? " kadar" : ""}`
  }
  if (/\bsabah\b/.test(f)) return "Sabah"
  if (/\bogle\b/.test(f)) return "Öğle"
  if (/\baksam\b/.test(f)) return "Akşam"
  if (/\bgece\b/.test(f)) return "Gece"
  if (/\b(yarin)\b/.test(f)) return "Yarın"
  if (/\b(bugun|bu gun)\b/.test(f)) return "Bugün"
  if (/\b7\s*\/\s*24\b/.test(f)) return "7/24 yükleme"
  if (/\b(hemen|aninda)\b/.test(f)) return "Hemen"
  return undefined
}

export type AnalyzeInput = {
  from?: string | null
  to?: string | null
  cargo?: string | null
  message?: string | null
  vehicle?: string | null
  /** true: alanlar kullanıcı tarafından seçildi (güvenilir). false: bot / ham metin */
  trustFields?: boolean
}

function placeFromMention(m: { city: string; district?: string }): Place {
  return { label: m.district ? `${m.city} / ${m.district}` : m.city, city: m.city, district: m.district }
}

export function analyzeListing(input: AnalyzeInput): ListingAnalysis {
  const rawText = [input.cargo, input.message]
    .filter((v): v is string => !isMissing(v))
    .map((v) => tidy(v))
    .join(" ")
  const text = rawText.replace(PHONE_RE_G, " ")
  const folded = fold(text)

  let from = placeFromField(input.from)
  let to = placeFromField(input.to)

  const ms = findMentions(text)
  const tr = routeFromMentions(text, ms)

  if (input.trustFields) {
    // Kullanıcı seçimi: sadece eksik tarafı metinden tamamla
    if (!from && tr.from && tr.from.city !== to?.city) from = { label: tr.from.city, city: tr.from.city }
    if (!to && tr.to && tr.to.city !== from?.city) to = { label: tr.to.city, city: tr.to.city }
  } else {
    // Bot ilanı: alan değerleri yanlış olabilir, ilan metni daha güvenilirdir.
    const mentioned = new Set(ms.map((m) => m.city))

    // a) Metinde hiç geçmeyen bir şehir alanda duruyorsa (ör. grup şehri) güvenme
    if (ms.length > 0) {
      if (from?.city && !mentioned.has(from.city)) from = undefined
      if (to?.city && !mentioned.has(to.city)) to = undefined
    }

    // b) Metinde net sinyal varsa ("X yükleme", "X'dan", "Y'ye", "Y teslim") alanı ezer
    if (tr.explicit && tr.from && tr.to) {
      if (from?.city !== tr.from.city) from = placeFromMention(tr.from)
      if (to?.city !== tr.to.city) to = placeFromMention(tr.to)
    } else {
      if (tr.from?.kind === "from" && from?.city !== tr.from.city && tr.from.city !== to?.city) from = placeFromMention(tr.from)
      if (tr.to?.kind === "to" && to?.city !== tr.to.city && tr.to.city !== from?.city) to = placeFromMention(tr.to)
      // c) Eksik tarafı metinden tamamla
      if (!from && tr.from && tr.from.city !== to?.city) from = placeFromMention(tr.from)
      if (!to && tr.to && tr.to.city !== from?.city) to = placeFromMention(tr.to)
    }
  }

  // Bot alanı (from/to) ile metin çelişirse metin kazanır: metinde bir şehir sadece "-e/-a/teslim" ile geçiyorsa çıkış olamaz (ve tersi)
  if (!input.trustFields) {
    const kindsOf = (c?: string) => new Set(ms.filter((m) => m.city === c).map((m) => m.kind))
    if (from?.city) {
      const k = kindsOf(from.city)
      if (k.has("to") && !k.has("from")) { if (!to) to = from; from = undefined }
    }
    if (to?.city) {
      const k = kindsOf(to.city)
      if (k.has("from") && !k.has("to")) { if (!from) from = to; to = undefined }
    }
  }

  // Sadece bir uç biliniyorsa ve yön "-e" ekiyle belirlenmişse yanlış tarafta durmasın
  if (from && !to && tr.to && !tr.from && tr.to.kind === "to" && from.city === tr.to.city) {
    to = from
    from = undefined
  }

  // Şehir etiketleri: önce metindeki sıraya göre, sonra alanlardan gelenler
  const districtOf: Record<string, string> = {}
  for (const m of ms) if (m.district && !districtOf[m.city]) districtOf[m.city] = m.district
  const cityList: string[] = []
  const pushCity = (c?: string) => { if (c && !cityList.includes(c)) cityList.push(c) }
  if (input.trustFields) {
    // Kullanıcı ilanı: formdaki çıkış ve varış şehri önce gelir
    pushCity(from?.city)
    pushCity(to?.city)
    ms.forEach((m) => pushCity(m.city))
  } else {
    ms.forEach((m) => pushCity(m.city))
    pushCity(from?.city)
    pushCity(to?.city)
  }

  const used = new Set([from?.city, to?.city].filter(Boolean) as string[])
  const extraCities = Array.from(new Set(ms.map((m) => m.city))).filter((c) => !used.has(c)).slice(0, 3)

  const fieldVehicle = isMissing(input.vehicle) ? undefined : tidy(String(input.vehicle)).slice(0, 24)
  const inferred = inferVehicle(folded)

  return {
    cities: cityList.slice(0, 6),
    districtOf,
    from,
    to,
    extraCities,
    vehicle: input.trustFields ? (fieldVehicle ?? inferred) : (inferred ?? fieldVehicle),
    trailer: inferTrailer(folded),
    tonnage: inferTonnage(folded),
    timing: inferTiming(folded),
    cargoText: stripPhones(rawText),
  }
}

/** Liste satırlarında kullanılacak kısa güzergah metni; hiçbir şey yoksa null */
export function shortRoute(from?: string, to?: string): string | null {
  const f = from && from !== "-" ? from : ""
  const t = to && to !== "-" ? to : ""
  if (f && t) return `${f} → ${t}`
  if (f) return `${f} çıkışlı`
  if (t) return `${t} varışlı`
  return null
}

export const CITY_NAMES = CITIES

/** Serbest metindeki şehir adlarını (metindeki sırayla, tekrarsız) döndürür */
export function detectCities(text: string, limit = 6): string[] {
  const out: string[] = []
  for (const m of findMentions(text)) if (!out.includes(m.city)) out.push(m.city)
  return out.slice(0, limit)
}
