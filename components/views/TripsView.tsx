"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Trash2, Pencil, RefreshCw, Share2, Plus, Zap, Truck, BadgeCheck, AlertTriangle, ArrowRight, Weight } from "lucide-react"
import { toast } from "@/lib/toast"
import { supabase } from "@/lib/supabase"
import { Sheet } from "@/components/Sheet"
import { CITY_NAMES } from "@/lib/route"
import { cn, timeAgo } from "@/lib/utils"

interface TripsViewProps {
  currentUserId: string | null
  /** Ekleme / düzenleme / silme sonrası diğer listeleri (İlanlar, sayaçlar) yenilemek için */
  onChanged?: () => void
  /** "Yeni ilan" düğmesi */
  onOpenCreate?: () => void
  /** Eski kullanım uyumluluğu için kabul edilir; bu ekran kendi ilanlarını doğrudan çeker */
  loads?: unknown
}

type MyListing = {
  id: string | number
  from_city?: string | null
  to_city?: string | null
  cargo_detail?: string | null
  message?: string | null
  vehicle_type?: string | null
  price?: number | null
  urgent?: boolean | null
  phone?: string | null
  created_at?: string | null
}

const ARAC_TIPLERI = ["Kapalı Dorse", "Damperli Tır", "Kamyon", "Frigo", "Kırkayak", "13.60 Açık Dorse", "Panelvan", "Pikap"]
const YUK_CINSLERI = ["Kömür", "Tahıl / Hububat", "Demir / Çelik", "Paletli Yük", "Gıda", "İnşaat Malzemesi", "Mobilya", "Dökme Yük", "Tekstil", "Diğer"]
const CITY_LIST = [...CITY_NAMES].sort((a, b) => a.localeCompare(b, "tr-TR"))

// İlan oluşturma formu şehri "Konya - Meram" biçiminde saklar
const splitPlace = (v?: string | null) => {
  const [city, ...rest] = String(v ?? "").split(" - ")
  return { city: (city ?? "").trim(), district: rest.join(" - ").trim() }
}
const joinPlace = (city: string, district: string) => (district.trim() ? `${city} - ${district.trim()}` : city)

const COOLDOWN_MIN = 30 // Yenile düğmesine art arda basılarak liste kirletilmesin

const fieldClass =
  "h-12 w-full rounded-xl border border-input bg-card px-3.5 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-ring/10 md:text-sm"
const labelClass = "grid gap-1.5 text-xs font-semibold text-foreground/80"

export function TripsView({ currentUserId, onChanged, onOpenCreate }: TripsViewProps) {
  const [items, setItems] = useState<MyListing[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [editing, setEditing] = useState<MyListing | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [removing, setRemoving] = useState<MyListing | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  const [bumpingId, setBumpingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  // Yalnızca bu kullanıcının ilanları ve yalnızca gereken sütunlar (Supabase ücretsiz kotası için hafif)
  const load = useCallback(async () => {
    if (!supabase || !currentUserId) {
      setItems([])
      return
    }
    setLoadError(false)
    const { data, error } = await supabase
      .from("listings")
      .select("id,from_city,to_city,cargo_detail,message,vehicle_type,price,urgent,phone,created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(100)
    if (error) {
      setLoadError(true)
      setItems([])
      return
    }
    setItems((data as MyListing[]) ?? [])
  }, [currentUserId])

  useEffect(() => {
    load()
  }, [load])

  const afterChange = async () => {
    await load()
    onChanged?.()
  }

  const urgentCount = useMemo(() => (items ?? []).filter((i) => i.urgent).length, [items])

  // ---- Yenile: ilanı listenin en üstüne taşır ----
  const minutesLeft = (l: MyListing) => {
    if (!l.created_at) return 0
    const age = (Date.now() - Date.parse(l.created_at)) / 60000
    return age >= COOLDOWN_MIN ? 0 : Math.ceil(COOLDOWN_MIN - age)
  }

  const handleBump = async (l: MyListing) => {
    if (!supabase || !currentUserId) return
    const wait = minutesLeft(l)
    if (wait > 0) {
      toast(`Bu ilanı ${wait} dk sonra tekrar yenileyebilirsiniz.`)
      return
    }
    setBumpingId(String(l.id))
    const { error } = await supabase
      .from("listings")
      .update({ created_at: new Date().toISOString() })
      .eq("id", l.id)
      .eq("user_id", currentUserId)
    setBumpingId(null)
    if (error) {
      toast("İlan yenilenemedi. Lütfen tekrar deneyin.")
      return
    }
    flash("İlanınız listenin en üstüne taşındı.")
    afterChange()
  }

  // ---- Paylaş (WhatsApp / sistem paylaşım menüsü) ----
  const handleShare = async (l: MyListing) => {
    const from = splitPlace(l.from_city).city
    const to = splitPlace(l.to_city).city
    const parts = [`${from} → ${to}`, l.cargo_detail, l.vehicle_type, l.price ? `₺${l.price.toLocaleString("tr-TR")}` : ""].filter(Boolean)
    const text = `${parts.join(" · ")}\nNakliye Cepte'de ilan: ${window.location.origin}`
    try {
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
    } catch {
      return // kullanıcı paylaşımı kapattı
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")
  }

  // ---- Kaldır ----
  const confirmRemove = async () => {
    if (!removing || !supabase || !currentUserId) return
    setRemoveBusy(true)
    const { error } = await supabase.from("listings").delete().eq("id", removing.id).eq("user_id", currentUserId)
    setRemoveBusy(false)
    if (error) {
      toast("İlan kaldırılamadı. Lütfen tekrar deneyin.")
      return
    }
    setRemoving(null)
    flash("İlan yayından kaldırıldı.")
    afterChange()
  }

  // ---- Düzenle ----
  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editing || !supabase || !currentUserId) return
    setFormError(null)

    const f = new FormData(e.currentTarget)
    const fromCity = String(f.get("fromCity") ?? "").trim()
    const toCity = String(f.get("toCity") ?? "").trim()
    const fromDistrict = String(f.get("fromDistrict") ?? "").trim()
    const toDistrict = String(f.get("toDistrict") ?? "").trim()
    const phoneClean = String(f.get("phone") ?? "").replace(/\s+/g, "")
    const priceNum = Number(String(f.get("price") ?? "").replace(/\D/g, ""))

    if (!fromCity || !toCity) return setFormError("Çıkış ve varış şehrini seçin.")
    if (fromCity === toCity && fromDistrict.toLowerCase() === toDistrict.toLowerCase()) {
      return setFormError("Yükleme ve teslimat yeri aynı olamaz. Farklı bir şehir veya ilçe seçin.")
    }
    if (!/^(0?5\d{9})$/.test(phoneClean)) return setFormError("Geçerli bir cep telefonu girin (5XX XXX XX XX).")

    setSaving(true)
    const { error } = await supabase
      .from("listings")
      .update({
        from_city: joinPlace(fromCity, fromDistrict),
        to_city: joinPlace(toCity, toDistrict),
        cargo_detail: String(f.get("cargo") ?? "").trim(),
        vehicle_type: String(f.get("vehicle") ?? "").trim(),
        price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
        message: String(f.get("message") ?? "").trim(),
        phone: "0" + phoneClean.replace(/^0/, ""),
        urgent: f.get("urgent") === "on",
      })
      .eq("id", editing.id)
      .eq("user_id", currentUserId)
    setSaving(false)

    if (error) {
      setFormError("Kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.")
      return
    }
    setEditing(null)
    flash("İlan güncellendi.")
    afterChange()
  }

  const edFrom = splitPlace(editing?.from_city)
  const edTo = splitPlace(editing?.to_city)
  const withExtra = (list: string[], v?: string | null) => (v && !list.includes(v) ? [v, ...list] : list)

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">Seferlerim</h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Yayınladığınız ilanları buradan yönetin.</p>
        </div>
        {onOpenCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm active:scale-95"
          >
            <Plus className="size-4" /> Yeni ilan
          </button>
        )}
      </div>

      {/* Özet */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="text-2xl font-extrabold tabular-nums text-foreground">{items.length}</div>
            <div className="text-xs font-semibold text-muted-foreground">Yayında ilan</div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="text-2xl font-extrabold tabular-nums text-brand">{urgentCount}</div>
            <div className="text-xs font-semibold text-muted-foreground">Acil ilan</div>
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="animate-rise flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600">
          <BadgeCheck className="size-4 shrink-0" /> {notice}
        </div>
      )}

      {/* Liste */}
      {items === null ? (
        <div className="grid grid-cols-1 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">İlanlarınız yüklenemedi</p>
          <p className="mt-1 text-xs text-muted-foreground">İnternet bağlantınızı kontrol edip tekrar deneyin.</p>
          <button type="button" onClick={load} className="mt-4 h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground active:scale-95">
            Tekrar dene
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-muted text-foreground/80">
            <Truck className="size-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">Henüz yayınladığınız ilan yok</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">İlan verin, telefonunuz doğrudan ilanda görünsün; arayanlar size ulaşsın.</p>
          {onOpenCreate && (
            <button type="button" onClick={onOpenCreate} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white active:scale-95">
              <Plus className="size-4" /> İlk ilanını ver
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((l) => {
            const from = splitPlace(l.from_city)
            const to = splitPlace(l.to_city)
            const wait = minutesLeft(l)
            const busy = bumpingId === String(l.id)
            return (
              <article key={String(l.id)} className="animate-rise relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm dark:shadow-none">
                {l.urgent && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#e5522f] to-[#f4a259]" />}
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                      <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" /> Yayında
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(l.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-extrabold text-foreground">{from.city || "-"}</div>
                      {from.district && <div className="truncate text-xs font-semibold text-muted-foreground">{from.district}</div>}
                    </div>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 text-right">
                      <div className="truncate text-[16px] font-extrabold text-foreground">{to.city || "-"}</div>
                      {to.district && <div className="truncate text-xs font-semibold text-muted-foreground">{to.district}</div>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {l.urgent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11.5px] font-semibold text-white">
                        <Zap className="size-3 fill-white" /> ACİL
                      </span>
                    )}
                    {l.vehicle_type && <span className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-foreground/80">{l.vehicle_type}</span>}
                    {l.cargo_detail && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-foreground/80">
                        <Weight className="size-3" /> {l.cargo_detail}
                      </span>
                    )}
                    {l.price ? <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11.5px] font-semibold text-white">₺{l.price.toLocaleString("tr-TR")}</span> : null}
                  </div>

                  {l.message && <p className="line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">{l.message}</p>}
                </div>

                <div className="grid grid-cols-4 border-t border-border text-[11.5px] font-semibold">
                  <button
                    type="button"
                    onClick={() => handleBump(l)}
                    disabled={busy}
                    aria-label="İlanı yenile"
                    className={cn("flex h-14 flex-col items-center justify-center gap-1 transition-colors active:bg-muted disabled:opacity-50", wait > 0 ? "text-muted-foreground" : "text-foreground/80")}
                  >
                    <RefreshCw className={cn("size-4", busy && "animate-spin")} />
                    {wait > 0 ? `${wait} dk` : "Yenile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFormError(null); setEditing(l) }}
                    className="flex h-14 flex-col items-center justify-center gap-1 border-l border-border text-foreground/80 transition-colors active:bg-muted"
                  >
                    <Pencil className="size-4" /> Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(l)}
                    className="flex h-14 flex-col items-center justify-center gap-1 border-l border-border text-foreground/80 transition-colors active:bg-muted"
                  >
                    <Share2 className="size-4" /> Paylaş
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(l)}
                    className="flex h-14 flex-col items-center justify-center gap-1 border-l border-border text-red-500 transition-colors active:bg-red-500/10"
                  >
                    <Trash2 className="size-4" /> Kaldır
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Düzenle */}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="İlanı Düzenle"
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setEditing(null)} className="h-12 rounded-xl border border-input text-sm font-semibold text-foreground/80 active:bg-muted">
              Vazgeç
            </button>
            <button type="submit" form="edit-listing-form" disabled={saving} className="h-12 rounded-xl bg-brand text-sm font-semibold text-white active:opacity-90 disabled:opacity-60">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        }
      >
        {editing && (
          <form id="edit-listing-form" key={String(editing.id)} onSubmit={handleUpdate} className="grid gap-4 pt-1">
            {formError && <div role="alert" className="rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-500">{formError}</div>}

            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Çıkış Şehri
                <select name="fromCity" defaultValue={edFrom.city} required className={fieldClass}>
                  <option value="" disabled>Seçin</option>
                  {withExtra(CITY_LIST, edFrom.city).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className={labelClass}>Varış Şehri
                <select name="toCity" defaultValue={edTo.city} required className={fieldClass}>
                  <option value="" disabled>Seçin</option>
                  {withExtra(CITY_LIST, edTo.city).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Çıkış İlçesi (ops.)
                <input name="fromDistrict" defaultValue={edFrom.district} maxLength={40} className={fieldClass} />
              </label>
              <label className={labelClass}>Varış İlçesi (ops.)
                <input name="toDistrict" defaultValue={edTo.district} maxLength={40} className={fieldClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Yük Cinsi
                <select name="cargo" defaultValue={editing.cargo_detail ?? ""} className={fieldClass}>
                  {withExtra(YUK_CINSLERI, editing.cargo_detail).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className={labelClass}>Araç Tipi
                <select name="vehicle" defaultValue={editing.vehicle_type ?? ""} className={fieldClass}>
                  {withExtra(ARAC_TIPLERI, editing.vehicle_type).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Fiyat (TL, ops.)
                <input name="price" inputMode="numeric" defaultValue={editing.price ? String(editing.price) : ""} maxLength={9} className={fieldClass} />
              </label>
              <label className={labelClass}>Cep Telefonu
                <input name="phone" type="tel" inputMode="tel" defaultValue={editing.phone ?? ""} required className={fieldClass} />
              </label>
            </div>

            <label className={labelClass}>Açıklama / Not (ops.)
              <textarea name="message" defaultValue={editing.message ?? ""} rows={3} maxLength={500} className={cn(fieldClass, "h-auto py-3")} />
            </label>

            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/50 px-3.5">
              <input type="checkbox" name="urgent" defaultChecked={Boolean(editing.urgent)} className="size-5 accent-brand" />
              <span className="text-sm font-semibold text-foreground">Acil ilan</span>
            </label>
          </form>
        )}
      </Sheet>

      {/* Kaldırma onayı */}
      <Sheet
        open={removing !== null}
        onClose={() => !removeBusy && setRemoving(null)}
        title="İlanı kaldır"
        subtitle="İlan yayından kalkar ve geri alınamaz."
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setRemoving(null)} disabled={removeBusy} className="h-12 rounded-xl border border-input text-sm font-semibold text-foreground/80 active:bg-muted disabled:opacity-60">
              Vazgeç
            </button>
            <button type="button" onClick={confirmRemove} disabled={removeBusy} className="h-12 rounded-xl bg-red-600 text-sm font-semibold text-white active:opacity-90 disabled:opacity-60">
              {removeBusy ? "Kaldırılıyor..." : "Evet, kaldır"}
            </button>
          </div>
        }
      >
        {removing && (
          <div className="rounded-xl bg-muted/60 p-3 text-sm font-bold text-foreground">
            {splitPlace(removing.from_city).city} → {splitPlace(removing.to_city).city}
            <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
              {[removing.vehicle_type, removing.cargo_detail].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}
      </Sheet>
    </div>
  )
}
