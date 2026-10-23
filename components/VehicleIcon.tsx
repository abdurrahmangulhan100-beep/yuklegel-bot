import { cn } from "@/lib/utils"

export type VehicleKind = "tir" | "kamyon" | "frigo" | "kirkayak" | "dorse" | "damperli"

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

function Wheel({ x, r = 1.7 }: { x: number; r?: number }) {
  return <circle cx={x} cy={17.5} r={r} />
}

/** Araç türüne göre çizgi ikon (lucide stiliyle uyumlu, currentColor kullanır) */
export function VehicleIcon({ vehicle, kind, className }: { vehicle?: string | null; kind?: VehicleKind; className?: string }) {
  const k = kind ?? vehicleKind(vehicle)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-4", className)}>
      {k === "tir" && (
        <>
          <rect x="1" y="5" width="13" height="10" rx="1.2" />
          <path d="M16 9h2.5L22 12v3h-6z" />
          <path d="M14 13h2" />
          <Wheel x={5} /><Wheel x={9.5} /><Wheel x={19} />
        </>
      )}
      {k === "kamyon" && (
        <>
          <rect x="2" y="6" width="11" height="9" rx="1.2" />
          <path d="M13 9.5h4.2L21 12.5V15H13" />
          <Wheel x={6.5} /><Wheel x={17.5} />
        </>
      )}
      {k === "frigo" && (
        <>
          <rect x="1" y="5" width="13" height="10" rx="1.2" />
          <path d="M16 9h2.5L22 12v3h-6z" />
          <path d="M7.5 7v6M4.9 8.5l5.2 3M4.9 11.5l5.2-3" />
          <Wheel x={5} /><Wheel x={9.5} /><Wheel x={19} />
        </>
      )}
      {k === "kirkayak" && (
        <>
          <rect x="1" y="6" width="14" height="8" rx="1.2" />
          <path d="M15.5 9h3L22 12v3h-6.5z" />
          <Wheel x={3.5} r={1.3} /><Wheel x={6.8} r={1.3} /><Wheel x={10.1} r={1.3} /><Wheel x={13.4} r={1.3} /><Wheel x={19} r={1.5} />
        </>
      )}
      {k === "dorse" && (
        <>
          <path d="M1.5 15h21" />
          <rect x="3.5" y="7" width="13" height="8" rx="1" />
          <path d="M8 7v8M12 7v8" />
          <path d="M2 15v3" />
          <Wheel x={17} r={1.5} /><Wheel x={20.5} r={1.5} />
        </>
      )}
      {k === "damperli" && (
        <>
          <path d="M2 6.5l11.5 3V15H2z" />
          <path d="M13.5 10.5h3.7L21 13v2h-7.5" />
          <Wheel x={6} /><Wheel x={10.5} /><Wheel x={18} />
        </>
      )}
    </svg>
  )
}
