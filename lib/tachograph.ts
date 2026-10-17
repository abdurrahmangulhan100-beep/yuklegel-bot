/**
 * Takograf sayacı hesapları (AETR / AB 561/2006 sürüş-dinlenme kuralları, özet).
 *
 * Sadece SÜRÜŞ kayıtları tutulur; kayıtlar arasındaki boşluklar mola / dinlenme sayılır.
 * Bu yaklaşım hem basit hem de unutulan "mola" tuşlarına karşı sağlamdır.
 *
 * Kurallar (özet):
 *  - Kesintisiz sürüş en fazla 4 saat 30 dk. Ardından 45 dk mola (ya da önce ≥15 dk, sonra ≥30 dk).
 *  - Günlük sürüş en fazla 9 saat (haftada en çok 2 kez 10 saate uzatılabilir).
 *  - Günlük dinlenme en az 11 saat (haftada en çok 3 kez 9 saate kısaltılabilir).
 *  - Haftalık sürüş en fazla 56 saat, art arda 2 haftada en fazla 90 saat.
 *
 * Uyarı: Bu hesap planlama amaçlıdır, yasal takografın yerini tutmaz.
 */

export const MIN = 60_000
export const HOUR = 3_600_000

export const LIMITS = {
  continuous: 4.5 * HOUR,
  breakFull: 45 * MIN,
  breakFirst: 15 * MIN,
  breakSecond: 30 * MIN,
  daily: 9 * HOUR,
  dailyExtended: 10 * HOUR,
  dailyRestRegular: 11 * HOUR,
  dailyRestReduced: 9 * HOUR,
  weekly: 56 * HOUR,
  biweekly: 90 * HOUR,
} as const

export type Segment = {
  id: string
  start: number
  /** null: sürüş devam ediyor */
  end: number | null
}

export type TachoState = {
  status: "driving" | "paused" | "idle"
  /** Son mola/dinlenmeden beri kesintisiz sürüş */
  contMs: number
  contRemaining: number
  /** Duruyorsa: son sürüşün bitişinden beri geçen süre */
  pauseMs: number
  /** Bu çalışma gününde (son ≥9 saatlik dinlenmeden beri) toplam sürüş */
  dailyMs: number
  dailyRemaining: number
  /** Bu hafta 9 saati aşan gün sayısı (10 saate uzatma hakkı kullanımı) */
  extendedDays: number
  weekMs: number
  prevWeekMs: number
  twoWeekMs: number
  /** Çalışma gününün başlangıcı */
  dayStart: number | null
  /** Günlük dinlenmeye en geç başlanması gereken an (11 saatlik dinlenme için) */
  restDeadline: number | null
  /** Sürüyorsa: mola vermen gereken an */
  mustBreakAt: number | null
  /** Sürüyorsa: günlük sürüş limitinin dolacağı an */
  dailyEndAt: number | null
}

export function startOfWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // Pazartesi = 0
  d.setDate(d.getDate() - day)
  return d.getTime()
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

export function analyze(segments: Segment[], now: number): TachoState {
  const segs = segments
    .map((s) => ({ start: s.start, end: s.end ?? now }))
    .filter((s) => s.end > s.start && s.start <= now)
    .sort((a, b) => a.start - b.start)

  const last = segments.length > 0 ? segments.reduce((a, b) => (a.start > b.start ? a : b)) : null
  const driving = Boolean(last && last.end === null)

  // Mola mantığı: bir boşluk (gap) kesintisiz sürüş sayacını sıfırlar mı?
  let cont = 0
  let split = false
  const applyGap = (gap: number) => {
    if (gap >= LIMITS.breakFull) {
      cont = 0
      split = false
    } else if (split && gap >= LIMITS.breakSecond) {
      cont = 0
      split = false
    } else if (!split && gap >= LIMITS.breakFirst) {
      split = true
    }
  }

  let daily = 0
  let dayStart: number | null = null
  let dayIndex = -1
  const dailyByDay: number[] = []
  const dayStarts: number[] = []

  let prevEnd: number | null = null
  for (const s of segs) {
    if (prevEnd !== null) {
      const gap = s.start - prevEnd
      applyGap(gap)
      if (gap >= LIMITS.dailyRestReduced) {
        daily = 0
        dayStart = null
      }
    }
    if (dayStart === null) {
      dayStart = s.start
      dayIndex++
      dailyByDay[dayIndex] = 0
      dayStarts[dayIndex] = s.start
    }
    const dur = s.end - s.start
    cont += dur
    daily += dur
    dailyByDay[dayIndex] += dur
    prevEnd = s.end
  }

  // Şu an duruyorsa, son sürüşten bu yana geçen süreyi de boşluk olarak değerlendir
  let pauseMs = 0
  if (!driving && prevEnd !== null) {
    pauseMs = Math.max(0, now - prevEnd)
    applyGap(pauseMs)
    if (pauseMs >= LIMITS.dailyRestReduced) {
      daily = 0
      dayStart = null
    }
  }

  // Haftalık toplamlar (takvim haftası: Pazartesi 00:00'dan itibaren)
  const w0 = startOfWeek(now)
  const pw0 = w0 - 7 * 24 * HOUR
  let weekMs = 0
  let prevWeekMs = 0
  for (const s of segs) {
    weekMs += overlap(s.start, s.end, w0, Infinity)
    prevWeekMs += overlap(s.start, s.end, pw0, w0)
  }

  // Bu hafta 9 saati aşan günler
  let extendedDays = 0
  dailyByDay.forEach((ms, i) => {
    if (dayStarts[i] >= w0 && ms > LIMITS.daily) extendedDays++
  })

  const contRemaining = Math.max(0, LIMITS.continuous - cont)
  const dailyRemaining = Math.max(0, LIMITS.daily - daily)

  return {
    status: driving ? "driving" : segs.length > 0 ? "paused" : "idle",
    contMs: cont,
    contRemaining,
    pauseMs,
    dailyMs: daily,
    dailyRemaining,
    extendedDays,
    weekMs,
    prevWeekMs,
    twoWeekMs: weekMs + prevWeekMs,
    dayStart,
    restDeadline: dayStart !== null ? dayStart + 24 * HOUR - LIMITS.dailyRestRegular : null,
    mustBreakAt: driving ? now + contRemaining : null,
    dailyEndAt: driving ? now + dailyRemaining : null,
  }
}

// ---------- biçimlendirme ----------

const p2 = (n: number) => String(n).padStart(2, "0")

/** 16200000 -> "4s 30dk" */
export function fmtHM(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} dk`
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

/** 16200000 -> "04:30:00" */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${p2(h)}:${p2(m)}:${p2(s)}`
}

/** Saat:dakika */
export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** "Bugün 14:35" / "Yarın 03:10" / "18 Eki 09:00" */
export function fmtDayTime(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  const a = new Date(now)
  a.setHours(0, 0, 0, 0)
  const b = new Date(ts)
  b.setHours(0, 0, 0, 0)
  const diff = Math.round((b.getTime() - a.getTime()) / (24 * HOUR))
  const t = fmtTime(ts)
  if (diff === 0) return `Bugün ${t}`
  if (diff === 1) return `Yarın ${t}`
  if (diff === -1) return `Dün ${t}`
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${t}`
}

// ---------- kayıt (localStorage) ----------

const KEY = "tacho_v1"

export function loadSegments(): Segment[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]")
    if (!Array.isArray(raw)) return []
    const cutoff = Date.now() - 15 * 24 * HOUR
    return raw
      .filter((s) => s && typeof s.start === "number" && (s.end === null || typeof s.end === "number"))
      .filter((s) => (s.end ?? Date.now()) > cutoff)
  } catch {
    return []
  }
}

export function saveSegments(segments: Segment[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(segments))
  } catch {
    // depolama kapalıysa sessizce geç
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
