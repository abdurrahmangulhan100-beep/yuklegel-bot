"use client"

import { useState, useEffect } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export function CompanyProfileView() {
  const [loading, setLoading] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [form, setForm] = useState({
    company_name: "",
    authorized_person: "",
    phone: "",
    tax_number: "",
    city: "",
    email: ""
  })

  // Sayfa açıldığında kayıtlı profili çek
  useEffect(() => {
    async function fetchProfile() {
      if (!supabase) return
      const { data, error } = await supabase.from("profiles").select("*").limit(1).single()
      if (data && !error) {
        setForm({
          company_name: data.company_name || "",
          authorized_person: data.authorized_person || "",
          phone: data.phone || "",
          tax_number: data.tax_number || "",
          city: data.city || "",
          email: data.email || ""
        })
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (supabase) {
      // Önce tabloda kayıt var mı kontrol et, varsa güncelle yoksa ekle
      const { data: existing } = await supabase.from("profiles").select("id").limit(1)

      if (existing && existing.length > 0) {
        await supabase.from("profiles").update(form).eq("id", existing[0].id)
      } else {
        await supabase.from("profiles").insert([form])
      }
    }

    setLoading(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-[#d64526]">Hesap Ayarları</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">Şirket Profili</h1>
        <p className="mt-2 text-sm text-[#718397]">Kurumsal bilgilerinizi, vergi numaranızı ve iletişim kanallarınızı güncelleyin.</p>
      </div>
      <form onSubmit={handleSave} className="max-w-2xl rounded-xl border border-[#e4e9ef] bg-white p-6 grid gap-4">
        {savedMsg && <div className="p-3 rounded-lg bg-[#e7f5ed] text-[#3b8068] text-sm font-medium flex items-center gap-2"><CheckCircle2 className="size-4" /> Bilgileriniz başarıyla kaydedildi.</div>}
        
        <div className="grid gap-2">
          <Label>Şirket / Unvan Adı</Label>
          <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Örn: Aksoy Lojistik" required />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Yetkili Kişi</Label>
            <Input value={form.authorized_person} onChange={e => setForm({...form, authorized_person: e.target.value})} placeholder="Ad Soyad" required />
          </div>
          <div className="grid gap-2">
            <Label>Telefon Numarası</Label>
            <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="05xx xxx xx xx" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Vergi Numarası</Label>
            <Input value={form.tax_number} onChange={e => setForm({...form, tax_number: e.target.value})} placeholder="Vergi No" required />
          </div>
          <div className="grid gap-2">
            <Label>Şehir / İlçe</Label>
            <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Konya / Selçuklu" required />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Kurumsal E-posta</Label>
          <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="info@sirket.com" type="email" required />
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
