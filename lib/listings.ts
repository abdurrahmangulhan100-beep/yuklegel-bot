import type { Load } from "@/components/LoadCard"
import { analyzeListing, fold, isMissing } from "@/lib/route"
import { timeAgo } from "@/lib/utils"

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

// Emoji/sembolleri temizler; ₺, tire, üç nokta ve Türkçe karakterlere dokunmaz
export const cleanText = (text?: string | null) => {
  if (!text) return "-"
  return text
    .replace(/[*_~`]/g, "")
    .replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u231A-\u23FF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uFE0F|\u200D/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// +90 / 0 / boşluk, tire, nokta, parantez içeren cep telefonlarını yakalar; "05xxxxxxxxx" döner
export const extractPhone = (text?: string | null) => {
  if (!text) return ""
  const match = text.match(/(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/)
  if (!match) return ""
  const digits = match[0].replace(/\D/g, "")
  if (digits.length < 10) return ""
  return "0" + digits.slice(-10)
}

const orEmpty = (v: string) => (v === "-" ? "" : v)

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
    extraCities: a.extraCities,
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
  const rawDetail = cleanText(item.cargo_detail || "Saha İlanı")
  let rawCompany = cleanText(item.company_name || "Nakliye Ağı")
  if (rawCompany.toLowerCase().includes("whatsapp")) rawCompany = "Nakliye Ağı"

  // Saha ilanları serbest metindir: "Konya'dan Kırşehir'e..." ifadesi alanlardan daha güvenilirdir
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
    from: a.from?.label ?? "-",
    to: a.to?.label ?? "-",
    fromCity: a.from?.city,
    toCity: a.to?.city,
    extraCities: a.extraCities,
    cargo: orEmpty(a.cargoText) || "Yük detayı belirtilmedi.",
    message: "",
    vehicle: a.vehicle ?? "",
    trailer: a.trailer,
    tonnage: a.tonnage,
    timing: a.timing,
    price: "",
    urgent: Boolean(item.urgent),
    time: timeAgo(item.created_at),
    createdAt: item.created_at,
    color: "bg-[#315d83]",
    source: "bot",
    phone: extractPhone(rawDetail) || item.phone || "Belirtilmedi",
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
