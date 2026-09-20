"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ShieldAlert, PhoneCall } from "lucide-react"

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isGuestUser, setIsGuestUser] = useState(false)

  const [formData, setFormData] = useState({
    companyName: "",
    phone: "",
    fromCity: "Afyonkarahisar",
    fromDistrict: "",
    toCity: "Adana",
    toDistrict: "",
    cargoType: "Kömür",
    vehicleType: "Damperli Tır",
    priceType: "total", 
    price: "",
    description: "",
    distance: "",
    isUrgent: false
  })

  useEffect(() => {
    if (!isOpen) return
    setErrorMsg(null)

    // 1. MİSAFİR KULLANICI KONTROLÜ
    const checkGuest = typeof window !== 'undefined' ? localStorage.getItem("is_guest") === "true" : false
    setIsGuestUser(checkGuest)

    if (checkGuest) {
      setErrorMsg("İlan yayınlamak için kayıtlı bir hesaba giriş yapmanız gerekmektedir. Misafir hesaplar ilan ekleyemez.")
      return
    }

    const loadUserProfile = async () => {
      if (!supabase) return

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setErrorMsg("Giriş yapılmış oturum bulunamadı.")
          return
        }

        setUserId(user.id)

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        setFormData((prev) => ({
          ...prev,
          companyName: profile?.company_name || user.email?.split("@")[0] || "Şirket Adı",
          phone: profile?.phone || user.user_metadata?.phone || ""
        }))
      } catch (err) {
        console.error("Kullanıcı bilgisi çekme hatası:", err)
      }
    }

    loadUserProfile()
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setErrorMsg(null)
    if (typeof onClose === "function") {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Misafir engeli
    if (isGuestUser) {
      setErrorMsg("Misafir hesaplar ilan yayınlayamaz. Lütfen üye girişi yapın.")
      setTimeout(() => {
        handleClose()
        router.push("/login")
      }, 1500)
      return
    }

    // Telefon Validasyonu
    const cleanPhone = formData.phone.replace(/\s+/g, "")
    const phoneRegex = /^(0?5\d{9})$/
    const isFakePhone = /^0?5(\d)\1{8,}$/.test(cleanPhone) // 05323333333 / 05555555555 engeli

    if (!phoneRegex.test(cleanPhone) || isFakePhone) {
      setErrorMsg("Lütfen geçerli bir cep telefonu numarası giriniz (Örn: 0532 123 45 67).")
      return
    }

    if (!formData.companyName.trim() || formData.companyName.trim().length < 2) {
      setErrorMsg("Lütfen geçerli bir firma adı giriniz.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('listings')
        .insert([
          {
            user_id: userId,
            company_name: formData.companyName,
            phone: cleanPhone,
            from_city: formData.fromDistrict ? `${formData.fromCity} - ${formData.fromDistrict}` : formData.fromCity,
            to_city: formData.toDistrict ? `${formData.toCity} - ${formData.toDistrict}` : formData.toCity,
            cargo_detail: formData.cargoType,
            vehicle_type: formData.vehicleType,
            price: formData.price ? Number(formData.price) : null,
            message: formData.description,
            urgent: formData.isUrgent
          }
        ])

      if (error) {
        console.error("Kayıt Hatası:", error)
        setErrorMsg("İlan kaydedilemedi: " + error.message)
        return
      }

      if (onSuccess) onSuccess()
      handleClose()
    } catch (error) {
      console.error("İlan oluşturulurken beklenmeyen hata:", error)
      setErrorMsg("Bir hata oluştu, lütfen tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div 
        className="relative w-full max-w-2xl bg-white text-[#122c4a] rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ✕
        </button>

        <div className="border-b pb-3 pr-8">
          <h2 className="text-xl font-bold text-[#122c4a]">Yeni İlan Oluştur</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Firma ve iletişim bilgileriniz profilinizden otomatik çekilir. Ayrıntıları doldurarak ilanınızı hemen paylaşın.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-semibold">
            <ShieldAlert className="size-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Firma Adı</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:border-[#d64526]"
                required
                disabled={isGuestUser}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Telefon Numarası (Örn: 05321234567)</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:border-[#d64526]"
                required
                disabled={isGuestUser}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Çıkış Şehri</label>
              <select
                value={formData.fromCity}
                onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              >
                {SEHIRLER.map((sehir) => (
                  <option key={sehir} value={sehir}>{sehir}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Çıkış İlçesi / Bölge (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Çayıran, Meram vb."
                value={formData.fromDistrict}
                onChange={(e) => setFormData({ ...formData, fromDistrict: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Varış Şehri</label>
              <select
                value={formData.toCity}
                onChange={(e) => setFormData({ ...formData, toCity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              >
                {SEHIRLER.map((sehir) => (
                  <option key={sehir} value={sehir}>{sehir}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Varış İlçesi / Bölge (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Ilgın, Merkez vb."
                value={formData.toDistrict}
                onChange={(e) => setFormData({ ...formData, toDistrict: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Yük Cinsi</label>
              <select
                value={formData.cargoType}
                onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              >
                {YUK_CİNSLERİ.map((yuk) => (
                  <option key={yuk} value={yuk}>{yuk}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Araç Tipi</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              >
                {ARAÇ_TİPLERİ.map((arac) => (
                  <option key={arac} value={arac}>{arac}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#122c4a]">Fiyatlandırma Türü</label>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    value="ton"
                    checked={formData.priceType === "ton"}
                    onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                    className="accent-[#d64526]"
                    disabled={isGuestUser}
                  />
                  <span>Ton Başı Fiyat</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    value="total"
                    checked={formData.priceType === "total"}
                    onChange={(e) => setFormData({ ...formData, priceType: e.target.value })}
                    className="accent-[#d64526]"
                    disabled={isGuestUser}
                  />
                  <span>Götürü / Toplam Fiyat</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium block text-[#122c4a]">Toplam Fiyat (TL)</label>
              <input
                type="number"
                placeholder="Örn: 18000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold block text-[#122c4a]">İlan Açıklaması / Özel Notlar (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Örn: Yükleme saati 14:00, kapalı kasa tercih sebebidir..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
              disabled={isGuestUser}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-xs font-semibold block text-[#122c4a]">Mesafe (İsteğe Bağlı)</label>
              <input
                type="text"
                placeholder="Örn: 500 km"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#d64526]"
                disabled={isGuestUser}
              />
            </div>
            <div className="flex items-center gap-2 sm:pt-5">
              <input
                type="checkbox"
                id="urgent"
                checked={formData.isUrgent}
                onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                className="w-4 h-4 accent-[#d64526] rounded cursor-pointer"
                disabled={isGuestUser}
              />
              <label htmlFor="urgent" className="text-xs font-semibold text-[#122c4a] cursor-pointer">
                Acil İlan Olarak İşaretle
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || isGuestUser}
              className="px-4 py-2 bg-[#d64526] hover:bg-[#b93820] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Yayınlanıyor..." : "İlanı Yayınla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
