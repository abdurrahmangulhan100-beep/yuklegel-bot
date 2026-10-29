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
    extraCities: a.extraCities,
    destinations: a.destinations,
    cargo: cleanText(item.cargo_detail),
    message: cleanText(item.message),
    vehicle: a.vehicle ?? "",
    trailer: a.trailer,
    tonnage: a.tonnage,
    timing: a.timing,
    price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
    urgent: Boolean(item.urgent),
    time: timeAgo(item.created_at),
    createdAt: item.created_at,
    color: "bg-[#d64526]",
    source: "user",
    phone: item.phone || profileObj?.phone || "Belirtilmedi",
  }
}

export function mapBotListing(item: DatabaseListing): Load {
  // Saha ilanları ham mesaj olarak gösterilir; yalnızca emoji/biçim işaretleri temizlenir ve satır sonları korunur
  const rawDetail = cleanRaw(item.cargo_detail) || "Saha İlanı"
  let rawCompany = cleanText(item.company_name || "Nakliye Ağı")
  if (rawCompany.toLowerCase().includes("whatsapp")) rawCompany = "Nakliye Ağı"

  // Metinden şehirleri, araç / dorse / tonaj / zaman bilgisini ayrıştırırız (ekrana yön olarak değil, etiket olarak)
  const a = analyzeListing({
    from: item.from_city,
    to: item.to_city,
    cargo: rawDetail,
    vehicle: item.vehicle_type,
    trustFields: false,
  })

  return {
    id: `bot-${item.id}`,
    company: rawCompany,
    initials: "NA",
    from: "",
    to: "",
    cities: a.cities,
    districtOf: a.districtOf,
    fromCity: a.from?.city,
    toCity: a.to?.city,
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
    const key = l.phone.replace(/\D/g, "") + "|" + fold(l.cargo).replace(/[^a-z0-9]/g, "").slice(0, 90)
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
