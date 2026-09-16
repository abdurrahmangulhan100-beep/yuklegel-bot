"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function CompanyProfileView({ onProfileUpdated }: { onProfileUpdated?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

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
      // 1. Giriş yapmış mevcut kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. YALNIZCA bu kullanıcıya ait profili çek (.eq("id", user.id) şartı kritik)
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
        // Kullanıcının veritabanında henüz profili yoksa varsayılan bilgileri doldur
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

      // Kullanıcının kendi ID'si ile kaydı güncelle / oluştur (upsert)
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

  if (loading) {
    return <div className="p-8 text-center text-sm font-medium text-[#6d8194]">Profil yükleniyor...</div>
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <span className="text-xs font-semibold text-[#d64526]">Hesap Ayarları</span>
        <h1 className="text-2xl font-bold text-[#122c4a]">Şirket Profili</h1>
        <p className="text-xs text-[#8da0b2]">Kurumsal bilgilerinizi, vergi numaranızı ve iletişim kanallarınızı güncelleyin.</p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg p-3 text-xs font-medium ${msg.startsWith("Hata") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
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

        <Button type="submit" disabled={saving} className="bg-[#d64526] hover:bg-[#b8381e] text-white">
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </form>
    </div>
  )
}
