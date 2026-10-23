"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ShieldAlert, ShieldCheck, LogIn } from "lucide-react"
import { Sheet } from "@/components/Sheet"
import { cn } from "@/lib/utils"

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
  
  // Google Play UGC Şartlar Onay Kutusu
  const [acceptedTerms, setAcceptedTerms] = useState(false)

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
    setAcceptedTerms(false)
    setFormData((prev) => ({ ...prev, fromDistrict: "", toDistrict: "", price: "", priceType: "total", description: "", distance: "", isUrgent: false }))

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

    // Google Play UGC Politika Onay Kontrolü
    if (!acceptedTerms) {
      setErrorMsg("Lütfen ilan yayınlamadan önce Hizmet Şartları ve Yayın Kurallarını kabul ediniz.")
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

    // Telefonu 05XXXXXXXXX biçimine getir
    const normalizedPhone = "0" + cleanPhone.replace(/^0/, "")

    // Ton başı fiyat ve mesafe bilgisi ayrı sütun olmadığından açıklamaya eklenir
    const extras: string[] = []
    if (formData.price && formData.priceType === "ton") extras.push("Ton başı fiyat")
    if (formData.distance.trim()) extras.push(`Mesafe: ${formData.distance.trim()}`)
    const finalMessage = [formData.description.trim(), extras.join(" · ")].filter(Boolean).join(" | ")

    const priceNumber = Number(formData.price)

    // Yükleme ve teslimat aynı yer olamaz (ilçe farklıysa şehir içi taşıma serbest)
    if (formData.fromCity === formData.toCity && formData.fromDistrict.trim().toLowerCase() === formData.toDistrict.trim().toLowerCase()) {
      setErrorMsg("Yükleme ve teslimat yeri aynı olamaz. Farklı bir şehir veya ilçe seçin.")
      return
    }

    setLoading(true)

    try {
      if (!supabase) {
        setErrorMsg("Veritabanı bağlantısı kurulamadı.")
        return
      }

      const { error } = await supabase
        .from('listings')
        .insert([
          {
            user_id: userId,
            company_name: formData.companyName,
            phone: normalizedPhone,
            from_city: formData.fromDistrict ? `${formData.fromCity} - ${formData.fromDistrict}` : formData.fromCity,
            to_city: formData.toDistrict ? `${formData.toCity} - ${formData.toDistrict}` : formData.toCity,
            cargo_detail: formData.cargoType,
            vehicle_type: formData.vehicleType,
            price: Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : null,
            message: finalMessage,
            urgent: formData.isUrgent
          }
        ])

      if (error) {
        console.error("Kayıt Hatası:", error)
        // Teknik veritabanı mesajını kullanıcıya göstermeyiz (konsola yazıldı)
        setErrorMsg(
          error.code === "42501"
            ? "Bu işlem için yetkiniz yok. Çıkış yapıp tekrar giriş yapmayı deneyin."
            : "İlan şu an kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin."
        )
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

  const fieldClass =
    "h-12 w-full rounded-xl border border-[#dbe3ec] bg-white px-3.5 text-base text-[#122c4a] outline-none transition-colors placeholder:text-[#a3b1c0] focus:border-[#122c4a] focus:ring-4 focus:ring-[#122c4a]/10 disabled:opacity-50 md:text-sm"
  const labelClass = "mb-1.5 block text-xs font-semibold text-[#334e68]"
  const sectionClass = "space-y-3.5 rounded-2xl border border-[#edf0f3] bg-[#fafbfd] p-4"

  const footer = isGuestUser ? (
    <button
      type="button"
      onClick={() => { handleClose(); router.push("/login") }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#122c4a] text-sm font-semibold text-white transition-colors hover:bg-[#1a3d68]"
    >
      <LogIn className="size-4" />
      Giriş Yap / Kayıt Ol
    </button>
  ) : (
    <div className="space-y-2.5">
      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="grid grid-cols-[1fr_2fr] gap-2.5">
        <button
          type="button"
          onClick={handleClose}
          className="h-12 rounded-xl border border-[#dbe3ec] text-sm font-semibold text-[#334e68] transition-colors hover:bg-[#f5f7fa]"
        >
          İptal
        </button>
        <button
          type="submit"
          form="create-listing-form"
          disabled={loading || !acceptedTerms}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d64526] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b93820] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="size-4" />
          <span>{loading ? "Yayınlanıyor..." : "İlanı Yayınla"}</span>
        </button>
      </div>
    </div>
  )

  return (
    <Sheet
      open={isOpen}
      onClose={handleClose}
      title="Yeni İlan Oluştur"
      subtitle="Firma ve iletişim bilgileriniz profilinizden otomatik çekilir."
      footer={footer}
    >
      {isGuestUser ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
            <ShieldAlert className="size-8" />
          </div>
          <p className="text-base font-bold text-[#122c4a]">İlan vermek için giriş yapın</p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[#627d98]">
            Misafir hesaplar ilan ekleyemez. Ücretsiz üye olarak dakikalar içinde ilan yayınlayabilirsiniz.
          </p>
        </div>
      ) : (
        <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* İletişim */}
          <div className={sectionClass}>
            <div>
              <label className={labelClass} htmlFor="cl-company">Firma Adı</label>
              <input
                id="cl-company"
                type="text"
                autoComplete="organization"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-phone">Cep Telefonu</label>
              <input
                id="cl-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
                className={fieldClass}
                required
              />
            </div>
          </div>

          {/* Güzergah */}
          <div className={sectionClass}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">Güzergah</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="cl-from">Çıkış Şehri</label>
                <select id="cl-from" value={formData.fromCity} onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })} className={fieldClass}>
                  {SEHIRLER.map((sehir) => (<option key={sehir} value={sehir}>{sehir}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cl-from-d">İlçe (ops.)</label>
                <input id="cl-from-d" type="text" placeholder="Örn: Meram" value={formData.fromDistrict} onChange={(e) => setFormData({ ...formData, fromDistrict: e.target.value })} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cl-to">Varış Şehri</label>
                <select id="cl-to" value={formData.toCity} onChange={(e) => setFormData({ ...formData, toCity: e.target.value })} className={fieldClass}>
                  {SEHIRLER.map((sehir) => (<option key={sehir} value={sehir}>{sehir}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cl-to-d">İlçe (ops.)</label>
                <input id="cl-to-d" type="text" placeholder="Örn: Merkez" value={formData.toDistrict} onChange={(e) => setFormData({ ...formData, toDistrict: e.target.value })} className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-distance">Mesafe (ops.)</label>
              <input id="cl-distance" type="text" placeholder="Örn: 500 km" value={formData.distance} onChange={(e) => setFormData({ ...formData, distance: e.target.value })} className={fieldClass} />
            </div>
          </div>

          {/* Yük & araç */}
          <div className={sectionClass}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">Yük ve Araç</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="cl-cargo">Yük Cinsi</label>
                <select id="cl-cargo" value={formData.cargoType} onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })} className={fieldClass}>
                  {YUK_CİNSLERİ.map((yuk) => (<option key={yuk} value={yuk}>{yuk}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="cl-vehicle">Araç Tipi</label>
                <select id="cl-vehicle" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })} className={fieldClass}>
                  {ARAÇ_TİPLERİ.map((arac) => (<option key={arac} value={arac}>{arac}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Fiyat */}
          <div className={sectionClass}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#8da0b2]">Fiyatlandırma</div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#eaeff4] p-1" role="radiogroup" aria-label="Fiyatlandırma türü">
              {[
                { value: "total", label: "Götürü / Toplam" },
                { value: "ton", label: "Ton Başı" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={formData.priceType === opt.value}
                  onClick={() => setFormData({ ...formData, priceType: opt.value })}
                  className={cn(
                    "h-10 rounded-lg text-[13px] font-semibold transition-all",
                    formData.priceType === opt.value ? "bg-white text-[#122c4a] shadow-sm" : "text-[#627d98]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <label className={labelClass} htmlFor="cl-price">
                {formData.priceType === "ton" ? "Ton Başı Fiyat (TL)" : "Toplam Fiyat (TL)"}
              </label>
              <input
                id="cl-price"
                type="text"
                inputMode="numeric"
                placeholder="Örn: 18000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                className={fieldClass}
              />
            </div>
          </div>

          {/* Açıklama + acil */}
          <div>
            <label className={labelClass} htmlFor="cl-desc">Açıklama / Özel Notlar (ops.)</label>
            <input
              id="cl-desc"
              type="text"
              placeholder="Örn: Yükleme saati 14:00, kapalı kasa tercih sebebidir..."
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={fieldClass}
            />
          </div>

          <label
            htmlFor="urgent"
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors",
              formData.isUrgent ? "border-[#d64526] bg-[#fff6f3]" : "border-[#e4e9ef] bg-white"
            )}
          >
            <input
              type="checkbox"
              id="urgent"
              checked={formData.isUrgent}
              onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
              className="size-5 shrink-0 cursor-pointer accent-[#d64526]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#122c4a]">Acil ilan olarak işaretle</span>
              <span className="block text-xs text-[#718397]">İlanınız öne çıkarılır ve acil yükler arasında görünür.</span>
            </span>
          </label>

          {/* GOOGLE PLAY UGC POLİTİKA ONAY KUTUSU (EULA & ŞARTLAR) */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#d64526]"
              />
              <span className="text-xs leading-relaxed text-[#4a5568]">
                İlanımda <strong>yasalara aykırı, yanıltıcı veya genel ahlaka uymayan</strong> içerik bulunmadığını, aksi takdirde ilanımın silineceğini ve hesabımın engellenebileceğini bildiren <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#d64526] underline">Kullanım Koşulları & Topluluk Kurallarını</a> okudum ve kabul ediyorum.
              </span>
            </label>
          </div>
        </form>
      )}
    </Sheet>
  )
}
