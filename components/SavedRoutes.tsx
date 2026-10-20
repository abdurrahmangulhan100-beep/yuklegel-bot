"use client"

import { useEffect, useMemo, useState } from "react"
import { Crown, MapPin, Plus, X, ArrowRight } from "lucide-react"
import { usePremium } from "@/components/PremiumProvider"
import { openPremium } from "@/lib/premium"
import type { Load } from "@/components/LoadCard"

type SavedRoute = { id: string; from: string; to: string; seenAt: number }

const KEY = "saved_routes"
const MAX_ROUTES = 5

const norm = (s?: string) =>
  (s || "").toLocaleLowerCase("tr").replace(/[^a-zçğıöşü0-9 ]/g, "").trim()

const matches = (value: string | undefined, city: string | undefined, query: string) =>
  !query || norm(value).includes(query) || norm(city).includes(query)

function readRoutes(): SavedRoute[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function writeRoutes(routes: SavedRoute[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(routes))
  } catch {}
}

/** Premium: sık bakılan güzergâhları kaydeder, son bakıştan sonra gelen yeni ilanları rozetle gösterir. */
export function SavedRoutes({ loads, onCitySearch }: { loads: Load[]; onCitySearch?: (city: string) => void }) {
  const { isPremium, loading } = usePremium()
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [adding, setAdding] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  useEffect(() => {
    setRoutes(readRoutes())
  }, [])

  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const r of routes) {
      const f = norm(r.from)
      const t = norm(r.to)
      result[r.id] = loads.filter(
        (l) =>
          !!l.createdAt &&
          Date.parse(l.createdAt) > r.seenAt &&
          matches(l.from, l.fromCity, f) &&
          matches(l.to, l.toCity, t)
      ).length
    }
    return result
  }, [routes, loads])

  if (loading) return null

  if (!isPremium) {
    return (
      <button
        onClick={openPremium}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-[#e4e9ef] bg-white p-3 text-left shadow-xs active:scale-[0.99]"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff6e5] text-[#d98a00]">
          <Crown className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#122c4a]">Kayıtlı Güzergâhlar</span>
          <span className="block text-xs text-[#718397]">Sık gittiğin rotaları kaydet, yeni ilanları rozetle gör. Premium özelliği.</span>
        </span>
      </button>
    )
  }

  const save = (next: SavedRoute[]) => {
    setRoutes(next)
    writeRoutes(next)
  }

  const addRoute = () => {
    const f = from.trim()
    const t = to.trim()
    if (!f && !t) return
    if (routes.length >= MAX_ROUTES) return
    save([...routes, { id: String(Date.now()), from: f, to: t, seenAt: Date.now() }])
    setFrom("")
    setTo("")
    setAdding(false)
  }

  const openRoute = (r: SavedRoute) => {
    save(routes.map((x) => (x.id === r.id ? { ...x, seenAt: Date.now() } : x)))
    onCitySearch?.(r.from || r.to)
  }

  return (
    <div className="mb-4 rounded-2xl border border-[#e4e9ef] bg-white p-3 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[#122c4a]">
          <MapPin className="size-4 text-[#d64526]" />
          Kayıtlı Güzergâhlar
        </span>
        {routes.length < MAX_ROUTES && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#122c4a] active:scale-95"
          >
            <Plus className="size-3.5" />
            Ekle
          </button>
        )}
      </div>

      {routes.length === 0 && !adding && (
        <p className="text-xs text-[#718397]">Henüz güzergâh yok. “Ekle” ile çıkış ve varış şehrini kaydet.</p>
      )}

      {routes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center overflow-hidden rounded-full border border-[#e4e9ef] bg-[#f8fafc]">
              <button onClick={() => openRoute(r)} className="flex items-center gap-1.5 py-1.5 pl-3 pr-2 text-xs font-semibold text-[#122c4a]">
                <span>{r.from || "Her yer"}</span>
                <ArrowRight className="size-3 text-[#8da0b2]" />
                <span>{r.to || "Her yer"}</span>
                {counts[r.id] > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-[#d64526] px-1.5 text-[10px] font-bold leading-5 text-white">
                    {counts[r.id] > 99 ? "99+" : counts[r.id]} yeni
                  </span>
                )}
              </button>
              <button
                onClick={() => save(routes.filter((x) => x.id !== r.id))}
                aria-label="Güzergâhı sil"
                className="py-1.5 pr-2.5 text-[#8da0b2] active:scale-90"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Çıkış (ör. Konya)"
            className="min-w-0 flex-1 rounded-xl border border-[#e4e9ef] px-3 py-2 text-sm outline-none focus:border-[#315d83]"
          />
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Varış (ör. İstanbul)"
            className="min-w-0 flex-1 rounded-xl border border-[#e4e9ef] px-3 py-2 text-sm outline-none focus:border-[#315d83]"
          />
          <div className="flex gap-2">
            <button onClick={addRoute} className="rounded-xl bg-[#d64526] px-4 py-2 text-sm font-semibold text-white active:scale-95">
              Kaydet
            </button>
            <button onClick={() => setAdding(false)} className="rounded-xl border border-[#e4e9ef] px-4 py-2 text-sm font-semibold text-[#122c4a]">
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
