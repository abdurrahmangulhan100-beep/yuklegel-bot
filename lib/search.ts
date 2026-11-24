/**
 * Turkish-aware search helpers for PostgREST ilike filters.
 * Supports both native Turkish letters and ASCII keyboard input.
 */
const TURKISH_VARIANTS: Record<string, string> = {
  i: "ı", s: "ş", g: "ğ", u: "ü", o: "ö", c: "ç",
}

export function normalizeSearchInput(value: string): string {
  return value
    .replace(/[,%()\\"_*:\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchVariants(token: string, max = 8): string[] {
  const clean = token.trim()
  if (!clean) return []

  const lowerClean = clean.toLocaleLowerCase("tr-TR")
  const variants = new Set<string>([clean, lowerClean])
  const chars = Array.from(lowerClean)
  const expandable = chars
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => TURKISH_VARIANTS[char])

  // Keep PostgREST URLs bounded while trying the most common Turkish spellings.
  for (const item of expandable.slice(0, 3)) {
    const snapshot = Array.from(variants)
    for (const variant of snapshot) {
      const lower = Array.from(variant)
      lower[item.index] = TURKISH_VARIANTS[item.char]
      variants.add(lower.join(""))
      if (variants.size >= max) break
    }
    if (variants.size >= max) break
  }

  return Array.from(variants).slice(0, max)
}
