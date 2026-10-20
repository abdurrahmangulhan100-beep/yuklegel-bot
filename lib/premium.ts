// Premium ayarları. Limitleri değiştirmek için sadece bu dosyayı düzenlemeniz yeterli.

export const PREMIUM_SKU = "nakliye_premium_aylik" // Play Console > Abonelikler > Ürün kimliği
export const PLAY_BILLING = "https://play.google.com/billing"
export const PLAY_PACKAGE = process.env.NEXT_PUBLIC_PLAY_PACKAGE || ""

/** Ücretsiz kullanıcı limitleri */
export const FREE_LIMITS = {
  favorites: 10,        // en fazla kaç favori
  activeListings: 3,    // aynı anda en fazla kaç aktif ilan
  contactsPerDay: 15,   // günde kaç farklı ilanda Ara / WhatsApp / Kopyala
}

/** Yalnızca premium kullanıcıların açabildiği Şoför Araçları (ToolsView anahtarları) */
export const PREMIUM_ONLY_TOOLS = ["planner", "docs", "fuel"]

export const PREMIUM_FEATURES = [
  "Reklamsız kullanım",
  "Sınırsız Ara / WhatsApp ile iletişim",
  "Sınırsız favori ve aynı anda sınırsız aktif ilan",
  "Varış Süresi Planlayıcı, Belge Hatırlatıcı ve Yakıt Defteri",
]

export const FREE_FEATURES = [
  `Günde ${FREE_LIMITS.contactsPerDay} ilanda iletişim`,
  `${FREE_LIMITS.favorites} favori, ${FREE_LIMITS.activeListings} aktif ilan`,
  "Takograf, Hacim ve Kontrol Listesi araçları",
  "Reklamlı kullanım",
]

export const OPEN_PREMIUM_EVENT = "nakliye:open-premium"

/** Premium sekmesini açar (page.tsx bu olayı dinler) */
export function openPremium() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PREMIUM_EVENT))
}

const CONTACT_KEY = "contact_usage"

/**
 * Bir ilanda iletişim kurulabilir mi? Aynı ilan gün içinde bir kez sayılır.
 * Premium ise her zaman true. Limit dolduysa false döner (çağıran Premium'a yönlendirir).
 */
export function consumeContact(listingId: string, isPremium: boolean): boolean {
  if (isPremium) return true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = JSON.parse(localStorage.getItem(CONTACT_KEY) || "null")
    const state: { date: string; ids: string[] } = raw && raw.date === today ? raw : { date: today, ids: [] }
    if (state.ids.includes(listingId)) return true
    if (state.ids.length >= FREE_LIMITS.contactsPerDay) return false
    state.ids.push(listingId)
    localStorage.setItem(CONTACT_KEY, JSON.stringify(state))
    return true
  } catch {
    return true // depolama erişilemiyorsa kullanıcıyı engelleme
  }
}

export function contactLimitMessage() {
  return `Ücretsiz planda günde ${FREE_LIMITS.contactsPerDay} ilanla iletişim kurabilirsiniz. Sınırsız iletişim için Premium'a geçin.`
}
