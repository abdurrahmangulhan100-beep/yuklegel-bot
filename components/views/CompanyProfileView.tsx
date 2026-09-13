"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CompanyProfileView() {
  const [savedMsg, setSavedMsg] = useState(false)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
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
        {savedMsg && <div className="p-3 rounded-lg bg-[#e7f5ed] text-[#3b8068] text-sm font-medium flex items-center gap-2"><CheckCircle2 className="size-4" /> Bilgileriniz başarıyla güncellendi.</div>}
        <div className="grid gap-2"><Label>Şirket / Unvan Adı</Label><Input defaultValue="Aksoy Lojistik" required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Yetkili Kişi</Label><Input defaultValue="Mehmet Kaya" required /></div>
          <div className="grid gap-2"><Label>Telefon Numarası</Label><Input defaultValue="05551234567" required /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Vergi Numarası</Label><Input defaultValue="1234567890" required /></div>
          <div className="grid gap-2"><Label>Şehir / İlçe</Label><Input defaultValue="Konya / Selçuklu" required /></div>
        </div>
        <div className="grid gap-2"><Label>Kurumsal E-posta</Label><Input defaultValue="info@aksoyilojistik.com" type="email" required /></div>
        <div className="pt-2"><Button type="submit" className="cursor-pointer bg-[#d64526] text-white hover:bg-[#b93820]">Değişiklikleri Kaydet</Button></div>
      </form>
    </div>
  )
}
