"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, BedDouble, Coffee, Info, Play, Plus, Square, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HOUR,
  LIMITS,
  MIN,
  analyze,
  fmtClock,
  fmtDayTime,
  fmtHM,
  fmtTime,
  loadSegments,
  newId,
  saveSegments,
  type Segment,
} from "@/lib/tachograph"

const pad = (n: number) => String(n).padStart(2, "0")
const toInput = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const START_OFFSETS = [
  { label: "Şimdi", min: 0 },
  { label: "5 dk önce", min: 5 },
  { label: "15 dk önce", min: 15 },
  { label: "30 dk önce", min: 30 },
]

export function TachographTool() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [offset, setOffset] = useState(0)
  const [showLog, setShowLog] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [mStart, setMStart] = useState(() => toInput(Date.now() - 2 * HOUR))
  const [mEnd, setMEnd] = useState(() => toInput(Date.now() - HOUR))
  const [mError, setMError] = useState<string | null>(null)
  const alertLevel = useRef(0)

  useEffect(() => {
    setSegments(loadSegments())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveSegments(segments)
  }, [segments, ready])

  // Saniyelik sayaç (sekme gizliyken tarayıcı zaten yavaşlatır)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const st = useMemo(() => analyze(segments, now), [segments, now])
  const driving = st.status === "driving"

  // Titreşimli uyarı (destekleyen cihazlarda)
  useEffect(() => {
    if (!driving) {
      alertLevel.current = 0
      return
    }
    const vibrate = (p: number | number[]) => {
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p)
      } catch {
        // desteklenmiyor
      }
    }
    if (st.contRemaining <= 0 && alertLevel.current < 2) {
      alertLevel.current = 2
      vibrate([400, 200, 400, 200, 400])
    } else if (st.contRemaining <= 15 * MIN && alertLevel.current < 1) {
      alertLevel.current = 1
      vibrate(300)
    }
  }, [driving, st.contRemaining])

  const start = useCallback(() => {
    const ts = Date.now() - offset * MIN
    setSegments((prev) => {
      if (prev.some((s) => s.end === null)) return prev
      // Yeni başlangıç, önceki kayıtla çakışmasın
      const lastEnd = prev.reduce((m, s) => Math.max(m, s.end ?? 0), 0)
      return [...prev, { id: newId(), start: Math.max(ts, lastEnd), end: null }]
    })
    setOffset(0)
  }, [offset])

  const stop = useCallback(() => {
    const ts = Date.now()
    setSegments((prev) => prev.map((s) => (s.end === null ? { ...s, end: ts } : s)))
  }, [])

  const remove = (id: string) => {
    if (!confirm("Bu sürüş kaydı silinsin mi?")) return
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }

  const clearAll = () => {
    if (!confirm("Tüm takograf kayıtları silinsin mi? Bu işlem geri alınamaz.")) return
    setSegments([])
  }

  const addManual = () => {
    const a = new Date(mStart).getTime()
    const b = new Date(mEnd).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b)) return setMError("Tarih ve saatleri doldurun.")
    if (b <= a) return setMError("Bitiş, başlangıçtan sonra olmalı.")
    if (b > Date.now() + MIN) return setMError("Bitiş zamanı gelecekte olamaz.")
    if (b - a > 12 * HOUR) return setMError("Tek kayıt 12 saatten uzun olamaz.")
    if (segments.some((s) => a < (s.end ?? Date.now()) && b > s.start)) return setMError("Bu aralık başka bir kayıtla çakışıyor.")
    setSegments((prev) => [...prev, { id: newId(), start: a, end: b }])
    setMError(null)
    setManualOpen(false)
  }

  // ---- halka ----
  const paused = st.status === "paused"
  const breakDone = paused && st.pauseMs >= LIMITS.breakFull
  const ringFrac = driving
    ? Math.min(1, st.contMs / LIMITS.continuous)
    : paused
      ? Math.min(1, st.pauseMs / LIMITS.breakFull)
      : 0
  const ringColor = driving
    ? ringFrac >= 1
      ? "#dc2626"
      : ringFrac >= 0.8
        ? "#f59e0b"
        : "#10b981"
    : "#315d83"
  const R = 92
  const C = 2 * Math.PI * R

  const banner = driving
    ? st.contRemaining <= 0
      ? { tone: "border-red-300 bg-red-50 text-red-800", text: "4,5 saat doldu. Güvenli bir yerde durup en az 45 dk mola verin." }
      : st.contRemaining <= 15 * MIN
        ? { tone: "border-amber-300 bg-amber-50 text-amber-900", text: `Mola yaklaşıyor: ${fmtHM(st.contRemaining)} sonra durmanız gerekiyor.` }
        : st.dailyRemaining <= 30 * MIN
          ? { tone: "border-amber-300 bg-amber-50 text-amber-900", text: `Günlük 9 saatlik sürüş limitine ${fmtHM(st.dailyRemaining)} kaldı.` }
          : null
    : null

  const bars: { label: string; value: number; max: number; note?: string }[] = [
    { label: "Bugünkü sürüş", value: st.dailyMs, max: LIMITS.daily, note: st.extendedDays < 2 ? `10 saate uzatma hakkı: ${2 - st.extendedDays}` : "Uzatma hakkı bitti" },
    { label: "Bu hafta", value: st.weekMs, max: LIMITS.weekly },
    { label: "Son 2 hafta", value: st.twoWeekMs, max: LIMITS.biweekly },
  ]

  const sorted = useMemo(() => [...segments].sort((a, b) => b.start - a.start), [segments])

  return (
    <div className="space-y-4">
      {/* Sayaç kartı */}
      <section className="rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)] sm:p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
          <div className="relative size-[220px] shrink-0">
            <svg viewBox="0 0 220 220" className="size-full -rotate-90">
              <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
              <circle
                cx="110"
                cy="110"
                r={R}
                fill="none"
                stroke={ringColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ringFrac)}
                style={{ transition: "stroke-dashoffset 0.8s linear, stroke 0.4s" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {driving && (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Molaya kalan</span>
                  <span className="text-[34px] font-extrabold leading-none tabular-nums">{fmtClock(st.contRemaining)}</span>
                  <span className="mt-1.5 text-xs text-white/60">Sürüş: {fmtHM(st.contMs)}</span>
                </>
              )}
              {paused && (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{breakDone ? "Mola tamam" : "Mola süresi"}</span>
                  <span className="text-[34px] font-extrabold leading-none tabular-nums">{fmtClock(st.pauseMs)}</span>
                  <span className="mt-1.5 text-xs text-white/60">
                    {breakDone ? "Sürüşe başlayabilirsiniz" : `Hedef: 45 dk (kalan ${fmtHM(LIMITS.breakFull - st.pauseMs)})`}
                  </span>
                </>
              )}
              {st.status === "idle" && (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Hazır</span>
                  <span className="text-[34px] font-extrabold leading-none tabular-nums">04:30:00</span>
                  <span className="mt-1.5 text-xs text-white/60">Kesintisiz sürüş hakkı</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full max-w-xs space-y-3">
            {driving ? (
              <button
                onClick={stop}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-[#122c4a] shadow-lg transition-transform active:scale-[0.98]"
              >
                <Square className="size-5 fill-[#122c4a]" /> Sürüşü Bitir / Mola
              </button>
            ) : (
              <>
                <button
                  onClick={start}
                  disabled={!ready}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#d64526] text-base font-bold text-white shadow-lg shadow-black/20 transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                  <Play className="size-5 fill-white" /> Sürüşe Başla
                </button>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {START_OFFSETS.map((o) => (
                    <button
                      key={o.min}
                      onClick={() => setOffset(o.min)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                        offset === o.min ? "bg-white text-[#122c4a]" : "bg-white/10 text-white/80 hover:bg-white/15"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-white/50">Tuşa basmayı unuttuysanız başlangıcı geriye alabilirsiniz.</p>
              </>
            )}

            {driving && (
              <dl className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-white/10 px-2 py-2.5">
                  <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/55"><Coffee className="size-3" /> Mola saati</dt>
                  <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{st.mustBreakAt ? fmtTime(st.mustBreakAt) : "-"}</dd>
                </div>
                <div className="rounded-xl bg-white/10 px-2 py-2.5">
                  <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/55"><BedDouble className="size-3" /> 9 sa dolar</dt>
                  <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{st.dailyEndAt ? fmtTime(st.dailyEndAt) : "-"}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </section>

      {banner && (
        <div className={cn("flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm font-semibold", banner.tone)} role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {banner.text}
        </div>
      )}

      {/* Limitler */}
      <section className="space-y-4 rounded-2xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-5">
        {bars.map((b) => {
          const frac = Math.min(1, b.value / b.max)
          const tone = frac >= 1 ? "bg-red-500" : frac >= 0.85 ? "bg-amber-500" : "bg-emerald-500"
          return (
            <div key={b.label}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="font-bold text-[#122c4a]">{b.label}</span>
                <span className="tabular-nums text-[#627d98]">
                  <strong className="text-[#122c4a]">{fmtHM(b.value)}</strong> / {fmtHM(b.max)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f6]">
                <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${frac * 100}%` }} />
              </div>
              {b.note && <p className="mt-1 text-[11px] text-[#8da0b2]">{b.note}</p>}
            </div>
          )
        })}

        {st.restDeadline && st.dayStart && (
          <div className="flex items-start gap-2.5 rounded-xl bg-[#f6f9fc] p-3 text-xs leading-relaxed text-[#334e68]">
            <BedDouble className="mt-0.5 size-4 shrink-0 text-[#315d83]" />
            <span>
              Çalışma gününüz <strong>{fmtDayTime(st.dayStart, now)}</strong> civarında başladı. 11 saatlik günlük dinlenmeye en geç{" "}
              <strong>{fmtDayTime(st.restDeadline, now)}</strong> itibarıyla başlamanız gerekir (9 saatlik kısaltılmış dinlenmede 2 saat daha esner).
            </span>
          </div>
        )}
      </section>

      {/* Kayıtlar */}
      <section className="rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
        <button onClick={() => setShowLog((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5 text-left" aria-expanded={showLog}>
          <span className="text-sm font-bold text-[#122c4a]">Sürüş kayıtları <span className="font-medium text-[#8da0b2]">({segments.length})</span></span>
          <span className="text-xs font-semibold text-[#315d83]">{showLog ? "Gizle" : "Göster"}</span>
        </button>
        {showLog && (
          <div className="space-y-3 border-t border-[#edf0f3] p-4">
            {sorted.length === 0 ? (
              <p className="text-xs text-[#8da0b2]">Henüz kayıt yok.</p>
            ) : (
              <ul className="divide-y divide-[#edf0f3]">
                {sorted.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[#122c4a]">
                        {fmtDayTime(s.start, now)} → {s.end ? fmtTime(s.end) : "devam ediyor"}
                      </div>
                      <div className="text-[#718397]">{fmtHM((s.end ?? now) - s.start)} sürüş</div>
                    </div>
                    <button onClick={() => remove(s.id)} aria-label="Kaydı sil" className="grid size-9 place-items-center rounded-full text-[#b4c1ce] hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!manualOpen ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setManualOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#dbe3ec] px-3.5 text-xs font-semibold text-[#334e68] hover:bg-[#f5f7fa]">
                  <Plus className="size-4" /> Geçmiş sürüş ekle
                </button>
                {segments.length > 0 && (
                  <button onClick={clearAll} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Tümünü sil
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 rounded-xl bg-[#f6f9fc] p-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block text-[11px] font-semibold text-[#627d98]">
                    Başlangıç
                    <input type="datetime-local" value={mStart} onChange={(e) => setMStart(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#dbe3ec] bg-white px-2.5 text-base text-[#122c4a] md:text-sm" />
                  </label>
                  <label className="block text-[11px] font-semibold text-[#627d98]">
                    Bitiş
                    <input type="datetime-local" value={mEnd} onChange={(e) => setMEnd(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#dbe3ec] bg-white px-2.5 text-base text-[#122c4a] md:text-sm" />
                  </label>
                </div>
                {mError && <p className="text-xs font-semibold text-red-600">{mError}</p>}
                <div className="flex gap-2">
                  <button onClick={addManual} className="h-10 rounded-xl bg-[#122c4a] px-4 text-xs font-semibold text-white hover:bg-[#1a3d68]">Ekle</button>
                  <button onClick={() => { setManualOpen(false); setMError(null) }} className="h-10 rounded-xl px-3 text-xs font-semibold text-[#627d98] hover:bg-white">Vazgeç</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Kurallar */}
      <section className="rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_2px_rgba(18,44,74,0.04)]">
        <button onClick={() => setShowRules((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5 text-left" aria-expanded={showRules}>
          <span className="flex items-center gap-2 text-sm font-bold text-[#122c4a]"><Info className="size-4 text-[#315d83]" /> Sürüş ve dinlenme kuralları</span>
          <span className="text-xs font-semibold text-[#315d83]">{showRules ? "Gizle" : "Göster"}</span>
        </button>
        {showRules && (
          <ul className="space-y-2 border-t border-[#edf0f3] p-4 text-xs leading-relaxed text-[#334e68]">
            <li><strong>Kesintisiz sürüş:</strong> en fazla 4 saat 30 dk. Sonrasında 45 dk mola; mola bölünecekse önce en az 15 dk, sonra en az 30 dk verilir.</li>
            <li><strong>Günlük sürüş:</strong> en fazla 9 saat; haftada en çok 2 kez 10 saate çıkarılabilir.</li>
            <li><strong>Günlük dinlenme:</strong> en az 11 saat; haftada en çok 3 kez 9 saate kısaltılabilir.</li>
            <li><strong>Haftalık sürüş:</strong> en fazla 56 saat; art arda iki haftada en fazla 90 saat.</li>
            <li className="text-[#8da0b2]">Bu sayaç sizin girdiğiniz kayıtlara göre planlama yardımcısıdır. Resmî kayıt takografınızdır; denetimde takograf verileri esas alınır. Kayıtlar yalnızca bu cihazda saklanır.</li>
          </ul>
        )}
      </section>
    </div>
  )
}
