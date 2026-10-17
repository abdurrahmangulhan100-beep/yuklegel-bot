"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [accepted, setAccepted] = useState(false)

  const trError = (msg: string) => {
    const m = msg.toLowerCase()
    if (m.includes("already registered") || m.includes("already been registered")) return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin."
    if (m.includes("password") && m.includes("6")) return "Şifre en az 6 karakter olmalıdır."
    if (m.includes("valid email") || m.includes("invalid email")) return "Geçerli bir e-posta adresi girin."
    if (m.includes("rate limit")) return "Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin."
    return "İşlem tamamlanamadı. Lütfen tekrar deneyin."
  }

  const handleForgotPassword = async () => {
    setErrorMsg("")
    setSuccessMsg("")
    if (!email) {
      setErrorMsg("Şifre sıfırlama için önce e-posta adresinizi yazın.")
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    if (error) setErrorMsg(trError(error.message))
    else setSuccessMsg("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setSuccessMsg("")

    if (isSignUp && !accepted) {
      setErrorMsg("Devam etmek için Gizlilik Politikası'nı kabul etmelisiniz.")
      setLoading(false)
      return
    }

    if (!supabase) {
      setErrorMsg("Veritabanı bağlantısı kurulamadı.")
      setLoading(false)
      return
    }

    try {
      // Önce misafir durumunu ve eski oturum izlerini sil
      localStorage.removeItem("is_guest")

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: "Nakliye Cepte Kullanıcısı",
              authorized_person: email.split("@")[0]
            }
          }
        })

        if (error) {
          setErrorMsg(trError(error.message))
        } else {
          if (data?.user && data.session) {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              email: email,
              company_name: "Nakliye Cepte Kullanıcısı",
              authorized_person: email.split("@")[0],
              updated_at: new Date().toISOString()
            })
          }
          
          // Kayıt sonrası otomatik oturum açmayı dene
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          
          if (signInError) {
            setSuccessMsg("Kayıt oluşturuldu. Lütfen e-postanızı onaylayın veya giriş yapın.")
          } else {
            setSuccessMsg("Kayıt başarılı! Yönlendiriliyorsunuz...")
            setTimeout(() => {
              router.push("/")
              router.refresh()
            }, 800)
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
          setErrorMsg("Giriş başarısız: Şifre hatalı veya hesap bulunamadı.")
        } else if (data?.user) {
          router.push("/")
          router.refresh()
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg("Bir sorun oluştu. Lütfen tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLoading(true)
    try {
      // Misafir moduna geçerken eski Supabase oturumunu KESİNLİKLE kapat
      if (supabase) {
        await supabase.auth.signOut()
      }
      localStorage.removeItem("favorite_loads")
      localStorage.setItem("is_guest", "true")
      
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Misafir giriş hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 text-[#122c4a]">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e9ef] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#d64526] text-xl font-bold text-white">N</div>
          <h1 className="text-2xl font-bold">{isSignUp ? "Nakliye Cepte'ye Kayıt Ol" : "Nakliye Cepte'ye Giriş Yap"}</h1>
          <p className="text-xs text-[#8da0b2]">Kullanıcı panelinize erişin</p>
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
              placeholder="ornek@mail.com" 
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

          {isSignUp && (
            <label className="flex items-start gap-2 text-xs text-[#6d8194] cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
              <span>
                <Link href="/privacy" target="_blank" className="text-[#315d83] underline font-semibold">Gizlilik Politikası</Link>
                &apos;nı okudum ve kabul ediyorum.
              </span>
            </label>
          )}

          <Button type="submit" disabled={loading} className="w-full h-11 bg-[#122c4a] hover:bg-[#1a3d68] text-white font-medium cursor-pointer">
            {loading ? "İşlem yapılıyor..." : (isSignUp ? "Hesap Oluştur" : "Giriş Yap")}
          </Button>
        </form>

        {!isSignUp && (
          <div className="mt-3 text-center">
            <button type="button" onClick={handleForgotPassword} className="text-xs text-[#6d8194] hover:underline cursor-pointer">
              Şifremi unuttum
            </button>
          </div>
        )}

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
            Misafir Modu ile Hemen İncele
          </button>
          <div className="mt-4 flex justify-center gap-4 text-[11px] text-[#8da0b2]">
            <Link href="/privacy" className="hover:underline">Gizlilik Politikası</Link>
            <Link href="/delete-account" className="hover:underline">Hesap Silme</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
