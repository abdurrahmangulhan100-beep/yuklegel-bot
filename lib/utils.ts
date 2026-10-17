import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ISO tarihi "Az önce / 5 dk önce / 3 sa önce / 2 gün önce / 12.10.2026" biçimine çevirir */
export function timeAgo(iso?: string | null): string {
  if (!iso) return 'Yeni'
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return 'Yeni'
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Az önce'
  if (min < 60) return `${min} dk önce`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} sa önce`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} gün önce`
  return date.toLocaleDateString('tr-TR')
}
