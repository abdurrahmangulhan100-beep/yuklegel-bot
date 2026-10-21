"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, BellOff, Crown, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { usePremium } from "@/components/PremiumProvider"
import { openPremium } from "@/lib/premium"
import { CITY_NAMES } from "@/lib/route"
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push"

type Route = { id: string; from_city: string | null; to_city: string | null; vehicle: string | null; urgent_only: boolean }

const VEHICLES = ["Tır", "Kamyon", "Kamyonet", "Frigo", "Kırkayak", "Dorse", "Damperli"]
const FREE_ROUTES = 1
const PREMIUM_ROUTES = 5

const selectClass =
  "h-11 w-full rounded-xl border border-[#e0e6ed] bg-white px-3 text-base text-[#122c4a] md:text-sm"

const routeLabel = (r: Route) => {
  const parts = [r.from_city && r.to_city ? `${r.from_city} → ${r.to_city}` : r.from_city ? `${r.from_city} çıkışlı` : r.to_city ? `${r.to_city} varışlı` : "Tüm güzergâhlar"]
  if (r.vehicle) parts.push(r.vehicle)
  if (r.urgent_only) parts.push("Sadece acil")
  return parts.join(" · ")
}

/** Profil sayfasındaki "Bildirimler" kartı: cihaz bildirimini aç/kapat + bildirim istenen güzergâhlar. */
export function NotificationSettings() {
  const { isPremium } = usePremium()
  const [state, setState] = useState<PushState>("off")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [adding, setAdding] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [vehicle, setVehicle] = useState("")
  const [urgentOnly, setUrgentOnly] = useState(false)

  const limit = isPremium ? PREMIUM_ROUTES : FREE_ROUTES

  const loadRoutes = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from("notification_routes")
      .select("id,from_city,to_city,vehicle,urgent_only")
      .order("created_at", { ascending: true })
    if (!error && data) setRoutes(data as Route[])
  }, [])

  useEffect(() => {
    getPushState().then(setState)
    loadRoutes()
  }, [loadRoutes])

  const toggle = async () => {
    setBusy(true)
    setMsg(null)
    if (state === "on") {
      await disablePush()
      setState(await getPushState())
      setMsg({ text: "Bu cihazda bildirimler kapatıldı.", ok: true })
    } else {
      const r = await enablePush()
      setState(await getPushState())
      setMsg(r.ok ? { text: "Bildirimler bu cihazda açıldı.", ok: true } : { text: r.error || "Açılamadı.", ok: false })
    }
    setBusy(false)
  }

  const addRoute = async () => {
    if (!supabase) return
    if (!from && !to && !urgentOnly) {
      setMsg({ text: "En az bir şehir seçin veya \"sadece acil\" seçeneğini işaretleyin.", ok: false })
      return
    }
    setBusy(true)
    setMsg(null)
    const { error } = await supabase.from("notification_routes").insert({
      from_city: from || null,
      to_city: to || null,
      vehicle: vehicle || null,
      urgent_only: urgentOnly,
    })
    setBusy(false)
    if (error) {
      setMsg({
        text: error.message.includes("route_limit")
          ? `Ücretsiz planda ${FREE_ROUTES} bildirim güzergâhı eklenebilir. ${PREMIUM_ROUTES} güzergâh için Premium'a geçin.`
          : "Güzergâh eklenemedi, tekrar deneyin.",
        ok: false,
      })
      return
    }
    setFrom(""); setTo(""); setVehicle(""); setUrgentOnly(false); setAdding(false)
    loadRoutes()
  }

  const removeRoute = async (id: string) => {
    if (!supabase) return
    setRoutes((prev) => prev.filter((r) => r.id !== id))
    const { error } = await supabase.from("notification_routes").delete().eq("id", id)
    if (error) loadRoutes()
  }

  const on = state === "on"

  return (
    <div className="space-y-4 rounded-2xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-[#e7f6ec] text-[#1f9d55]" : "bg-[#eef4f8] text-[#315d83]"}`}>
            {on ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#122c4a]">İlan Bildirimleri</h2>
            <p className="text-xs leading-relaxed text-[#627d98]">
              Seçtiğiniz güzergâha yeni ilan eklenince telefonunuza bildirim gelir.
            </p>
          </div>
        </div>
        {state !== "unsupported" && state !== "denied" && (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`h-10 shrink-0 rounded-xl px-4 text-xs font-semibold transition-colors disabled:opacity-60 ${on ? "bg-[#f0f4f8] text-[#122c4a]" : "bg-[#122c4a] text-white hover:bg-[#1a3d68]"}`}
          >
            {on ? "Kapat" : "Aç"}
          </button>
        )}
      </div>

      {state === "unsupported" && (
        <p className="rounded-lg bg-[#fff6e5] p-3 text-xs text-[#8a5a00]">Bu cihaz veya tarayıcı bildirimleri desteklemiyor.</p>
      )}
      {state === "denied" && (
        <p className="rounded-lg bg-[#fff6e5] p-3 text-xs text-[#8a5a00]">
          Bildirim izni engellenmiş. Telefon ayarlarından Nakliye Cepte için bildirimlere izin verip sayfayı yenileyin.
        </p>
      )}
      {msg && (
        <p className={`rounded-lg p-3 text-xs font-medium ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#6d8194]">
            Bildirim güzergâhları ({routes.length}/{limit})
          </span>
          {!adding && routes.length < limit && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f1f5f9] px-2.5 py-1.5 text-xs font-semibold text-[#122c4a] active:scale-95"
            >
              <Plus className="size-3.5" /> Ekle
            </button>
          )}
        </div>

        {routes.length === 0 && !adding && (
          <p className="text-xs text-[#8da0b2]">Henüz güzergâh eklemediniz. Bildirim almak için bir güzergâh ekleyin.</p>
        )}

        {routes.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f7fa] px-3 py-2.5">
            <span className="min-w-0 truncate text-sm font-medium text-[#122c4a]">{routeLabel(r)}</span>
            <button
              type="button"
              onClick={() => removeRoute(r.id)}
              aria-label="Güzergâhı sil"
              className="grid size-8 shrink-0 place-items-center rounded-full text-[#8da0b2] hover:bg-white hover:text-[#d64526]"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        {!isPremium && routes.length >= FREE_ROUTES && (
          <button
            type="button"
            onClick={openPremium}
            className="flex w-full items-center gap-2 rounded-xl border border-[#f3dfb0] bg-[#fff9ec] px-3 py-2.5 text-left text-xs font-semibold text-[#8a5a00] active:scale-[0.99]"
          >
            <Crown className="size-4 shrink-0" />
            Premium ile {PREMIUM_ROUTES} güzergâha kadar bildirim alın
          </button>
        )}

        {adding && (
          <div className="space-y-3 rounded-xl border border-[#e4e9ef] p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] font-semibold text-[#6d8194]">
                Nereden
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${selectClass} mt-1`}>
                  <option value="">Herhangi</option>
                  {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-[#6d8194]">
                Nereye
                <select value={to} onChange={(e) => setTo(e.target.value)} className={`${selectClass} mt-1`}>
                  <option value="">Herhangi</option>
                  {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-[11px] font-semibold text-[#6d8194]">
              Araç tipi
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={`${selectClass} mt-1`}>
                <option value="">Tümü</option>
                {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-[#122c4a]">
              <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} className="size-4 accent-[#d64526]" />
              Sadece acil ilanlar
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRoute}
                disabled={busy}
                className="h-11 flex-1 rounded-xl bg-[#122c4a] text-sm font-semibold text-white disabled:opacity-60"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-11 rounded-xl bg-[#f0f4f8] px-4 text-sm font-semibold text-[#122c4a]"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>

      {routes.length > 0 && !on && state !== "unsupported" && state !== "denied" && (
        <p className="text-[11px] text-[#8da0b2]">Güzergâh kaydettiniz ancak bu cihazda bildirim kapalı. Yukarıdan "Aç" düğmesine dokunun.</p>
      )}
    </div>
  )
}
