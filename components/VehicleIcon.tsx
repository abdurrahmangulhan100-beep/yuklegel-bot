import { cn } from "@/lib/utils"

export type VehicleKind = "tumu" | "acil" | "tir" | "kamyon" | "frigo" | "kirkayak" | "acikdorse" | "dorse" | "damperli"

const fold = (s: string) =>
  s.replace(/İ/g, "i").replace(/I/g, "i").toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")

/** Araç yazısından (ör. "Damperli Tır", "10 Teker", "Frigo") ikon türünü bulur; bulunamazsa genel tır */
export function vehicleKind(vehicle?: string | null): VehicleKind {
  const f = fold(String(vehicle ?? ""))
  if (/da[nm]per|kisa dorse/.test(f)) return "damperli"
  if (/frigo|soguk|termokin/.test(f)) return "frigo"
  if (/kirkayak/.test(f)) return "kirkayak"
  if (/acik dorse/.test(f)) return "acikdorse"
  if (/dorse|lowbed|low bed/.test(f)) return "dorse"
  if (/kamyon|teker|pikap|pick|panel|van\b/.test(f)) return "kamyon"
  return "tir"
}

/** public/vehicles/*.webp görselleri (şeffaf arka planlı). Boyutu className (h-* / w-*) belirler, görsel kutuya sığdırılır. */
export function VehicleIcon({ vehicle, kind, className }: { vehicle?: string | null; kind?: VehicleKind; className?: string }) {
  const k = kind ?? vehicleKind(vehicle)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/vehicles/${k}.webp`} alt="" aria-hidden draggable={false} loading="lazy" decoding="async" className={cn("select-none object-contain", className)} />
  )
}
