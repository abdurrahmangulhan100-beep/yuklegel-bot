export function formatTL(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0 TL'
  // "₺" (U+20BA) birçok fontta düzgün gözükmediği için "TL" son eki kullanılıyor.
  const formatted = new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(value)
  return `${formatted} TL`
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0'
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Bilinmiyor'
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'Bilinmiyor'

  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  return new Date(iso).toLocaleDateString('tr-TR')
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export function whatsappLink(phone: string | null | undefined, text?: string): string {
  const digits = normalizePhone(phone)
  if (!digits) return '#'
  const withCountry = digits.startsWith('90') ? digits : `90${digits.replace(/^0/, '')}`
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${withCountry}${q}`
}

export function telLink(phone: string | null | undefined): string {
  const digits = normalizePhone(phone)
  if (!digits) return '#'
  const withCountry = digits.startsWith('90') ? `+${digits}` : `+90${digits.replace(/^0/, '')}`
  return `tel:${withCountry}`
}