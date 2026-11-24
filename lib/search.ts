/**
 * Turkish-aware search helpers for PostgREST ilike filters.
 * Both ASCII and Turkish spellings are expanded from the same canonical form:
 * "soguk" and "soğuk" therefore search the same set of spellings.
 */
const TURKISH_TO_ASCII: Record<string, string> = {
  "ı": "i",
  "ş": "s",
  "ğ": "g",
  "ü": "u",
  "ö": "o",
  "ç": "c",
}

const ASCII_TO_TURKISH: Record<string, string> = {
  i: "ı",
  s: "ş",
  g: "ğ",
  u: "ü",
  o: "ö",
  c: "ç",
}

export function normalizeSearchInput(value: string): string {
  return value
    .replace(/[,%()\\"_*:\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const canonicalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ışğüöç]/g, (char) => TURKISH_TO_ASCII[char] ?? char)

/**
 * Produces equivalent Turkish spellings, bounded to keep PostgREST URLs small.
 * The default limit covers every spelling for common words with up to four
 * Turkish-variant characters. Postgres ILIKE handles letter casing.
 */
export function searchVariants(token: string, max = 16): string[] {
  const clean = token.trim()
  const limit = Math.max(1, Math.floor(max))
  if (!clean) return []

  const lower = clean.toLocaleLowerCase("tr-TR")
  const canonical = canonicalize(clean)
  const chars = Array.from(canonical)
  const positions = chars
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => Boolean(ASCII_TO_TURKISH[char]))

  if (limit === 1) return [clean]
  const variants = new Set<string>([canonical])

  // Generate combinations from the canonical spelling, not from the user's
  // original spelling. This makes matching symmetric in both directions.
  const combinations = 2 ** positions.length
  for (let mask = 1; mask < combinations && variants.size < limit; mask++) {
    const candidate = [...chars]
    positions.forEach(({ char, index }, bit) => {
      if (mask & (1 << bit)) candidate[index] = ASCII_TO_TURKISH[char]
    })
    variants.add(candidate.join(""))
  }

  return Array.from(variants).slice(0, limit)
}
