"use client"

import { useState } from "react"
import { Trash2, Edit3, CheckCircle2, Truck, Plus, RefreshCw, BadgeCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"
import { Sheet } from "@/components/Sheet"
import { shortRoute, isMissing } from "@/lib/route"

interface TripsViewProps {
  loads: Load[]
  currentUserId: string | null
  /** Silme / düzenleme sonrası listeyi yenilemek için (verilmezse sayfa yenilenir) */
  onChanged?: () => void
}

const fieldClass =
  "h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-3.5 text-base text-[#122c4a] outline-none transition-colors focus:border-[#122c4a] focus:ring-4 focus:ring-[#122c4a]/10 md:text-sm"

export function TripsView({ loads, currentUserId, onChanged }: TripsViewProps) {
  // Sadece o an oturum açmış kullanıcının (currentUserId) kendi ilanlarını filtreliyoruz
  const userLoads = loads.filter(
    (l) => l.source === "user" && l.userId && currentUserId && l.userId === currentUserId
  )
  
  const [editingLoad, setEditingLoad] = useState<Load | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [bumpingId, setBumpingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // "Tamamlandı" akışı: ilan gelir olarak Gelir & Gider'e işlenir
  const [completing, setCompleting] = useState<Load | null>(null)
  const [doneAmount, setDoneAmount] = useState("")
  const [donePlate, setDonePlate] = useState("")
  const [removeAfter, setRemoveAfter] = useState(true)
  const [doneSaving, setDoneSaving] = useState(false)
  const [doneError, setDoneError] = useState<string | null>(null)

  const refresh = () => {
    if (onChanged) onChanged()
    else window.location.reload()
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm("Bu seferi/ilanı silmek istediğinize emin misiniz?")) return
    
    const realId = String(id).replace("user-", "")
    
    if (!supabase) {
      alert("Supabase bağlantısı kurulamadı!")
      return
    }

    setDeletingId(String(id))
    const { error } = await supabase.from("listings").delete().eq("id", realId)
    setDeletingId(null)

    if (error) {
      alert("Silinirken hata oluştu: " + error.message)
    } else {
      refresh()
    }
  }

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  // İlanı listenin en üstüne taşır (yeniden yayınlamadan)
  const handleBump = async (id: string) => {
    if (!supabase) return
    setBumpingId(id)
    const { error } = await supabase
      .from("listings")
      .update({ created_at: new Date().toISOString() })
      .eq("id", id.replace("user-", ""))
    setBumpingId(null)
    if (error) {
      alert("İlan yenilenemedi: " + error.message)
      return
    }
    flash("İlanınız listenin en üstüne taşındı.")
    refresh()
  }

  const openComplete = (load: Load) => {
    setDoneError(null)
    setDoneAmount(load.price ? load.price.replace(/[^\d]/g, "") : "")
    setDonePlate("")
    setRemoveAfter(true)
    setCompleting(load)
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completing || !supabase) return
    const amountNum = Number(doneAmount.replace(",", "."))
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setDoneError("Lütfen sıfırdan büyük bir tutar girin.")
      return
    }
    setDoneSaving(true)
    setDoneError(null)

    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const record: Record<string, unknown> = {
      type: "income",
      category: "Navlun Bedeli",
      amount: amountNum,
      plate: donePlate.toUpperCase().trim(),
      date: today,
      description: shortRoute(completing.from, completing.to) ?? (completing.cargo !== "-" ? completing.cargo : "Tamamlanan sefer"),
    }

    // user_id sütunu varsa ekle (supabase/002_finans_guvenlik.sql); yoksa onsuz yeniden dene
    const { data: { user } } = await supabase.auth.getUser()
    let { error } = await supabase.from("finances").insert([{ ...record, user_id: user?.id }])
    if (error && (error.code === "42703" || /user_id/i.test(error.message))) {
      ;({ error } = await supabase.from("finances").insert([record]))
    }
    if (error) {
      setDoneSaving(false)
      setDoneError("Gelir kaydedilemedi: " + error.message)
      return
    }

    if (removeAfter) {
      const { error: delError } = await supabase.from("listings").delete().eq("id", String(completing.id).replace("user-", ""))
      if (delError) {
        setDoneSaving(false)
        setDoneError("Gelir eklendi ama ilan kaldırılamadı: " + delError.message)
        return
      }
    }

    setDoneSaving(false)
    setCompleting(null)
    flash("Sefer tamamlandı, gelir olarak eklendi.")
    refresh()
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLoad) return
    setSaving(true)
    setErrorMsg(null)

    const realId = String(editingLoad.id).replace("user-", "")
    const formData = new FormData(e.currentTarget)
    const priceNum = Number(formData.get("price"))
    
    const updatedData = {
      from_city: String(formData.get("from") ?? "").trim(),
      to_city: String(formData.get("to") ?? "").trim(),
      cargo_detail: String(formData.get("cargo") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      vehicle_type: String(formData.get("vehicle") ?? "").trim(),
      price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
    }

    if (!supabase) {
      setSaving(false)
      return
    }

    const { error } = await supabase.from("listings").update(updatedData).eq("id", realId)

    setSaving(false)
    if (error) {
      setErrorMsg("Güncellenirken hata oluştu: " + error.message)
    } else {
      setEditingLoad(null)
      refresh()
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#d64526]">Operasyon Yönetimi</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#122c4a] sm:text-3xl">Seferlerim</h1>
        <p className="mt-1 text-sm text-[#718397]">Oluşturduğunuz aktif seferlerinizi takip edin, düzenleyin veya silin.</p>
      </div>

      {notice && (
        <div className="animate-rise flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <BadgeCheck className="size-4" /> {notice}
        </div>
      )}

      <div className="grid gap-3">
        {userLoads.length > 0 ? (
          userLoads.map((load) => (
            <div key={load.id} className="animate-rise overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_3px_rgba(18,44,74,0.05)]">
              <div className="flex items-start gap-3.5 p-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
                  <Truck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-[#122c4a]">
                    {shortRoute(load.from, load.to) ?? "Güzergah belirtilmemiş"}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#718397]">
                    {[!isMissing(load.cargo) ? load.cargo : "", load.vehicle, load.time].filter(Boolean).join(" • ")}
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e7f5ed] px-2.5 py-1 text-[11px] font-semibold text-[#3b8068]">
                    <CheckCircle2 className="size-3" /> Aktif Sefer
                  </span>
                </div>
                {load.price && load.price !== "₺0" && (
                  <div className="shrink-0 text-right text-lg font-extrabold text-[#d64526]">{load.price}</div>
                )}
              </div>

              <div className="grid grid-cols-2 border-t border-[#edf0f3]">
                <button
                  type="button"
                  onClick={() => handleBump(String(load.id))}
                  disabled={bumpingId === String(load.id)}
                  className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-[#315d83] transition-colors hover:bg-[#f5f8fb] disabled:opacity-50"
                >
                  <RefreshCw className={`size-4 ${bumpingId === String(load.id) ? "animate-spin" : ""}`} /> Yenile
                </button>
                <button
                  type="button"
                  onClick={() => openComplete(load)}
                  className="flex h-12 items-center justify-center gap-2 border-l border-[#edf0f3] text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <BadgeCheck className="size-4" /> Tamamlandı
                </button>
              </div>
              <div className="grid grid-cols-2 border-t border-[#edf0f3]">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setEditingLoad(load) }}
                  className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-[#315d83] transition-colors hover:bg-[#f5f8fb]"
                >
                  <Edit3 className="size-4" /> Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(load.id)}
                  disabled={deletingId === String(load.id)}
                  className="flex h-12 items-center justify-center gap-2 border-l border-[#edf0f3] text-sm font-semibold text-[#d64526] transition-colors hover:bg-[#fff6f3] disabled:opacity-50"
                >
                  <Trash2 className="size-4" /> {deletingId === String(load.id) ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-[#ccd6e0] bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
              <Truck className="size-8" />
            </div>
            <p className="text-sm text-[#718397]">Henüz size ait bir sefer/ilan bulunmuyor.</p>
            <p className="mt-1 text-xs text-[#8da0b2]">Alttaki turuncu <Plus className="mx-0.5 inline size-3.5" /> düğmesiyle ilk ilanınızı verebilirsiniz.</p>
          </div>
        )}
      </div>

      <Sheet
        open={editingLoad !== null}
        onClose={() => setEditingLoad(null)}
        title="Seferi / İlanı Düzenle"
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setEditingLoad(null)}
              className="h-12 rounded-xl border border-[#dbe3ec] text-sm font-semibold text-[#334e68] transition-colors hover:bg-[#f5f7fa]"
            >
              İptal
            </button>
            <button
              type="submit"
              form="edit-trip-form"
              disabled={saving}
              className="h-12 rounded-xl bg-[#d64526] text-sm font-semibold text-white transition-colors hover:bg-[#b93820] disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        }
      >
        {editingLoad && (
          <form id="edit-trip-form" key={editingLoad.id} onSubmit={handleUpdate} className="grid gap-4 pt-1">
            {errorMsg && <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{errorMsg}</div>}
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Çıkış Şehri
                <input name="from" defaultValue={isMissing(editingLoad.from) ? "" : editingLoad.from} required className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Varış Şehri
                <input name="to" defaultValue={isMissing(editingLoad.to) ? "" : editingLoad.to} required className={fieldClass} />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Yük Detayı
              <input name="cargo" defaultValue={isMissing(editingLoad.cargo) ? "" : editingLoad.cargo} required className={fieldClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Araç Tipi
                <input name="vehicle" defaultValue={editingLoad.vehicle} className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Fiyat (TL)
                <input name="price" type="number" inputMode="numeric" min={0} defaultValue={editingLoad.price ? editingLoad.price.replace(/[^\d]/g, "") : ""} className={fieldClass} />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Açıklama / Not (ops.)
              <input name="message" defaultValue={isMissing(editingLoad.message) ? "" : editingLoad.message} className={fieldClass} />
            </label>
          </form>
        )}
      </Sheet>

      {/* Sefer tamamlandı -> gelir olarak kaydet */}
      <Sheet
        open={completing !== null}
        onClose={() => setCompleting(null)}
        title="Seferi Tamamla"
        subtitle="Tutar, Gelir & Gider sekmesine navlun geliri olarak işlenir."
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCompleting(null)}
              className="h-12 rounded-xl border border-[#dbe3ec] text-sm font-semibold text-[#334e68] transition-colors hover:bg-[#f5f7fa]"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              form="complete-trip-form"
              disabled={doneSaving}
              className="h-12 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {doneSaving ? "Kaydediliyor..." : "Gelire Ekle"}
            </button>
          </div>
        }
      >
        {completing && (
          <form id="complete-trip-form" onSubmit={handleComplete} className="grid gap-4 pt-1">
            {doneError && <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{doneError}</div>}
            <div className="rounded-xl bg-[#f6f9fc] p-3 text-sm font-bold text-[#122c4a]">
              {shortRoute(completing.from, completing.to) ?? completing.cargo}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Alınan Tutar (TL)
                <input value={doneAmount} onChange={(e) => setDoneAmount(e.target.value)} inputMode="decimal" required placeholder="0" className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Araç Plakası (ops.)
                <input value={donePlate} onChange={(e) => setDonePlate(e.target.value)} placeholder="42 DLB 59" className={`${fieldClass} uppercase`} />
              </label>
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#e4e9ef] bg-[#fafbfd] px-3.5">
              <input type="checkbox" checked={removeAfter} onChange={(e) => setRemoveAfter(e.target.checked)} className="size-5 accent-[#d64526]" />
              <span className="text-sm font-semibold text-[#122c4a]">İlanı yayından kaldır</span>
            </label>
          </form>
        )}
      </Sheet>
    </div>
  )
}
