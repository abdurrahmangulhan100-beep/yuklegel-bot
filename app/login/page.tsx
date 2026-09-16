"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    if (!supabase) {
      setErrorMsg("Veritabanı bağlantısı kurulamadı.")
      setLoading(false)
      return
    }

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // İsteğe bağlı: Kayıt sırasında varsayılan kullanıcı adı/şirket adı gönderme
          data: {
            full_name: email.split("@")[0],
            company_name: "Yeni Firma",
          },
        },
      })

      if (error) {
        setErrorMsg("Kayıt olunamadı: " + error.message)
      } else if (data.user && data.session === null) {
        setSuccessMsg("Kayıt başarılı! Lütfen e-posta adresinizi doğrulayın.")
      } else {
        localStorage.removeItem("is_guest")
        window.location.replace("/")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setErrorMsg("Giriş başarısız: " + error.message)
      } else {
        // Normal kullanıcı girişi yapıldığında misafir modunu temizle
        localStorage.removeItem("is_guest")
        window.location.replace("/")
      }
    }
    setLoading(false)
  }

  // Misafir Modu: Mevcut tüm gerçek oturumları sonlandırır
  const handleGuestLogin = async () => {
    setLoading(true)
    try {
      // 1. Önce var olan Supabase oturumunu kesin olarak kapat
      if (supabase) {
        await supabase.auth.signOut()
      }
      // 2. Misafir bayrağını ayarla
      localStorage.setItem("is_guest", "true")
      // 3. Ana sayfaya yönlendir
      window.location.replace("/")
    } catch (err) {
      console.error("Misafir girişi hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 text-[#122c4a]">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e9ef] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#d64526] text-xl font-bold text-white">Y</div>
          <h1 className="text-2xl font-bold">{isSignUp ? "YükleGel'e Kayıt Ol" : "YükleGel'e Giriş Yap"}</h1>
          <p className="text-xs text-[#8da0b2]">Lojistik yönetim panelinize erişin</p>
        </div>

        {errorMsg && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">{errorMsg}</div>}
        {successMsg && <div className="mb-4 rounded-lg bg-green-50 p-3 text-xs font-medium text-green-600">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">E-posta Adresi</label>
            <Input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="ornek@sirket.com" 
              className="h-11 border-[#e0e6ed] bg-[#f5f7fa]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#6d8194]">Şifre</label>
            <Input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="h-11 border-[#e0e6ed] bg-[#f5f7fa]"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 bg-[#122c4a] hover:bg-[#1a3d68] text-white font-medium cursor-pointer">
            {loading ? "İşlem yapılıyor..." : (isSignUp ? "Hesap Oluştur" : "Giriş Yap")}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button 
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(""); setSuccessMsg(""); }}
            className="text-xs text-[#315d83] hover:underline cursor-pointer font-medium"
          >
            {isSignUp ? "Zaten hesabınız var mı? Giriş Yapın" : "Hesabınız yok mu? Kayıt Olun"}
          </button>
        </div>

        <div className="mt-6 border-t border-[#e4e9ef] pt-4 text-center">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full h-10 bg-gray-100 hover:bg-gray-200 text-[#122c4a] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            👀 Misafir Modu ile Hemen İncele
          </button>
        </div>
      </div>
    </div>
  )
}
