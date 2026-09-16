"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface CompanyProfileViewProps {
  onProfileUpdated?: () => void
}

export function CompanyProfileView({ onProfileUpdated }: CompanyProfileViewProps) {
  const [loading, setLoading] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState({
    company_name: "",
    authorized_person: "",
    phone: "",
    tax_number: "",
    city: "",
    email: ""
  })

  useEffect(() => {
    async function fetchProfile() {
      if (!supabase) return

      const isGuest = localStorage.getItem("is_guest") === "true"
      if (isGuest) {
        setErrorMsg("Misafir modundasınız. Profilinizi kaydetmek için lütfen üye girişi yapın.")
        return
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setErrorMsg("Oturum bulunamadı. Lütfen giriş yapın.")
          return
        }

        setUserId(user.id)
        const userEmail = user.email || ""

        // 406 Not Acceptable hatasını önlemek için explicit alan seçimi
        const { data, error } = await supabase
          .from("profiles")
          .select("id, company_name, authorized_person, phone, tax_number, city, email")
          .eq("id", user.id)
          .maybeSingle()

        if (error) {
          console.error("Profil çekme hatası:", error.message)
          // Veritabanı hatası alsa bile kullanıcının e-postasını formda göster
          setForm(prev => ({ ...prev, email: userEmail }))
          return
        }

        if (data) {
          setForm({
            company_name: data.company_name || "",
            authorized_person: data.authorized_person || userEmail.split("@")[0] || "",
            phone: data.phone || "",
            tax_number: data.tax_number || "",
            city: data.city || "",
            email: data.email || userEmail
          })
        } else {
          // profiles tablosunda henüz satır yoksa e-posta bilgisini yerleştir
          setForm(prev => ({ 
            ...prev, 
            email: userEmail,
            authorized_person: userEmail.split("@")[0] || "" 
          }))
        }
      } catch (err: any) {
        console.error("Beklenmeyen hata:", err)
        setErrorMsg("Profil yüklenirken bir sorun oluştu.")
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavedMsg(false)
    setErrorMsg(null)

    const isGuest = localStorage.getItem("is_guest") === "true"
    if (isGuest || !userId) {
      setErrorMsg("Misafir modunda kayıt yapılamaz. Lütfen gerçek bir hesapla giriş yapın.")
      return
    }

    setLoading(true)

    try {
      if (supabase) {
        // SQL RLS politikalarına uyumlu upsert işlemi
        const { error } = await supabase.from("profiles").upsert({
          id: userId,
          company_name: form.company_name,
          authorized_person: form.authorized_person,
          phone: form.phone,
          tax_number: form.tax_number,
          city: form.city,
          email: form.email,
          updated_at: new Date().toISOString()
        })

        if (error) {
          setErrorMsg("Kaydedilirken hata oluştu: " + error.message)
        } else {
          setSavedMsg(true)
          if (onProfileUpdated) {
            onProfileUpdated()
          }
          setTimeout(() => setSavedMsg(false), 3000)
        }
      }
    } catch (err: any) {
      setErrorMsg("Bağlantı hatası: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Hesap Ayarları</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Şirket Profili</h1>
        <p className="mt-2 text-sm text-[#718397]">Kurumsal bilgilerinizi, vergi numaranızı ve iletişim kanallarınızı güncelleyin.</p>
      </div>
      <form onSubmit={handleSave} className="max-w-2xl rounded-xl border border-[#e4e9ef] bg-white p-6 grid gap-4">
        {savedMsg && (
          <div className="p-3 rounded-lg bg-[#e7f5ed] text-[#3b8068] text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="size-4" /> Bilgileriniz başarıyla kaydedildi.
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2">
            <AlertCircle className="size-4" /> {errorMsg}
          </div>
        )}

        <div className="grid gap-2">
          <Label>Şirket / Unvan Adı</Label>
          <Input 
            value={form.company_name} 
            onChange={e => setForm({...form, company_name: e.target.value})} 
            placeholder="Örn: Aksoy Lojistik" 
            required 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Yetkili Kişi</Label>
            <Input 
              value={form.authorized_person} 
              onChange={e => setForm({...form, authorized_person: e.target.value})} 
              placeholder="Ad Soyad" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label>Telefon Numarası</Label>
            <Input 
              value={form.phone} 
              onChange={e => setForm({...form, phone: e.target.value})} 
              placeholder="05xx xxx xx xx" 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Vergi Numarası</Label>
            <Input 
              value={form.tax_number} 
              onChange={e => setForm({...form, tax_number: e.target.value})} 
              placeholder="Vergi No" 
              required 
            />
          </div>
          <div className="grid gap-2">
            <Label>Şehir / İlçe</Label>
            <Input 
              value={form.city} 
              onChange={e => setForm({...form, city: e.target.value})} 
              placeholder="Konya / Selçuklu" 
              required 
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Kurumsal E-posta</Label>
          <Input 
            value={form.email} 
            disabled
            className="bg-gray-100 cursor-not-allowed" 
            placeholder="info@sirket.com" 
            type="email" 
          />
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={loading} className="cursor-pointer bg-[#d64526] text-white hover:bg-[#b93820]">
            {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </div>
      </form>
    </div>
  )
}
