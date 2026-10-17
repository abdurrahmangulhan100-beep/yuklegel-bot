"use client"

import { useState } from "react"
import { Trash2, Edit3, CheckCircle2, Truck, ArrowRight, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"
import { Sheet } from "@/components/Sheet"

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

      <div className="grid gap-3">
        {userLoads.length > 0 ? (
          userLoads.map((load) => (
            <div key={load.id} className="animate-rise overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_3px_rgba(18,44,74,0.05)]">
              <div className="flex items-start gap-3.5 p-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
                  <Truck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[15px] font-bold text-[#122c4a]">
                    <span className="truncate">{load.from}</span>
                    <ArrowRight className="size-4 shrink-0 text-[#d64526]" />
                    <span className="truncate">{load.to}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[#718397]">
                    {load.cargo} • {load.vehicle}
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
                <input name="from" defaultValue={editingLoad.from} required className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Varış Şehri
                <input name="to" defaultValue={editingLoad.to} required className={fieldClass} />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Yük Detayı
              <input name="cargo" defaultValue={editingLoad.cargo} required className={fieldClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Araç Tipi
                <input name="vehicle" defaultValue={editingLoad.vehicle} required className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-[#334e68]">Fiyat (TL)
                <input name="price" type="number" inputMode="numeric" min={0} defaultValue={editingLoad.price ? editingLoad.price.replace(/[^\d]/g, "") : ""} className={fieldClass} />
              </label>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
