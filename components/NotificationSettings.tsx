"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, BellOff, Crown, Lock, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { usePremium } from "@/components/PremiumProvider"
import { openPremium } from "@/lib/premium"
import { CITY_NAMES } from "@/lib/route"
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from "@/lib/push"

type Direction = "from" | "to" | "both"
type Route = { id: string; from_city: string | null; vehicle: string | null; urgent_only: boolean; direction: Direction }

const DIRECTIONS: { value: Direction; label: string; short: string }[] = [
  { value: "from", label: "Bu şehirden çıkan yükler", short: "çıkış" },
  { value: "to", label: "Bu şehre giden yükler", short: "varış" },
  { value: "both", label: "İkisi de", short: "çıkış + varış" },
]

const VEHICLES = ["Tır", "Kamyon", "Kamyonet", "Frigo", "Kırkayak", "Dorse", "Damperli"]

const selectClass =
  "h-11 w-full rounded-xl border border-[#e0e6ed] bg-white px-3 text-base text-[#122c4a] md:text-sm"

/** Profil sayfasındaki "Bildirimler" kartı. Premium'a özel; tek şehir seçilir (o şehirden veya o şehre ilan gelince bildirim). */
export function NotificationSettings() {
  const { isPremium, loading: premiumLoading } = usePremium()
  const [state, setState] = useState<PushState>("off")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [editing, setEditing] = useState(false)
  const [city, setCity] = useState("")
  const [direction, setDirection] = useState<Direction>("from")
  const [vehicle, setVehicle] = useState("")
  const [urgentOnly, setUrgentOnly] = useState(false)

  const loadRoute = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from("notification_routes")
      .select("id,from_city,vehicle,urgent_only,direction")
      .order("created_at", { ascending: true })
      .limit(1)
    if (!error) setRoute((data?.[0] as Route | undefined) ?? null)
  }, [])

  useEffect(() => {
    getPushState().then(setState)
    loadRoute()
  }, [loadRoute])

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

  const startEdit = () => {
    setCity(route?.from_city ?? "")
    setDirection(route?.direction ?? "from")
    setVehicle(route?.vehicle ?? "")
    setUrgentOnly(route?.urgent_only ?? false)
    setEditing(true)
    setMsg(null)
  }

  const saveRoute = async () => {
    if (!supabase) return
    if (!city) {
      setMsg({ text: "Lütfen bir şehir seçin.", ok: false })
      return
    }
    setBusy(true)
    setMsg(null)
    // Tek şehir kuralı: kayıt varsa GÜNCELLE (silip eklemek, ekleme başarısız olursa mevcut ayarı kaybettiriyordu)
    const fields = { from_city: city, to_city: null, direction, vehicle: vehicle || null, urgent_only: urgentOnly }
    const { error } = route
      ? await supabase.from("notification_routes").update(fields).eq("id", route.id)
      : await supabase.from("notification_routes").insert(fields)
    setBusy(false)
    if (error) {
      setMsg({
        text: error.message.includes("premium_required")
          ? "İlan bildirimleri Premium'a özeldir."
          : "Şehir kaydedilemedi, tekrar deneyin.",
        ok: false,
      })
      loadRoute()
      return
    }
    setEditing(false)
    loadRoute()
  }

  const removeRoute = async () => {
    if (!supabase || !route) return
    const old = route
    setRoute(null)
    const { error } = await supabase.from("notification_routes").delete().eq("id", old.id)
    if (error) setRoute(old)
  }

  const sendTest = async () => {
    setBusy(true)
    setMsg(null)
    const r = await sendTestPush()
    setMsg({ text: r.message, ok: r.ok })
    setBusy(false)
  }

  const on = state === "on"
  const pushUsable = state !== "unsupported" && state !== "denied"

  // Ücretsiz kullanıcı: kilitli kart
  if (!premiumLoading && !isPremium) {
    return (
      <div className="space-y-3 rounded-2xl border border-[#f3dfb0] bg-[#fff9ec] p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fdecc4] text-[#8a5a00]">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#122c4a]">İlan Bildirimleri · Premium</h2>
            <p className="text-xs leading-relaxed text-[#8a5a00]">
              Seçtiğiniz şehre yeni ilan düştüğü anda telefonunuza bildirim alın. Ücretsiz planda ilanlar listede gecikmeyle görünür.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openPremium}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d64526] text-sm font-bold text-white active:scale-[0.99]"
        >
          <Crown className="size-4" /> Premium'a Geç
        </button>
      </div>
    )
  }

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
              Seçtiğiniz şehir ve yöne uyan yeni ilan eklenince telefonunuza bildirim gelir; bildirimden tek dokunuşla arayabilirsiniz.
            </p>
          </div>
        </div>
        {pushUsable && (
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
        <span className="text-xs font-semibold text-[#6d8194]">Bildirim şehri</span>

        {!editing && !route && (
          <button
            type="button"
            onClick={startEdit}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#122c4a] text-sm font-semibold text-white active:scale-[0.99]"
          >
            Şehir seç
          </button>
        )}

        {!editing && route && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f7fa] px-3 py-2.5">
            <span className="min-w-0 truncate text-sm font-medium text-[#122c4a]">
              {route.from_city} ({DIRECTIONS.find((d) => d.value === route.direction)?.short ?? "çıkış"})
              {route.vehicle ? ` · ${route.vehicle}` : ""}
              {route.urgent_only ? " · Sadece acil" : ""}
            </span>
            <div className="flex shrink-0 items-center">
              <button type="button" onClick={startEdit} aria-label="Şehri değiştir" className="grid size-8 place-items-center rounded-full text-[#8da0b2] hover:bg-white hover:text-[#122c4a]">
                <Pencil className="size-4" />
              </button>
              <button type="button" onClick={removeRoute} aria-label="Şehri sil" className="grid size-8 place-items-center rounded-full text-[#8da0b2] hover:bg-white hover:text-[#d64526]">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        )}

        {editing && (
          <div className="space-y-3 rounded-xl border border-[#e4e9ef] p-3">
            <label className="block text-[11px] font-semibold text-[#6d8194]">
              Şehir
              <select value={city} onChange={(e) => setCity(e.target.value)} className={`${selectClass} mt-1`}>
                <option value="">Şehir seçin</option>
                {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[#6d8194]">
              Hangi ilanlar?
              <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className={`${selectClass} mt-1`}>
                {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[#6d8194]">
              Araç tipi (isteğe bağlı)
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
              <button type="button" onClick={saveRoute} disabled={busy} className="h-11 flex-1 rounded-xl bg-[#122c4a] text-sm font-semibold text-white disabled:opacity-60">
                Kaydet
              </button>
              <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-xl bg-[#f0f4f8] px-4 text-sm font-semibold text-[#122c4a]">
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>

      {on && (
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          className="h-10 w-full rounded-xl bg-[#f0f4f8] text-xs font-semibold text-[#122c4a] disabled:opacity-60"
        >
          Test bildirimi gönder
        </button>
      )}

      {route && !on && pushUsable && (
        <p className="text-[11px] text-[#8da0b2]">Şehir kaydettiniz ancak bu cihazda bildirim kapalı. Yukarıdan "Aç" düğmesine dokunun.</p>
      )}
    </div>
  )
}
