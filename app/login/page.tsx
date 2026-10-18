"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, Truck, ShieldCheck, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/Logo"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  const fieldClass =
    "h-12 w-full rounded-xl border border-[#dbe3ec] bg-[#f7f9fb] px-4 text-base text-[#122c4a] outline-none transition-colors placeholder:text-[#a3b1c0] focus:border-[#122c4a] focus:bg-white focus:ring-4 focus:ring-[#122c4a]/10 md:text-sm"

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[#163a63] via-[#122c4a] to-[#0b1d33] lg:items-center lg:justify-center lg:p-6">
      {/* Üst marka alanı */}
      <div className="relative px-6 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))] text-center text-white lg:pb-6 lg:pt-0">
        <div className="pointer-events-none absolute -right-8 top-4 size-40 rounded-full bg-[#d64526]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-24 size-36 rounded-full bg-[#315d83]/40 blur-3xl" />
        <div className="relative">
          <LogoMark size={92} className="mx-auto mb-3 drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]" />
          <h1 className="text-[26px] font-extrabold tracking-tight">Nakliye Cepte</h1>
          <p className="mt-1.5 text-sm text-white/65">Türkiye&apos;nin yük ve taşıma ilan platformu</p>

          <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 text-[11px] font-semibold text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><Truck className="size-3.5" /> Güncel yükler</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><Zap className="size-3.5" /> Hızlı iletişim</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><ShieldCheck className="size-3.5" /> Güvenli</span>
          </div>
        </div>
      </div>

      {/* Form kartı */}
      <div className="animate-rise relative flex-1 rounded-t-[32px] bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-7 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] lg:w-full lg:max-w-md lg:flex-none lg:rounded-3xl lg:pb-8">
        <div className="mx-auto w-full max-w-md">
          {/* Giriş / Kayıt sekmesi */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-[#eef2f6] p-1" role="tablist">
            {[
              { signUp: false, label: "Giriş Yap" },
              { signUp: true, label: "Kayıt Ol" },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={isSignUp === t.signUp}
                onClick={() => { setIsSignUp(t.signUp); setErrorMsg(""); setSuccessMsg("") }}
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold transition-all",
                  isSignUp === t.signUp ? "bg-white text-[#122c4a] shadow-sm" : "text-[#627d98]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {errorMsg && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold leading-relaxed text-red-600">{errorMsg}</div>}
          {successMsg && <div role="status" className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3.5 text-xs font-semibold leading-relaxed text-green-700">{successMsg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#4a6178]">E-posta Adresi</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-[#4a6178]">Şifre</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(fieldClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#8da0b2] hover:bg-[#eef2f6]"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              {!isSignUp && (
                <div className="mt-2 text-right">
                  <button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-[#315d83] hover:underline">
                    Şifremi unuttum
                  </button>
                </div>
              )}
            </div>

            {isSignUp && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f9fb] p-3.5 text-xs leading-relaxed text-[#4a6178]">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#d64526]" />
                <span>
                  <Link href="/privacy" target="_blank" className="font-semibold text-[#315d83] underline">Gizlilik Politikası</Link>
                  &apos;nı okudum ve kabul ediyorum.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#d64526] text-sm font-semibold text-white shadow-md shadow-[#d64526]/25 transition-all hover:bg-[#b93820] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "İşlem yapılıyor..." : (isSignUp ? "Hesap Oluştur" : "Giriş Yap")}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-[#a3b1c0]">
            <span className="h-px flex-1 bg-[#e4e9ef]" /> veya <span className="h-px flex-1 bg-[#e4e9ef]" />
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            className="h-12 w-full rounded-xl border border-[#dbe3ec] bg-white text-sm font-semibold text-[#122c4a] transition-colors hover:bg-[#f5f7fa] disabled:opacity-60"
          >
            Misafir Olarak Göz At
          </button>

          <div className="mt-6 flex justify-center gap-5 text-[11px] font-medium text-[#8da0b2]">
            <Link href="/privacy" className="hover:underline">Gizlilik Politikası</Link>
            <Link href="/delete-account" className="hover:underline">Hesap Silme</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
