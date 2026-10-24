import { cn } from "@/lib/utils"

export type VehicleKind = "tumu" | "acil" | "tir" | "kamyon" | "frigo" | "kirkayak" | "dorse" | "damperli"

/** İkon renk tonu: tek yerden değişir. Kartlarda koyu lacivert/mavi, seçili filtrede beyaz (currentColor) */
export const VEHICLE_ICON_COLOR = "text-[#1f4a75]"

/** public/vehicles/*.png dosyalarının en/boy oranı (genişlik ÷ yükseklik) */
const RATIO: Record<VehicleKind, number> = {"tumu": 2.543, "acil": 2.03, "tir": 3.453, "kamyon": 1.964, "frigo": 1.832, "kirkayak": 2.496, "dorse": 7.058, "damperli": 1.767}

const fold = (s: string) =>
  s.replace(/İ/g, "i").replace(/I/g, "i").toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")

/** Araç yazısından (ör. "Damperli Tır", "10 Teker", "Frigo") ikon türünü bulur; bulunamazsa genel tır */
export function vehicleKind(vehicle?: string | null): VehicleKind {
  const f = fold(String(vehicle ?? ""))
  if (/damper/.test(f)) return "damperli"
  if (/frigo|soguk|termokin/.test(f)) return "frigo"
  if (/kirkayak/.test(f)) return "kirkayak"
  if (/dorse|lowbed|low bed/.test(f)) return "dorse"
  if (/kamyon|teker|pikap|pick|panel|van\b/.test(f)) return "kamyon"
  return "tir"
}

/**
 * Araç türüne göre dolu (silüet) ikon. PNG, maske olarak kullanıldığı için rengi currentColor'dan gelir:
 * `className` ile hem boyut (h-* / w-*) hem renk (text-*) verilebilir. Yalnızca birini verirsen diğer boyut orandan hesaplanır.
 */
export function VehicleIcon({ vehicle, kind, className }: { vehicle?: string | null; kind?: VehicleKind; className?: string }) {
  const k = kind ?? vehicleKind(vehicle)
  const url = `url(/vehicles/${k}.png)`
  return (
    <span
      role="img"
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", VEHICLE_ICON_COLOR, className)}
      style={{ aspectRatio: String(RATIO[k]), WebkitMaskImage: url, maskImage: url, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskPosition: "center", maskPosition: "center" }}
    />
  )
}
