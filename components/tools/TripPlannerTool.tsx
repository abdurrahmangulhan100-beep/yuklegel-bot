"use client"

import { useEffect, useMemo, useState } from "react"
import { BedDouble, Coffee, Flag, MapPinned, Route as RouteIcon, Timer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { HOUR, LIMITS, MIN, fmtDayTime, fmtHM } from "@/lib/tachograph"

const pad = (n: number) => String(n).padStart(2, "0")
const toInput = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const num = (v: string) => {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

type Stop = { kind: "break" | "rest"; at: number; durationMs: number; km: number }

/** Mola ve dinlenme kurallarını uygulayarak varış zamanını simüle eder */
function plan(startTs: number, km: number, speed: number, withRules: boolean, waitStartMin: number, waitEndMin: number) {
  const driveTotal = speed > 0 ? (km / speed) * HOUR : 0
  let t = startTs + waitStartMin * MIN
  let remaining = driveTotal
  let cont = 0
  let daily = 0
  let doneKm = 0
  const stops: Stop[] = []

  if (!withRules) {
    t += remaining
    remaining = 0
    doneKm = km
  }

  let guard = 0
  while (remaining > 0 && guard++ < 500) {
    const step = Math.min(remaining, LIMITS.continuous - cont, LIMITS.daily - daily)
    t += step
    cont += step
    daily += step
    remaining -= step
    doneKm += (step / HOUR) * speed
    if (remaining <= 0) break
    if (daily >= LIMITS.daily - 1) {
      stops.push({ kind: "rest", at: t, durationMs: LIMITS.dailyRestRegular, km: doneKm })
      t += LIMITS.dailyRestRegular
      cont = 0
      daily = 0
    } else {
      stops.push({ kind: "break", at: t, durationMs: LIMITS.breakFull, km: doneKm })
      t += LIMITS.breakFull
      cont = 0
    }
  }

  const arrival = t + waitEndMin * MIN
  return { driveTotal, arrival, stops, total: arrival - startTs }
}

export function TripPlannerTool() {
  const [km, setKm] = useState("500")
  const [speed, setSpeed] = useState("70")
  const [start, setStart] = useState("")
  const [rules, setRules] = useState(true)
  const [waitStart, setWaitStart] = useState("0")
  const [waitEnd, setWaitEnd] = useState("0")

  useEffect(() => {
    const d = new Date(Date.now() + 10 * MIN)
    d.setSeconds(0, 0)
    setStart(toInput(d.getTime()))
  }, [])

  const result = useMemo(() => {
    const startTs = start ? new Date(start).getTime() : NaN
    if (!Number.isFinite(startTs) || num(km) <= 0 || num(speed) <= 0) return null
    return plan(startTs, num(km), num(speed), rules, num(waitStart), num(waitEnd))
  }, [start, km, speed, rules, waitStart, waitEnd])

  const breaks = result?.stops.filter((s) => s.kind === "break").length ?? 0
  const rests = result?.stops.filter((s) => s.kind === "rest").length ?? 0
  const inputClass = "h-11 border-[#d9e2ec] bg-[#f8fafc] text-base focus:bg-white md:text-sm"

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section className="space-y-4 rounded-2xl border border-[#e4e9ef] bg-white p-5 shadow-sm lg:col-span-5">
        <h2 className="text-sm font-bold text-[#122c4a]">Yolculuk bilgileri</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-[#334e68]">
            Mesafe (km)
            <Input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} className={cn(inputClass, "mt-1.5")} />
          </label>
          <label className="block text-xs font-semibold text-[#334e68]">
            Ort. hız (km/sa)
            <Input inputMode="decimal" value={speed} onChange={(e) => setSpeed(e.target.value)} className={cn(inputClass, "mt-1.5")} />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["Şehir içi yoğun", "45"],
            ["Karma yol", "60"],
            ["Otoyol / tır", "75"],
          ].map(([label, v]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSpeed(v)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                speed === v ? "border-[#122c4a] bg-[#122c4a] text-white" : "border-[#e0e6ed] bg-white text-[#627d98] hover:border-[#c4d0dc]"
              )}
            >
              {label} · {v}
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold text-[#334e68]">
          Yola çıkış zamanı
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border border-[#d9e2ec] bg-[#f8fafc] px-2.5 text-base text-[#122c4a] focus:bg-white md:text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-[#334e68]">
            Yükleme bekleme (dk)
            <Input inputMode="numeric" value={waitStart} onChange={(e) => setWaitStart(e.target.value)} className={cn(inputClass, "mt-1.5")} />
          </label>
          <label className="block text-xs font-semibold text-[#334e68]">
            Boşaltma bekleme (dk)
            <Input inputMode="numeric" value={waitEnd} onChange={(e) => setWaitEnd(e.target.value)} className={cn(inputClass, "mt-1.5")} />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f6f9fc] p-3">
          <input type="checkbox" checked={rules} onChange={(e) => setRules(e.target.checked)} className="mt-0.5 size-4 accent-[#122c4a]" />
          <span className="text-xs leading-relaxed text-[#334e68]">
            <strong className="text-[#122c4a]">Zorunlu mola ve dinlenmeleri hesaba kat</strong>
            <br />4,5 saatte 45 dk mola, 9 saat sürüşte 11 saat dinlenme.
          </span>
        </label>
      </section>

      <section className="space-y-4 lg:col-span-7">
        {!result ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-10 text-center text-sm text-[#8da0b2]">Mesafe, hız ve çıkış zamanını girin.</div>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)] sm:p-6">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                <Flag className="size-3.5" /> Tahmini varış
              </div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{fmtDayTime(result.arrival)}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini icon={Timer} label="Sürüş" value={fmtHM(result.driveTotal)} />
                <Mini icon={Coffee} label="Mola" value={rules ? `${breaks} adet` : "-"} />
                <Mini icon={BedDouble} label="Dinlenme" value={rules ? `${rests} adet` : "-"} />
              </div>
              <p className="mt-3 text-xs text-white/60">Toplam yolculuk süresi: {fmtHM(result.total)}</p>
            </div>

            {rules && result.stops.length > 0 && (
              <div className="rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#122c4a]">
                  <MapPinned className="size-4 text-[#315d83]" /> Planlı duraklar
                </h3>
                <ol className="space-y-0">
                  {result.stops.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn("grid size-8 place-items-center rounded-full", s.kind === "rest" ? "bg-[#eef4f8] text-[#315d83]" : "bg-amber-50 text-amber-600")}>
                          {s.kind === "rest" ? <BedDouble className="size-4" /> : <Coffee className="size-4" />}
                        </span>
                        {i < result.stops.length - 1 && <span className="my-1 w-px flex-1 bg-[#e4e9ef]" />}
                      </div>
                      <div className="pb-4">
                        <div className="text-sm font-bold text-[#122c4a]">
                          {s.kind === "rest" ? "Günlük dinlenme" : "Mola"} · {fmtDayTime(s.at)}
                        </div>
                        <div className="text-xs text-[#718397]">
                          Yaklaşık {Math.round(s.km)}. km · {fmtHM(s.durationMs)} bekleme
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl bg-[#f6f9fc] p-3 text-xs leading-relaxed text-[#627d98]">
              <RouteIcon className="mt-0.5 size-4 shrink-0 text-[#8da0b2]" />
              Hesap sabit ortalama hıza göre yapılır; trafik, hava, gümrük ve yakıt molaları süreyi uzatabilir. Mola kuralları kesintisiz sürüşün sıfırdan başladığı varsayımıyla uygulanır.
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Mini({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/55">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-extrabold tabular-nums sm:text-base">{value}</div>
    </div>
  )
}
