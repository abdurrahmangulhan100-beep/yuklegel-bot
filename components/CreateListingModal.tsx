"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateListingModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
]

const VEHICLE_TYPES = [
  "Tır (13.60)", "Damperli Tır", "Kamyon", "Kırkayak", "Onteker", "Kamyonet", "Lowbed", "Tanker", "Frigo / Soğutmalı"
]

const CARGO_TYPES = [
  "Kömür", "Hububat / Tahıl", "Gübre", "Demir / Çelik", "Paletli Malzeme", "İnşaat Malzemesi", "Dökme Yük", "Kuru Yük", "Diğer"
]

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingProfile, setFetchingProfile] = useState(false)

  // Form State'leri
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [fromCity, setFromCity] = useState("")
  const [toCity, setToCity] = useState("")
  const [cargo, setCargo] = useState("Kömür")
  const [customCargo, setCustomCargo] = useState("")
  const [vehicleType, setVehicleType] = useState("Damperli Tır")
  
  // Fiyat Hesaplama State'leri
  const [priceType, setPriceType] = useState<"total" | "per_ton">("per_ton")
  const [unitPrice, setUnitPrice] = useState("")
  const [tonnage, setTonnage] = useState("")
  
  const [distance, setDistance] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)

  // Modal kapandığında state'leri sıfırla
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  useEffect(() => {
    async function loadUserProfile() {
      if (!isOpen) return
      setFetchingProfile(true)

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setFetchingProfile(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("company_name, phone")
          .eq("id", user.id)
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

  // Toplam Tutar Hesaplama (Ton Başı x Tonaj)
  const calculatedTotalPrice = () => {
    if (priceType === "per_ton") {
      const p = parseFloat(unitPrice) || 0
      const t = parseFloat(tonnage) || 0
      return p * t
    }
    return parseFloat(unitPrice) || 0
  }

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

      const finalCargo = cargo === "Diğer" ? customCargo : cargo
      const totalPrice = calculatedTotalPrice()

      const { error } = await supabase.from("listings").insert([
        {
          user_id: user.id,
          company_name: companyName,
          phone: phone,
          from_city: fromCity,
          to_city: toCity,
          cargo_type: finalCargo,
          vehicle_type: vehicleType,
          price: totalPrice,
          price_type: priceType,
          unit_price: parseFloat(unitPrice) || 0,
          tonnage: parseFloat(tonnage) || null,
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-white text-[#122c4a]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Yeni İlan Oluştur</DialogTitle>
          <DialogDescription className="text-xs text-[#718397]">
            Firma ve iletişim bilgileriniz profilinizden otomatik çekilir. İlan ayrıntılarını seçip hızlıca oluşturabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Profil Bilgileri */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Firma Adı</Label>
              <Input
                value={companyName}
                readOnly
                disabled
                placeholder={fetchingProfile ? "Yükleniyor..." : "Firma Adı"}
                className="bg-[#f5f7fa] cursor-not-allowed text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Telefon Numarası</Label>
              <Input
                value={phone}
                readOnly
                disabled
                placeholder={fetchingProfile ? "Yükleniyor..." : "05XX XXX XX XX"}
                className="bg-[#f5f7fa] cursor-not-allowed text-xs font-medium"
              />
            </div>
          </div>

          {/* Çıkış ve Varış Şehri (Dropdown) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Çıkış Şehri</Label>
              <select
                required
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">İl Seçiniz</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Varış Şehri</Label>
              <select
                required
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">İl Seçiniz</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Yük Cinsi ve Araç Tipi (Dropdown) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Yük Cinsi</Label>
              <select
                required
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CARGO_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {cargo === "Diğer" && (
                <Input
                  required
                  value={customCargo}
                  onChange={(e) => setCustomCargo(e.target.value)}
                  placeholder="Yük detayını yazınız"
                  className="text-xs mt-1"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Araç Tipi</Label>
              <select
                required
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fiyat Tipi ve Ton Başı Fiyat Hesaplama */}
          <div className="p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#122c4a]">Fiyatlandırma Türü</Label>
              <div className="flex items-center space-x-3 text-xs">
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    checked={priceType === "per_ton"}
                    onChange={() => setPriceType("per_ton")}
                    className="text-[#d64526]"
                  />
                  <span>Ton Başı Fiyat</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    checked={priceType === "total"}
                    onChange={() => setPriceType("total")}
                    className="text-[#d64526]"
                  />
                  <span>Götürü / Toplam Fiyat</span>
                </label>
              </div>
            </div>

            {priceType === "per_ton" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Ton Başı Fiyat (TL/Ton)</Label>
                  <Input
                    type="number"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Örn: 650"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Miktar (Ton)</Label>
                  <Input
                    type="number"
                    required
                    value={tonnage}
                    onChange={(e) => setTonnage(e.target.value)}
                    placeholder="Örn: 27"
                    className="text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Toplam Fiyat (TL)</Label>
                <Input
                  type="number"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Örn: 18000"
                  className="text-xs"
                />
              </div>
            )}

            {priceType === "per_ton" && parseFloat(unitPrice) > 0 && parseFloat(tonnage) > 0 && (
              <div className="text-right text-xs font-medium text-[#0284c7]">
                Hesaplanan Toplam Tutar: <span className="font-bold">{calculatedTotalPrice().toLocaleString("tr-TR")} TL</span>
              </div>
            )}
          </div>

          {/* Mesafe ve Acil İlan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mesafe (İsteğe Bağlı)</Label>
              <Input
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Örn: 500 km"
                className="text-xs"
              />
            </div>
            <div className="flex items-end pb-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-[#d64526] focus:ring-[#d64526]"
                />
                <Label htmlFor="urgent" className="text-xs cursor-pointer font-medium">
                  Acil İlan Olarak İşaretle
                </Label>
              </div>
            </div>
          </div>

          {/* Butonlar */}
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
