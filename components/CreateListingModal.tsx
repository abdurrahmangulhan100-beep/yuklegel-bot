"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"

type CreateModalProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAddLoad: (load: Load) => void;
}

export function CreateListingModal({ isOpen, setIsOpen, onAddLoad }: CreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profile, setProfile] = useState({
    company_name: "",
    phone: ""
  })

  // Modal açıldığında kullanıcının Şirket Profili bilgilerini çek
  useEffect(() => {
    async function fetchUserProfile() {
      if (!supabase) return
      const { data } = await supabase.from("profiles").select("company_name, phone").limit(1).single()
      if (data) {
        setProfile({
          company_name: data.company_name || "YükleGel Kullanıcısı",
          phone: data.phone || "05551234567"
        })
      }
    }
    if (isOpen) {
      fetchUserProfile()
    }
  }, [isOpen])

  const handleCreateListing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const from_city = formData.get("from") as string
    const to_city = formData.get("to") as string
    const cargo_detail = formData.get("cargo") as string
    const vehicle_type = (formData.get("vehicle") as string) || "13.60 Tenteli"
    const price = Number(formData.get("price")) || 0
    const urgent = formData.get("urgent") === "on"

    // Şirket Profili eksikse kullanıcıyı uyar
    if (!profile.company_name || profile.company_name === "YükleGel Kullanıcısı") {
      alert("Lütfen önce sol menüden 'Şirket Profili' sayfasına giderek firma adınızı ve telefon numaranızı kaydedin!")
      setIsSubmitting(false)
      return
    }

    // Supabase listings tablosuna ekleme
    const { data, error } = await supabase.from("listings").insert([
      { 
        company_name: profile.company_name, 
        phone: profile.phone, 
        from_city, 
        to_city, 
        cargo_detail, 
        vehicle_type, 
        price, 
        urgent,
        is_bot: false 
      }
    ]).select().single()

    setIsSubmitting(false)

    if (error) {
      alert("İlan eklenirken hata oluştu: " + error.message)
    } else {
      setIsOpen(false)
      if (data && onAddLoad) {
        const newLoad: Load = {
          id: `user-${data.id}`,
          company: data.company_name,
          initials: data.company_name.substring(0, 2).toUpperCase(),
          from: data.from_city,
          to: data.to_city,
          cargo: data.cargo_detail,
          vehicle: data.vehicle_type,
          distance: "450 km",
          price: `₺${Number(data.price).toLocaleString("tr-TR")}`,
          urgent: Boolean(data.urgent),
          time: "Şimdi",
          color: "bg-[#d64526]",
          source: "user",
          phone: data.phone
        }
        onAddLoad(newLoad)
      }
    }
  }

 return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setIsOpen(false);
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#122c4a]">Yeni İlan Oluştur</DialogTitle>
          <DialogDescription>Firma ve iletişim bilgileriniz profilinizden otomatik olarak eklenir.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleCreateListing}>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Firma Adı (Profilinizden)</Label>
              <Input value={profile.company_name} disabled className="bg-gray-100 text-gray-700 font-semibold cursor-not-allowed" />
            </div>
            <div className="grid gap-2">
              <Label>Telefon Numarası (Profilinizden)</Label>
              <Input value={profile.phone} disabled className="bg-gray-100 text-gray-700 font-semibold cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="from">Çıkış Şehri</Label><Input id="from" name="from" placeholder="İstanbul" required /></div>
            <div className="grid gap-2"><Label htmlFor="to">Varış Şehri</Label><Input id="to" name="to" placeholder="Ankara" required /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="cargo">Yük Cinsi / Detayı</Label><Input id="cargo" name="cargo" placeholder="Paletli Malzeme" required /></div>
            <div className="grid gap-2"><Label htmlFor="vehicle">Araç Tipi</Label><Input id="vehicle" name="vehicle" placeholder="Tır / Frigo" defaultValue="Tır" required /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="price">Tahmini Fiyat (TL)</Label><Input id="price" name="price" type="number" placeholder="15000" required /></div>
            <div className="grid gap-2"><Label htmlFor="distance">Mesafe</Label><Input id="distance" name="distance" placeholder="500 km" defaultValue="500 km" /></div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="urgent" name="urgent" className="size-4 accent-[#d64526]" />
            <Label htmlFor="urgent" className="cursor-pointer font-medium text-sm text-[#122c4a]">Acil İlan Olarak İşaretle</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="cursor-pointer" 
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer bg-[#d64526] text-white hover:bg-[#b93820]">
              {isSubmitting ? "Yayınlanıyor..." : "İlanı Yayınla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
