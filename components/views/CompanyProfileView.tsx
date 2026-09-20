"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"

export function CompanyProfileView({ onProfileUpdated }: { onProfileUpdated?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  // Google Play Uyumlu Hesap Silme State'leri
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")

  const [form, setForm] = useState({
    company_name: "",
    authorized_person: "",
    phone: "",
    tax_number: "",
    city: "",
    email: ""
  })

  const loadProfile = async () => {
    if (!supabase) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (data) {
        setForm({
          company_name: data.company_name || "",
          authorized_person: data.authorized_person || "",
          phone: data.phone || "",
          tax_number: data.tax_number || "",
          city: data.city || "",
          email: data.email || user.email || ""
        })
      } else {
        setForm((prev) => ({
          ...prev,
          email: user.email || "",
          authorized_person: user.email?.split("@")[0] || ""
        }))
      }
    } catch (err) {
      console.error("Profil yükleme hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setSaving(true)
    setMsg("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMsg("Kullanıcı oturumu bulunamadı.")
        return
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        company_name: form.company_name,
        authorized_person: form.authorized_person,
        phone: form.phone,
        tax_number: form.tax_number,
        city: form.city,
        email: form.email,
        updated_at: new Date().toISOString()
      })

      if (error) {
        setMsg("Hata: " + error.message)
      } else {
        setMsg("Profil başarıyla güncellendi.")
        if (onProfileUpdated) onProfileUpdated()
      }
    } catch (err: any) {
      setMsg("Hata oluştu: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // GOOGLE PLAY ZORUNLU HESAP VE VERİ SİLME İŞLEVİ
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "SIL") {
      alert("Lütfen işlemi onaylamak için 'SIL' yazın.")
      return
    }

    setDeleting(true)
    try {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Oturum bulunamadı.")
        return
      }

      // Kullanıcının ilanlarını ve profil verilerini temizle
      await supabase.from("listings").delete().eq("user_id", user.id)
      await supabase.from("profiles").delete().eq("id", user.id)

      await supabase.auth.signOut()
      localStorage.clear()

      alert("Hesabınız ve tüm verileriniz kalıcı olarak silindi.")
      window.location.href = "/"
    } catch (err: any) {
      console.error("Hesap silme hatası:", err)
      alert("Hesap silinirken bir hata oluştu: " + err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm font-medium text-[#6d8194]">Profil yükleniyor...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <span className="text-xs font-semibold text-[#d64526]">Hesap Ayarları</span>
        <h1 className="text-2xl font-bold text-[#122c4a]">Şirket Profili</h1>
        <p className="text-xs text-[#8da0b2]">Kurumsal bilgilerinizi, vergi numaranızı ve iletişim kanallarınızı güncelleyin.</p>
      </div>

      {msg && (
        <div className={`rounded-lg p-3 text-xs font-medium ${msg.startsWith("Hata") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-[#e4e9ef] bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Şirket / Ünvan Adı</label>
            <Input 
              value={form.company_name} 
              onChange={(e) => setForm({ ...form, company_name: e.target.value })} 
              placeholder="Örn: Gülhan Lojistik" 
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Yetkili Kişi</label>
            <Input 
              value={form.authorized_person} 
              onChange={(e) => setForm({ ...form, authorized_person: e.target.value })} 
              placeholder="Ad Soyad" 
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Telefon Numarası</label>
            <Input 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              placeholder="05xxxxxxxxx" 
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Vergi Numarası</label>
            <Input 
              value={form.tax_number} 
              onChange={(e) => setForm({ ...form, tax_number: e.target.value })} 
              placeholder="10 haneli VKN" 
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Şehir / İlçe</label>
            <Input 
              value={form.city} 
              onChange={(e) => setForm({ ...form, city: e.target.value })} 
              placeholder="Konya" 
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Kurumsal E-posta</label>
            <Input 
              disabled 
              value={form.email} 
              className="bg-gray-50 text-gray-500 cursor-not-allowed" 
            />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="bg-[#d64526] hover:bg-[#b8381e] text-white cursor-pointer">
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </form>

      {/* GOOGLE PLAY ZORUNLU: HESABI SİL BÖLÜMÜ */}
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Hesabı ve Tüm Verileri Sil</h3>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Hesabınızı sildiğinizde, Nakliye Cepte üzerindeki şirket profil bilgileriniz ve açtığınız ilanlar kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="size-4" />
            <span>Hesabımı Kalıcı Olarak Sil</span>
          </button>
        </div>
      </div>

      {/* HESAP SİLME ONAY POP-UP / MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="size-6 shrink-0" />
              <h3 className="text-base font-bold">Hesabınızı silmek istediğinize emin misiniz?</h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Devam etmek istiyorsanız aşağıya büyük harflerle <strong className="text-red-600">SIL</strong> yazınız.
            </p>

            <Input
              type="text"
              placeholder="SIL yazın"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="text-xs font-semibold"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== "SIL"}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {deleting ? "Siliniyor..." : "Evet, Hesabımı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
