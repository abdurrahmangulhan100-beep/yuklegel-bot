import type { Load } from "@/components/LoadCard"
import { analyzeListing, fold, isMissing } from "@/lib/route"
import { timeAgo } from "@/lib/utils"
import { extractPhone, normalizeStoredPhone } from "@/lib/phone"

export interface DatabaseListing {
  id: string | number
  user_id?: string
  company_name?: string
  from_city?: string
  to_city?: string
  cargo_detail?: string
  message?: string
  text?: string
  vehicle_type?: string
  price?: number | string
  urgent?: boolean
  created_at?: string
  phone?: string
  is_bot?: boolean
  profiles?: ProfileJoin | ProfileJoin[] | null
}

type ProfileJoin = {
  company_name?: string
  phone?: string
  authorized_person?: string
}

// Ekranda kutucuk (☐) olarak görünen her şeyi siler: tüm emoji/piktogramlar, bayraklar, renk tonu, görünmez/biçim karakterleri,
// özel kullanım ve atanmamış kod noktaları. Rakamlara, ₺, Türkçe harflere ve satır sonlarına dokunmaz.
const INVISIBLE_RE = /[\u20E3\uFE0E\uFE0F\u2060\uFFFC\uFFFD\p{Cf}\p{Co}\p{Cn}\p{Cs}]/gu // kelime içinde kalırsa bitişik silinir
const SYMBOL_RE = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|[\u{1F1E6}-\u{1F1FF}]|[\u25A0-\u25FF\u2190-\u21FF\u2B00-\u2BFF]/gu // yerine boşluk konur: "Konya➡️Ankara" birleşmesin
const stripJunk = (t: string) => t.replace(INVISIBLE_RE, "").replace(SYMBOL_RE, " ")

// Emoji/sembolleri temizler; ₺, tire, üç nokta ve Türkçe karakterlere dokunmaz
export const cleanText = (text?: string | null) => {
  if (!text) return "-"
  return stripJunk(text)
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// cleanText ile aynı temizlik, ama satır sonlarını korur (bot mesajı "ham" haliyle okunabilsin)
export const cleanRaw = (text?: string | null) => {
  if (!text) return ""
  return stripJunk(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[*_~`]/g, "")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Telefon çıkarma lib/phone.ts içinde (daha toleranslı); eski içe aktarmalar bozulmasın diye buradan da dışa aktarılır
export { extractPhone }

export function mapUserListing(item: DatabaseListing): Load {
  const profileObj = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
  const companyName = cleanText(item.company_name || profileObj?.company_name || profileObj?.authorized_person || "Nakliye Cepte Kullanıcısı")
  const initials = companyName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "NK"

  // Kullanıcı ilanında şehirler formdan seçilir: alanlara güveniriz, eksikse metinden tamamlarız
  const a = analyzeListing({
    from: item.from_city,
    to: item.to_city,
    cargo: item.cargo_detail,
    message: item.message,
    vehicle: item.vehicle_type,
    trustFields: true,
  })

  return {
    id: `user-${item.id}`,
    userId: item.user_id,
    company: companyName,
    initials,
    from: a.from?.label ?? "-",
    to: a.to?.label ?? "-",
    fromCity: a.from?.city,
    toCity: a.to?.city,
    cities: a.cities,
    districtOf: a.districtOf,
    fromDistrict: a.from?.district,
    toDistrict: a.to?.district,
    extraCities: a.extraCities,
    destinations: a.destinations,
    routes: a.routes,
    cargo: cleanText(item.cargo_detail),
    message: cleanText(item.message),
    vehicle: a.vehicle ?? "",
    trailer: a.trailer,
    tonnage: a.tonnage,
    timing: a.timing,
    price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
    // Formda "acil" işaretlenmese bile ilan metninde açıkça "acil" yazıyorsa Acil filtresinde görünsün
    urgent: Boolean(item.urgent) || /\bacil\b/.test(fold(`${item.cargo_detail ?? ""} ${item.message ?? ""}`)),
    time: timeAgo(item.created_at),
    createdAt: item.created_at,
    color: "bg-[#d64526]",
    source: "user",
    phone: item.phone || profileObj?.phone || "Belirtilmedi",
  }
}

type ParsedBotDisplay = {
  company?: string
  companyFromMessage: boolean
  routes: { from: string; to: string; detail?: string }[]
  notes: string[]
}

const PRESENTATION_JUNK = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu
const VEHICLE_TERMS = ["kapalı", "açık", "tenteli", "perdeli", "tır", "tırlar", "dorse", "kamyon", "kamyonet", "damperli", "damper", "frigo", "frigorifik", "kırkayak", "ambar", "avrupa", "anadolu", "ist"]

function removePhrase(source: string, phrase: string): string {
  const needle = fold(phrase)
  if (!needle) return source
  let result = source
  for (;;) {
    const normalized = fold(result)
    const index = normalized.indexOf(needle)
    if (index < 0) return result
    const before = index > 0 ? normalized[index - 1] : " "
    const afterIndex = index + needle.length
    const after = afterIndex < normalized.length ? normalized[afterIndex] : " "
    if (/[\p{L}\p{N}]/u.test(before) || /[\p{L}\p{N}]/u.test(after)) {
      // Kelime sınırında değilse sonraki eşleşmeyi ara.
      const next = normalized.indexOf(needle, index + 1)
      if (next < 0) return result
      const b = next > 0 ? normalized[next - 1] : " "
      const a = next + needle.length < normalized.length ? normalized[next + needle.length] : " "
      if (/[\p{L}\p{N}]/u.test(b) || /[\p{L}\p{N}]/u.test(a)) return result
      result = result.slice(0, next) + " " + result.slice(next + needle.length)
    } else {
      result = result.slice(0, index) + " " + result.slice(afterIndex)
    }
  }
}

/** Ham metni değiştirmeden, kart için güvenli alanları çıkarır. Emin olunmayan satırlar not olarak kalır. */
function parseBotDisplay(raw: string, fallbackCompany?: string): ParsedBotDisplay {
  let text = raw.replace(/orhan[’']lı/gi, "Orhanlı").replace(PRESENTATION_JUNK, " ").replace(/[★☆✦✧❌❎✔️☑️⚡🔥📍🚛🚚📦⏰🕒]/gu, " ")
  text = text.replace(/[＊*_*~`]/g, "").replace(/[ \t]+/g, " ").trim()
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  let company = ""
  let companyFromMessage = false

  // Açık firma ibaresi olan başlık: "Beyyılmaz Nakliyat İstanbul ..."
  const firmPrefix = text.match(/^(.{2,55}?\b(?:nakliyat|nakliye|lojistik|taşımacılık|tasimacilik)\b)[\s,:;|—-]+([\s\S]+)$/i)
  if (firmPrefix) {
    company = firmPrefix[1].trim().split(/\s+/).map((word) => word ? word[0].toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR") : word).join(" ")
    text = firmPrefix[2].trim()
    companyFromMessage = true
  } else {
    // Çok satırlı mesajın sonundaki tek başına firma/kişi imzası (örn. HATİP ARSLAN).
    const last = lines[lines.length - 1] ?? ""
    const lastAnalysis = analyzeListing({ cargo: last })
    const hasVehicleOrLoad = /\b(?:tir|dorse|kamyon|kamyonet|damper|frigo|ton|hafif|agir|kargo|palet|yuk|hayvan|araba)\b/i.test(last)
    if (last && lastAnalysis.cities.length === 0 && !hasVehicleOrLoad && /^[\p{L}][\p{L} .'-]{2,45}$/u.test(last) && last.split(/\s+/).length <= 3) {
      company = last.replace(/\s+/g, " ").trim().split(" ").map((word) => word ? word[0].toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR") : word).join(" ")
      companyFromMessage = true
      lines.pop()
      text = lines.join("\n")
    }
  }

  const routes: { from: string; to: string; detail?: string }[] = []
  const notes: string[] = []
  for (const originalLine of text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    let line = originalLine
    // Yaygın kısaltma: "İST AVRUPA" / "İST ANADOLU".
    line = line.replace(/^\s*(?:İST|IST|ist)\s+(avrupa|anadolu)\b/iu, (_m, side) => `İstanbul ${side} `)
    const a = analyzeListing({ cargo: line })
    if (a.cities.length >= 2) {
      const labels = a.cities.map((city) => {
        const district = a.districtOf[city]
        const side = city === "İstanbul" && /\bavrupa\b/i.test(line) ? " (Avrupa)" : city === "İstanbul" && /\banadolu\b/i.test(line) ? " (Anadolu)" : ""
        return `${city}${district ? ` / ${district}` : ""}${side}`
      })
      const from = labels[0]
      for (const to of labels.slice(1)) {
        if (from !== to) routes.push({ from, to, detail: extractRouteDetail(line, a) || undefined })
      }
    } else if (a.cities.length === 1) {
      // Tek şehirli ama anlamlı açıklamayı kaybetme.
      const note = line.replace(PRESENTATION_JUNK, " ").trim()
      if (note && !notes.includes(note)) notes.push(note)
    } else {
      const note = line.replace(PRESENTATION_JUNK, " ").trim()
      if (note && !notes.includes(note)) notes.push(note)
    }
  }

  return {
    company: company || (fallbackCompany && !/whatsapp|nakliye ağı/i.test(fallbackCompany) ? fallbackCompany : undefined),
    companyFromMessage,
    routes: routes.filter((r, i) => routes.findIndex((x) => x.from === r.from && x.to === r.to && (x.detail ?? "") === (r.detail ?? "")) === i),
    notes,
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function extractRouteDetail(line: string, analysis: ReturnType<typeof analyzeListing>): string {
  let detail = line
  for (const city of analysis.cities) detail = removePhrase(detail, city)
  for (const district of Object.values(analysis.districtOf)) detail = removePhrase(detail, district)
  for (const term of VEHICLE_TERMS) detail = removePhrase(detail, term)
  for (const term of ["şimdi sarar", "şimdi", "hemen", "yarın", "bugün", "sabah", "akşam", "öğle", "gece"]) detail = removePhrase(detail, term)
  detail = detail.replace(/\b\d{1,2}\s*[:–-]\s*\d{1,2}\s*ton\b/gi, " ")
    .replace(/\b\d{1,2}(?:[.,]\d)?\s*ton(?:luk)?\b/gi, " ")
  return detail.replace(/[+/,;:|—–>-]+/g, " ").replace(/\s+/g, " ").trim()
}

export function mapBotListing(item: DatabaseListing): Load {
  // Saha ilanları ham mesaj olarak gösterilir; yalnızca emoji/biçim işaretleri temizlenir ve satır sonları korunur
  // Ham WhatsApp metni değiştirilmeden saklanır; yalnızca kart sunumu ayrı olarak temizlenir.
  const rawDetail = item.cargo_detail || "Saha İlanı"
  let rawCompany = cleanText(item.company_name || "Nakliye Ağı")
  if (rawCompany.toLowerCase().includes("whatsapp")) rawCompany = "Nakliye Ağı"
  const display = parseBotDisplay(rawDetail, rawCompany)
  if (display.company) rawCompany = cleanText(display.company)

  // Metinden şehirleri, araç / dorse / tonaj / zaman bilgisini ayrıştırırız (ekrana yön olarak değil, etiket olarak)
  const a = analyzeListing({
    from: item.from_city,
    to: item.to_city,
    cargo: rawDetail.replace(/orhan[’']lı/gi, "Orhanlı"),
    vehicle: item.vehicle_type,
    trustFields: false,
  })

  return {
    id: `bot-${item.id}`,
    company: rawCompany,
    initials: rawCompany.split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR") || "NA",
    displayRoutes: display.routes.length > 0 ? display.routes : undefined,
    displayNotes: display.notes.length > 0 ? display.notes : undefined,
    vehicleLabel: /\btir\b/i.test(fold(rawDetail)) ? "TIR" : undefined,
    companyFromMessage: display.companyFromMessage,
    from: "",
    to: "",
    cities: a.cities,
    districtOf: a.districtOf,
    fromDistrict: a.from?.district,
    toDistrict: a.to?.district,
    fromCity: a.from?.city,
    toCity: a.to?.city,
    destinations: a.destinations,
    routes: a.routes,
    cargo: rawDetail,
    message: "",
    vehicle: a.vehicle ?? "",
    trailer: a.trailer,
    tonnage: a.tonnage,
    timing: a.timing,
    price: "",
    urgent: Boolean(item.urgent) || /\bacil\b/.test(fold(`${item.cargo_detail ?? ""} ${item.company_name ?? ""}`)),
    time: timeAgo(item.created_at),
    createdAt: item.created_at,
    color: "bg-[#315d83]",
    source: "bot",
    phone: extractPhone(rawDetail) || normalizeStoredPhone(item.phone) || "Belirtilmedi",
  }
}

/**
 * Aynı telefon + aynı metinle tekrar tekrar paylaşılan saha ilanlarını tek karta indirir.
 * Liste en yeniden eskiye sıralı gelmelidir; en yeni kayıt korunur.
 * Kullanıcı ilanlarına dokunulmaz.
 */
export function dedupeLoads(loads: Load[]): Load[] {
  const seen = new Map<string, number>()
  const out: Load[] = []
  for (const l of loads) {
    if (l.source !== "bot" || isMissing(l.phone)) { out.push(l); continue }
    // Aynı telefon farklı güzergâhlar için ayrı ilan paylaşabilir: güzergâh da anahtara girer, böylece gerçek ilanlar tek karta düşmez
    const key = l.phone.replace(/\D/g, "") + "|" + (l.fromCity ?? "") + ">" + (l.toCity ?? "") + "|" + fold(l.cargo).replace(/[^a-z0-9]/g, "").slice(0, 120)
    const idx = seen.get(key)
    if (idx === undefined) {
      seen.set(key, out.length)
      out.push(l)
    } else {
      const kept = out[idx]
      out[idx] = { ...kept, repeatCount: (kept.repeatCount ?? 1) + 1 }
    }
  }
  return out
}

/**
 * Yenileme sonrası içeriği değişmeyen ilanların eski nesnesini korur.
 * Böylece memo'lu LoadCard'lar gereksiz yere yeniden çizilmez (mobilde kasmayı önler).
 */
export function reuseLoads(prev: Load[], next: Load[]): Load[] {
  if (prev.length === 0) return next
  const byId = new Map(prev.map((l) => [l.id, l]))
  return next.map((n) => {
    const p = byId.get(n.id)
    if (!p) return n
    const a = p as unknown as Record<string, unknown>
    const b = n as unknown as Record<string, unknown>
    for (const k of Object.keys(b)) {
      const x = a[k], y = b[k]
      if (x === y) continue
      if (Array.isArray(x) && Array.isArray(y) && x.join("|") === y.join("|")) continue
      return n
    }
    return p
  })
}

/** Saha (bot) ilanlarında metne gömülü telefon numaralarını ve "Tel:" gibi etiketleri gizler; numara yalnızca Ara / WhatsApp / ilan işlemlerinde kullanılır */
const PHONE_CORE = "(?:(?:\\+|00)?90[\\s.\\-]?)?\\(?0?\\s?\\(?[2-5]\\d{2}\\)?[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{2}[\\s.\\-]?\\d{2}"
const PHONE_RE = new RegExp(`(?:\\b(?:tel(?:efon)?|gsm|cep|wp|whatsapp|iletişim|iletisim|irtibat)\\b\\s*[:.\\-–—]*\\s*)?${PHONE_CORE}`, "gi")
export function hidePhones(text: string): string {
  if (!text) return text
  const out: string[] = []
  for (const line of text.split("\n")) {
    PHONE_RE.lastIndex = 0
    if (!PHONE_RE.test(line)) { out.push(line); continue }
    PHONE_RE.lastIndex = 0
    const cleaned = line.replace(PHONE_RE, "").replace(/[\s—–\-:|·,]+$/, "").trimEnd()
    if (cleaned.trim()) out.push(cleaned) // sadece numaradan ibaret satır tamamen düşer
  }
  return out.join("\n").trim()
}
