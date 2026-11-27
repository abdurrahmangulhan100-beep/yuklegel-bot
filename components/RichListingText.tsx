"use client"

// İlan metnini SATIR SATIR gösterir ve önemli kelimeleri renkle vurgular.
// Metin değiştirilmez: yalnızca ilanda aynen geçen ifadeler boyanır. Bulunamayan bilgi için hiçbir şey uydurulmaz.
import { Fragment, memo, type ReactNode } from "react"
import { Banknote, Clock, MapPin, Package, Phone, ShieldAlert, Truck, Weight, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

type Kind = "urgent" | "money" | "vehicle" | "weight" | "cargo" | "place" | "time" | "warn"

type Icon = React.ComponentType<{ className?: string }>

const STYLE: Record<Kind, { icon: Icon; mark: string; chip: string }> = {
  urgent: { icon: Zap, mark: "bg-red-500/15 text-red-700 dark:text-red-300", chip: "bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/25" },
  money: { icon: Banknote, mark: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25" },
  vehicle: { icon: Truck, mark: "bg-blue-500/15 text-blue-700 dark:text-blue-300", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/25" },
  weight: { icon: Weight, mark: "bg-violet-500/15 text-violet-700 dark:text-violet-300", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500/25" },
  cargo: { icon: Package, mark: "bg-amber-500/20 text-amber-800 dark:text-amber-300", chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/25" },
  place: { icon: MapPin, mark: "bg-sky-500/15 text-sky-700 dark:text-sky-300", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/25" },
  time: { icon: Clock, mark: "bg-orange-500/15 text-orange-700 dark:text-orange-300", chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/25" },
  warn: { icon: ShieldAlert, mark: "bg-rose-500/10 text-rose-700 dark:text-rose-300", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/25" },
}

// Türkçe/ASCII ve büyük/küçük harf farklarına dayanıklı desen ("PEŞİN", "pesin", "Peşin" hepsi eşleşir)
const CH: Record<string, string> = {
  i: "[iİıI]", ı: "[iİıI]", ş: "[şŞsS]", ç: "[çÇcC]", ğ: "[ğĞgG]", ö: "[öÖoO]", ü: "[üÜuU]",
}
const tr = (word: string) =>
  word
    .split("")
    .map((c) => {
      if (c === " ") return "\\s+"
      if (CH[c]) return CH[c]
      if (/[a-z]/.test(c)) return `[${c}${c.toUpperCase()}]`
      return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    })
    .join("")
const words = (list: string[]) => list.map(tr).join("|")
const B = "(?<![\\p{L}\\p{N}])" // kelime başı (Türkçe harfe duyarlı)
const E = "(?![\\p{L}\\p{N}])"

const RULES: { kind: Kind; re: string }[] = [
  // Acil / zaman
  { kind: "urgent", re: `${B}(?:${words(["acil", "acilen", "hemen", "şimdi yükleme", "ivedi"])})${E}` },
  { kind: "time", re: `${B}(?:${words(["bugün", "yarın", "bu gece", "bu akşam", "sabah", "akşam", "öğlen", "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi", "pazar", "haftaya"])})${E}` },
  // Para: 70000 TL, 70.000 ₺, 5 bin, peşin, vadeli...
  { kind: "money", re: `\\d[\\d.,]*\\s*(?:${words(["tl", "lira", "bin tl", "bin"])}|₺)${E}|₺\\s*\\d[\\d.,]*` },
  { kind: "money", re: `${B}(?:${words(["peşin", "indiği yerde", "teslimde", "vadeli", "çek", "senet", "kdv", "komisyon", "nakit", "havale", "fiyat", "ücret", "navlun", "pazarlık"])})${E}` },
  // Araç / dorse
  { kind: "vehicle", re: `${B}13[\\s.,]60${E}` },
  { kind: "vehicle", re: `${B}(?:${words(["açık dorse", "kapalı dorse", "kapalı kasa", "kapalı tenteli", "kapalı", "tenteli", "tırlık", "tır", "tir", "kamyonet", "kamyon", "panelvan", "frigo", "frigorifik", "soğutmalı", "termokin", "damperli", "damper", "lowbed", "low bed", "kırkayak", "çekici", "dorse", "kasa", "branda", "perdeli", "kayar perde", "platform", "konteyner", "tanker", "silobas", "devrilmeli", "jumbo", "römork", "kamyonlar", "araç", "boş araç"])})${E}` },
  // Tonaj / miktar
  { kind: "weight", re: `\\d+\\s*-\\s*\\d+\\s*(?:ton|tn)${E}|\\d[\\d.,]*\\s*(?:${words(["ton", "tonluk", "tn", "kg", "palet", "adet", "rulo", "torba", "çuval", "bigbag", "m3", "metreküp", "koli", "balya", "metre", "mt"])})${E}` },
  // Yük cinsi
  { kind: "cargo", re: `${B}(?:${words(["patates", "soğan", "kömür", "saman", "buğday", "arpa", "mısır", "çimento", "demir", "çelik", "boru", "profil", "bobin", "mobilya", "ev eşyası", "evden eve", "palet", "koli", "tekstil", "gıda", "seramik", "mermer", "kereste", "gübre", "yem", "şeker", "plastik", "ambalaj", "makine", "inşaat", "hafriyat", "çakıl", "tuğla", "elma", "portakal", "limon", "domates", "sebze", "meyve", "hububat", "ayçiçeği", "pamuk", "kağıt", "karton", "geri dönüşüm", "hurda", "köpük", "strafor", "koyun", "büyükbaş", "hayvan", "araç taşıma", "traktör", "iş makinesi", "gazbeton", "briket", "odun", "pelet", "lpg", "süt", "tavuk", "yumurta", "ilaç", "kimyasal", "boya", "lastik"])})${E}` },
  // Yer / yükleme-boşaltma
  { kind: "place", re: `${B}(?:${words(["yükleme", "yüklenecek", "yükleyecek", "indirme", "indirilecek", "boşaltma", "teslim", "depo", "depodan", "depoya", "fabrika", "fabrikadan", "liman", "antrepo", "organize", "osb", "sanayi", "tersane", "rampa", "forklift", "vinç", "vincli"])})${E}` },
  // Dikkat edilecek notlar
  { kind: "warn", re: `${B}(?:${words(["fatura", "irsaliye", "e-arşiv", "sigorta", "kantar", "kimlik", "dikkat", "uyarı", "sakın", "ayrı ayrı"])})${E}` },
]

// Tek regex: her kural bir yakalama grubu; hangi grup eşleştiyse o tür
const COMBINED = new RegExp(RULES.map((r) => `(${r.re})`).join("|"), "gu")

type Piece = { text: string; kind?: Kind }

export function tokenize(line: string): Piece[] {
  const out: Piece[] = []
  let last = 0
  COMBINED.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = COMBINED.exec(line)) !== null) {
    if (m[0] === "") { COMBINED.lastIndex++; continue }
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    let gi = 0
    for (let i = 1; i < m.length; i++) if (m[i] !== undefined) { gi = i - 1; break }
    out.push({ text: m[0], kind: RULES[gi].kind })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out
}

/** Satırın solundaki ikon: telefon > acil > para > araç > tonaj > yük > zaman > yer */
const LINE_PRIORITY: Kind[] = ["urgent", "money", "vehicle", "weight", "cargo", "time", "place", "warn"]
const PHONE_LINE = /(?:\d[\s.*\-]*){6,}|\*{3}/

/** Kartın üstündeki özet çipleri: ilanda geçen ifadelerin kendisi (tahmin yok), en çok 6 tane */
export function summaryChips(text: string, max = 6): { label: string; kind: Kind }[] {
  const seen = new Set<string>()
  const chips: { label: string; kind: Kind }[] = []
  const order = new Map(LINE_PRIORITY.map((k, i) => [k, i]))
  const all: { label: string; kind: Kind }[] = []
  for (const line of text.split("\n")) {
    for (const p of tokenize(line)) {
      if (!p.kind || p.kind === "place") continue
      const label = p.text.replace(/\s+/g, " ").trim()
      const key = label.toLocaleLowerCase("tr-TR")
      if (seen.has(key)) continue
      seen.add(key)
      all.push({ label, kind: p.kind })
    }
  }
  all.sort((a, b) => (order.get(a.kind) ?? 9) - (order.get(b.kind) ?? 9))
  for (const c of all) { if (chips.length < max) chips.push(c) }
  return chips
}

export const SummaryChips = memo(function SummaryChips({ text }: { text: string }) {
  const chips = summaryChips(text)
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => {
        const S = STYLE[c.kind]
        const Icon = S.icon
        return (
          <span key={c.kind + c.label} className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold ring-1", S.chip)}>
            <Icon aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{c.label}</span>
          </span>
        )
      })}
    </div>
  )
})

type Props = {
  text: string
  /** Arama kelimesini ayrıca işaretlemek için (LoadCard'daki highlightMatch) */
  renderPlain?: (s: string) => ReactNode
  className?: string
  textClass?: string
}

/** Metni satır satır gösterir. Her satırın solunda içeriğine uygun küçük ikon, içinde renkli vurgular. */
export const RichListingText = memo(function RichListingText({ text, renderPlain, className, textClass }: Props) {
  const lines = text.split("\n")
  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, i) => {
        if (!line.trim()) return null
        const pieces = tokenize(line)
        const kinds = new Set(pieces.map((p) => p.kind).filter(Boolean))
        const lineKind = LINE_PRIORITY.find((k) => kinds.has(k))
        const isPhone = PHONE_LINE.test(line) && !kinds.has("money") && !kinds.has("weight")
        const Icon: Icon | null = isPhone ? Phone : lineKind ? STYLE[lineKind].icon : null
        const tone = isPhone ? "text-muted-foreground" : lineKind === "urgent" ? "text-red-500" : lineKind === "money" ? "text-emerald-600" : lineKind === "vehicle" ? "text-blue-600" : lineKind === "weight" ? "text-violet-600" : lineKind === "cargo" ? "text-amber-600" : lineKind === "time" ? "text-orange-600" : lineKind === "place" ? "text-sky-600" : "text-rose-500"
        return (
          <div key={i} className="flex items-start gap-2">
            <span aria-hidden className="mt-[3px] grid size-4 shrink-0 place-items-center">
              {Icon ? <Icon className={cn("size-[15px]", tone)} /> : <i className="size-1 rounded-full bg-muted-foreground/40" />}
            </span>
            <p className={cn("min-w-0 flex-1 break-words text-[14px] font-medium leading-[1.55] text-foreground", textClass)}>
              {pieces.map((p, j) =>
                p.kind ? (
                  <mark key={j} className={cn("rounded px-1 py-px font-bold", STYLE[p.kind].mark)}>
                    {renderPlain ? renderPlain(p.text) : p.text}
                  </mark>
                ) : (
                  <Fragment key={j}>{renderPlain ? renderPlain(p.text) : p.text}</Fragment>
                )
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
})
