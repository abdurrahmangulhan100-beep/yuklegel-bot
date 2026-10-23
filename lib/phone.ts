/**
 * Metinden Türkiye telefon numarası çıkarır.
 * Yakalananlar: 0532 123 45 67 · 0 532 123 45 67 · +90 (532) 123-45-67 · 532.123.45.67 · 05321234567 · 905321234567 ·
 * wa.me/905321234567 · "O532..." (harf O ile yazılmış sıfır) · 0332 123 45 67 (sabit hat, başında 0 ile)
 * Fiyat / ölçü gibi rakam dizilerini (5000 5500 5300) numara sanmaz.
 * Sonuç her zaman "0XXXXXXXXXX" biçimindedir; bulunamazsa "" döner.
 */
const CANDIDATE = /(^|[^\d])((?:\+?\s*90[\s.\-()]*)?(?:0[\s.\-()]*)?[2-5]\d{2}(?:[\s.\-()]*\d){7})(?!\d)/g

function validRuns(raw: string): boolean {
  const runs = raw.match(/\d+/g)
  if (!runs) return false
  const first = runs[0]
  if (runs.length === 1) return /^(?:90)?0?[2-5]\d{9}$/.test(first) && first.length >= 10
  if (first.length === 1) return first === "0"
  if (first.length === 2) return first === "90"
  if (first.length === 3) return /^[2-5]/.test(first)
  if (first.length === 4) return /^0[2-5]/.test(first)
  return false
}

export function extractPhones(text?: string | null): string[] {
  if (!text) return []
  // Harf "O" ile yazılmış sıfırları düzelt: "O532 ..." -> "0532 ..."
  const t = text.replace(/(^|[^0-9A-Za-zÇĞİÖŞÜçğıöşü])[Oo](?=[\s.\-()]*[2-5]\d{2})/g, (_m, pre: string) => pre + "0")
  const mobile: string[] = []
  const landline: string[] = []
  CANDIDATE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CANDIDATE.exec(t)) !== null) {
    const raw = m[2]
    if (!validRuns(raw)) continue
    let d = raw.replace(/\D/g, "")
    if (d.length >= 12 && d.startsWith("90")) d = d.slice(2)
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1)
    if (d.length !== 10) continue
    if (/^(\d)\1{9}$/.test(d) || /0{6}$/.test(d)) continue // 5555555555, 5xx0000000 gibi sahte numaralar
    const explicitPrefix = /^\s*(?:\+|0|90)/.test(raw)
    const full = "0" + d
    if (d.startsWith("5")) { if (!mobile.includes(full)) mobile.push(full) }
    else if (explicitPrefix) { if (!landline.includes(full)) landline.push(full) }
  }
  return [...mobile, ...landline]
}

export const extractPhone = (text?: string | null): string => extractPhones(text)[0] ?? ""

/** Veritabanındaki phone alanı: "905321234567@s.whatsapp.net", "+90 532...", biçimsiz değerler. WhatsApp LID'i numara değildir. */
export function normalizeStoredPhone(raw?: string | null): string {
  if (!raw) return ""
  const s = String(raw)
  if (/@lid/i.test(s)) return ""
  return extractPhone(s.split("@")[0])
}
