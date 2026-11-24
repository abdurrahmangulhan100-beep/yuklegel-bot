/**
 * Turkish-aware search helpers for PostgREST ilike filters.
 * Generates bounded spelling variants for Turkish letters and ASCII keyboards.
 */
const TURKISH_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["i", "ı"],
  ["s", "ş"],
  ["g", "ğ"],
  ["u", "ü"],
  ["o", "ö"],
  ["c", "ç"],
]

const TURKISH_ALTERNATES = new Map<string, string>(
  TURKISH_PAIRS.flatMap(([ascii, turkish]) => [
    [ascii, turkish],
    [turkish, ascii],
  ]),
)

export function normalizeSearchInput(value: string): string {
  return value
    .replace(/[,%()\\"_*:\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Returns the original Turkish spelling plus ASCII/Turkish keyboard variants.
 * Breadth-first expansion ensures combinations (e.g. soguk -> soğuk) are tried
 * before less likely variants. The limit keeps PostgREST .or() URLs bounded.
 */
export function searchVariants(token: string, max = 32): string[] {
  const clean = token.trim().toLocaleLowerCase("tr-TR")
  if (!clean || max <= 0) return []

  const variants = new Set<string>([clean])
  const queue = [clean]

  while (queue.length > 0 && variants.size < max) {
    const current = queue.shift()!
    const chars = Array.from(current)

    for (let index = 0; index < chars.length && variants.size < max; index += 1) {
      const alternate = TURKISH_ALTERNATES.get(chars[index])
      if (!alternate) continue

      const nextChars = [...chars]
      nextChars[index] = alternate
      const next = nextChars.join("")
      if (!variants.has(next)) {
        variants.add(next)
        queue.push(next)
      }
    }
  }

  return Array.from(variants)
}

// ---- Sunucu tarafı aramanın TEK sütunlu hali (supabase/009_arama_performans.sql ile birebir aynı katlama) ----
// search_norm sütunu: lower(translate(metin, SEARCH_FOLD_FROM, SEARCH_FOLD_TO)). Böylece "soguk", "SOĞUK", "Soğuk" aynı kayda gider
// ve her kelime için tek bir ilike koşulu yeter (eski yöntemde kelime başına en fazla 192 koşul vardı: URL çok uzayıp 4+ kelimede hata veriyordu).
export const SEARCH_FOLD_FROM = "ıİIşŞğĞüÜöÖçÇâÂîÎûÛ"
export const SEARCH_FOLD_TO = "iiisSgGuUoOcCaAiIuU"

export function foldSearch(value: string): string {
  let out = ""
  for (const ch of normalizeSearchInput(value)) {
    const at = SEARCH_FOLD_FROM.indexOf(ch)
    out += at >= 0 ? SEARCH_FOLD_TO[at] : ch
  }
  return out.toLowerCase()
}

/** Katlanmış, tekrarsız arama kelimeleri (en fazla 6) */
export function searchTokens(value: string, max = 6): string[] {
  return Array.from(new Set(foldSearch(value).split(" ").filter(Boolean))).slice(0, max)
}
