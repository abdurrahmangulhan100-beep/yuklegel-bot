"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { LogoMark } from "@/components/Logo"
import { Truck, Zap, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [accepted, setAccepted] = useState(true)

  // Zaten giriş yapılmışsa login ekranında bekletme
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/")
    })
  }, [router])

  const handleGoogleLogin = async () => {
    setErrorMsg("")
    if (!accepted) { setErrorMsg("Devam etmek için koşulları kabul etmelisiniz."); return }
    setLoading(true)
    try {
      localStorage.removeItem("is_guest")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      })
      if (error) { setErrorMsg("Google ile giriş başlatılamadı. Lütfen tekrar deneyin."); setLoading(false) }
      // Başarılıysa tarayıcı Google'a yönlenir; dönüşte oturum otomatik açılır.
    } catch (err) {
      console.error("Google giriş hatası:", err)
      setErrorMsg("Google ile giriş başlatılamadı. Lütfen tekrar deneyin.")
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      localStorage.removeItem("favorite_loads")
      localStorage.setItem("is_guest", "true")
      router.push("/")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none fixed -right-16 top-10 size-64 rounded-full bg-brand/25 blur-3xl" />
      <div className="pointer-events-none fixed -left-20 bottom-10 size-64 rounded-full bg-[#315d83]/40 blur-3xl" />

      <div className="animate-rise relative w-full max-w-[380px]">
        <div className="mb-6 text-center text-white">
          <LogoMark size={72} className="mx-auto mb-3 drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]" />
          <h1 className="text-2xl font-extrabold tracking-tight">Nakliye Cepte</h1>
          <p className="mt-1 text-[13px] text-white/65">Yük bul, aracını doldur. WhatsApp karmaşası yok.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><Truck className="size-3.5" /> Güncel yükler</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><Zap className="size-3.5" /> Hızlı</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15"><ShieldCheck className="size-3.5" /> Güvenli</span>
          </div>
        </div>

        <div className="rounded-3xl bg-card p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          {errorMsg && (
            <div role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold leading-relaxed text-red-600">{errorMsg}</div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-card text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted active:scale-[0.99] disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 7.2-9.6 7.2-16.9z" />
              <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.9 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {loading ? "Yönlendiriliyor..." : "Google ile devam et"}
          </button>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand" />
            <span>
              <Link href="/kullanim-kosullari" target="_blank" className="font-semibold text-foreground/80 underline">Kullanım Koşulları</Link> ve{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-foreground/80 underline">Gizlilik Politikası</Link>&apos;nı kabul ediyorum.
            </span>
          </label>

          <div className="my-3 h-px bg-border" />

          <button
            type="button"
            onClick={handleGuest}
            disabled={loading}
            className="h-10 w-full rounded-xl text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            Üye olmadan göz at
          </button>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-white/60">
          <Link href="/hakkimizda" className="hover:text-white">Hakkımızda</Link>
          <Link href="/rehber" className="hover:text-white">Rehber</Link>
          <Link href="/privacy" className="hover:text-white">Gizlilik</Link>
          <Link href="/delete-account" className="hover:text-white">Hesap Silme</Link>
        </div>
      </div>
    </div>
  )
}
