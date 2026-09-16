"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase" // Supabase client yolunuzu kontrol edin
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type CreateListingModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(false)

  // Form State'leri
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [fromCity, setFromCity] = useState("")
  const [toCity, setToCity] = useState("")
  const [cargo, setCargo] = useState("")
  const [vehicleType, setVehicleType] = useState("Tır")
  const [price, setPrice] = useState("")
  const [distance, setDistance] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)

  // Modal açıldığında sadece GİRİŞ YAPAN KULLANICININ profilini çek
  useEffect(() => {
    async function loadUserProfile() {
      if (!isOpen) return
      setFetchingProfile(true)

      try {
        // 1. O an oturum açmış aktif kullanıcıyı al
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error("Kullanıcı oturumu bulunamadı:", authError)
          setFetchingProfile(false)
          return
        }

        // 2. SADECE bu kullanıcının ID'sine ait profil verisini çek (.eq("id", user.id))
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_name, phone")
          .eq("id", user.id) // KRİTİK NOKTA: Başkasının firmasını çekmesini engeller
          .maybeSingle()

        if (profileError) {
          console.error("Profil verisi çekilemedi:", profileError)
        } else if (profile) {
          setCompanyName(profile.company_name || "")
          setPhone(profile.phone || "")
        }
      } catch (err) {
        console.error("Beklenmeyen hata:", err)
      } finally {
        setFetchingProfile(false)
      }
    }

    loadUserProfile()
  }, [isOpen])

  // İlanı kaydetme fonksiyonu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert("İlan oluşturmak için giriş yapmalısınız.")
        setLoading(false)
        return
      }

      // İlanı veritabanına ekle
      const { error } = await supabase.from("listings").insert([
        {
          user_id: user.id, // İlanın sahibini belirliyoruz
          company_name: companyName,
          phone: phone,
          from_city: fromCity,
          to_city: toCity,
          cargo_type: cargo,
          vehicle_type: vehicleType,
          price: parseFloat(price) || 0,
          distance: distance,
          is_urgent: isUrgent,
          source: "user"
        }
      ])

      if (error) throw error

      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      alert("İlan eklenirken bir hata oluştu: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-white text-[#122c4a]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Yeni İlan Oluştur</DialogTitle>
          <DialogDescription className="text-xs text-[#718397]">
            Firma ve iletişim bilgileriniz profilinizden otomatik olarak eklenir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Firma Adı (Profilinizden)</Label>
              <Input
                value={companyName}
                readOnly
                disabled
                placeholder={fetchingProfile ? "Yükleniyor..." : "Firma Adı"}
                className="bg-[#f5f7fa] cursor-not-allowed text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Telefon Numarası (Profilinizden)</Label>
              <Input
                value={phone}
                readOnly
                disabled
                placeholder={fetchingProfile ? "Yükleniyor..." : "05XX XXX XX XX"}
                className="bg-[#f5f7fa] cursor-not-allowed text-xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Çıkış Şehri</Label>
              <Input
                required
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                placeholder="Örn: İstanbul"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Varış Şehri</Label>
              <Input
                required
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                placeholder="Örn: Ankara"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Yük Cinsi / Detayı</Label>
              <Input
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Örn: Paletli Malzeme"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Araç Tipi</Label>
              <Input
                required
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="Örn: Tır, Kamyon"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tahmini Fiyat (TL)</Label>
              <Input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="15000"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mesafe</Label>
              <Input
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="500 km"
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="urgent"
              checked={isUrgent}
              onCheckedChange={(checked) => setIsUrgent(!!checked)}
            />
            <Label htmlFor="urgent" className="text-xs cursor-pointer font-medium">
              Acil İlan Olarak İşaretle
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#edf0f3]">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              İptal
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#d64526] hover:bg-[#b93820] text-white text-xs">
              {loading ? "Yayınlanıyor..." : "İlanı Yayınla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
