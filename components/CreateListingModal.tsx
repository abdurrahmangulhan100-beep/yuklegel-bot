"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

interface CreateListingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const SEHIRLER = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya",
  "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne",
  "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu",
  "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya",
  "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu",
  "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray",
  "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan",
  "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
]

const ARAÇ_TİPLERİ = ["Tır", "Damperli Tır", "Kamyon", "Frigo", "Kırkayak", "Panelvan", "Pikap"]
const YUK_CİNSLERİ = ["Kömür", "Tahıl / Hububat", "Demir / Çelik", "Paletli Yük", "Gıda", "İnşaat Malzemesi", "Mobilya", "Dökme Yük", "Tekstil", "Diğer"]

export function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "GÜLHAN NAKLİYAT",
    phone: "05421698053",
    fromCity: "Adana",
    fromDistrict: "",
    toCity: "Adana",
    toDistrict: "",
    cargoType: "Kömür",
    vehicleType: "Damperli Tır",
    priceType: "total", // "ton" | "total"
    price: "",
    description: "",
    distance: "",
    isUrgent: false
  })

  // Modal kapama fonksiyonu
  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Supabase kayıt kodların buraya gelecek
      // const { data, error } = await supabase.from('listings').insert([...])

      console.log("Gönderilen İlan Verisi:", formData)

      if (onSuccess) onSuccess()
      handleClose()
    } catch (error) {
      console.error("İlan oluşturulurken hata:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-[650px] bg-white text-[#122c4a] max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-[#122c4a]">
            Yeni İlan Oluştur
          </DialogTitle>
          <p className="text-xs text-gray-500">
            Firma ve iletişim bilgileriniz profilinizden otomatik çekilir. Ayrıntıları doldurarak ilanınızı hemen paylaşın.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Firma ve Telefon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Firma Adı</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="bg-gray-50 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Telefon Numarası</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-gray-50 text-xs"
                required
              />
            </div>
          </div>

          {/* Çıkış Şehri ve İlçesi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Çıkış Şehri</Label>
              <Select
                value={formData.fromCity}
                onValueChange={(value) => setFormData({ ...formData, fromCity: value })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Şehir Seçin" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {SEHIRLER.map((sehir) => (
                    <SelectItem key={sehir} value={sehir} className="text-xs">
                      {sehir}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Çıkış İlçesi / Bölge (Opsiyonel)</Label>
              <Input
                placeholder="Örn: Çayıran, Meram vb."
                value={formData.fromDistrict}
                onChange={(e) => setFormData({ ...formData, fromDistrict: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* Varış Şehri ve İlçesi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Varış Şehri</Label>
              <Select
                value={formData.toCity}
                onValueChange={(value) => setFormData({ ...formData, toCity: value })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Şehir Seçin" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {SEHIRLER.map((sehir) => (
                    <SelectItem key={sehir} value={sehir} className="text-xs">
                      {sehir}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Varış İlçesi / Bölge (Opsiyonel)</Label>
              <Input
                placeholder="Örn: Ilgın, Merkez vb."
                value={formData.toDistrict}
                onChange={(e) => setFormData({ ...formData, toDistrict: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* Yük Cinsi ve Araç Tipi */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Yük Cinsi</Label>
              <Select
                value={formData.cargoType}
                onValueChange={(value) => setFormData({ ...formData, cargoType: value })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {YUK_CİNSLERİ.map((yuk) => (
                    <SelectItem key={yuk} value={yuk} className="text-xs">
                      {yuk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Araç Tipi</Label>
              <Select
                value={formData.vehicleType}
                onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {ARAÇ_TİPLERİ.map((arac) => (
                    <SelectItem key={arac} value={arac} className="text-xs">
                      {arac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fiyatlandırma Kutusu */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#122c4a]">Fiyatlandırma Türü</Label>
              <RadioGroup
                value={formData.priceType}
                onValueChange={(val) => setFormData({ ...formData, priceType: val })}
                className="flex items-center gap-4 text-xs"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="ton" id="ton" />
                  <Label htmlFor="ton" className="text-xs cursor-pointer">Ton Başı Fiyat</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="total" id="total" />
                  <Label htmlFor="total" className="text-xs cursor-pointer">Götürü / Toplam Fiyat</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Toplam Fiyat (TL)</Label>
              <Input
                type="number"
                placeholder="Örn: 18000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="bg-white text-xs"
              />
            </div>
          </div>

          {/* Özel Notlar */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">İlan Açıklaması / Özel Notlar (Opsiyonel)</Label>
            <Input
              placeholder="Örn: Yükleme saati 14:00, kapalı kasa tercih sebebidir..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="text-xs"
            />
          </div>

          {/* Mesafe ve Acil İşareti */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mesafe (İsteğe Bağlı)</Label>
              <Input
                placeholder="Örn: 500 km"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="flex items-center space-x-2 pt-5">
              <Checkbox
                id="urgent"
                checked={formData.isUrgent}
                onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: !!checked })}
              />
              <Label htmlFor="urgent" className="text-xs font-semibold cursor-pointer text-[#122c4a]">
                Acil İlan OlaraK İşaretle
              </Label>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="text-xs px-5 border-gray-300 hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#d64526] hover:bg-[#b93820] text-white text-xs px-5"
            >
              {loading ? "Yayınlanıyor..." : "İlanı Yayınla"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
