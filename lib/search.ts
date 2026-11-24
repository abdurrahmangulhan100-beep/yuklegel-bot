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
