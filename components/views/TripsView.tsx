"use client"

import { useState } from "react"
import { Trash2, Edit3, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"

export function TripsView({ loads }: { loads: Load[] }) {
  const userLoads = loads.filter(l => l.source === "user")
  
  const [editingLoad, setEditingLoad] = useState<Load | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async (id: string | number) => {
    if (!confirm("Bu seferi/ilanı silmek istediğinize emin misiniz?")) return
    
    const realId = String(id).replace("user-", "")
    
    if (!supabase) {
      alert("Supabase bağlantısı kurulamadı!")
      return
    }

    const { error } = await supabase.from("listings").delete().eq("id", realId)

    if (error) {
      alert("Silinirken hata oluştu: " + error.message)
    } else {
      window.location.reload()
    }
  }

  const handleOpenEdit = (load: Load) => {
    setEditingLoad(load)
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingLoad) return
    setLoading(true)

    const realId = String(editingLoad.id).replace("user-", "")
    const formData = new FormData(e.currentTarget)
    
    const updatedData = {
      from_city: formData.get("from") as string,
      to_city: formData.get("to") as string,
      cargo_detail: formData.get("cargo") as string,
      vehicle_type: formData.get("vehicle") as string,
      price: Number(formData.get("price")) || 0,
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    const { error } = await supabase.from("listings").update(updatedData).eq("id", realId)

    setLoading(false)
    if (error) {
      alert("Güncellenirken hata oluştu: " + error.message)
    } else {
      setIsEditOpen(false)
      window.location.reload()
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Operasyon Yönetimi</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Seferlerim</h1>
        <p className="mt-2 text-sm text-[#718397]">Oluşturduğunuz aktif seferlerinizi takip edin, düzenleyin veya silin.</p>
      </div>

      <div className="grid gap-4">
        {userLoads.length > 0 ? (
          userLoads.map((load) => (
            <div key={load.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#dbe8f2] text-[#315d83]">
                  🚚
                </div>
                <div>
                  <div className="text-base font-bold text-[#122c4a]">
                    {load.from} → {load.to}
                  </div>
                  <div className="mt-1 text-xs text-[#718397]">
                    {load.cargo} • {load.vehicle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#edf0f3]">
                <div className="text-right">
                  <div className="text-lg font-bold text-[#d64526]">{load.price}</div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f5ed] px-2.5 py-0.5 text-[10px] font-semibold text-[#3b8068]">
                    <CheckCircle2 className="size-3" /> Aktif Sefer
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEdit(load)} className="cursor-pointer gap-1 text-[#315d83]">
                    <Edit3 className="size-4" /> Düzenle
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(load.id)} className="cursor-pointer gap-1 text-[#d64526] hover:bg-[#fff0ec]">
                    <Trash2 className="size-4" /> Sil
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#ccd6e0] bg-white py-16 text-center text-sm text-[#718397]">
            Henüz size ait bir sefer/ilan bulunmuyor.
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#122c4a]">Seferi / İlanı Düzenle</DialogTitle>
          </DialogHeader>
          {editingLoad && (
            <form onSubmit={handleUpdate} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Çıkış Şehri</Label><Input name="from" defaultValue={editingLoad.from} required /></div>
                <div className="grid gap-2"><Label>Varış Şehri</Label><Input name="to" defaultValue={editingLoad.to} required /></div>
              </div>
              <div className="grid gap-2"><Label>Yük Detayı</Label><Input name="cargo" defaultValue={editingLoad.cargo} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Araç Tipi</Label><Input name="vehicle" defaultValue={editingLoad.vehicle} required /></div>
                <div className="grid gap-2"><Label>Fiyat (TL)</Label><Input name="price" type="number" defaultValue={editingLoad.price.replace(/[^\d]/g, "")} required /></div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>İptal</Button>
                <Button type="submit" disabled={loading} className="bg-[#d64526] text-white hover:bg-[#b93820]">
                  {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
