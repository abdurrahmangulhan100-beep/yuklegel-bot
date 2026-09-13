"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Lock, Mail } from "lucide-react"

export function AuthModal({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        alert("Kayıt olunamadı: " + error.message)
      } else {
        alert("Kayıt başarılı! Giriş yapabilirsiniz.")
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        alert("Giriş başarısız: " + error.message)
      } else {
        onLoginSuccess()
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-[#e4e9ef]">
        <div className="text-center mb-6">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#122c4a]">
            {isSignUp ? "Şirket Hesabı Oluştur" : "Şirket Profili Girişi"}
          </h2>
          <p className="text-xs text-[#718397] mt-1">
            {isSignUp ? "Finansal verilerinizi güvenle takip edin." : "Hesabınıza giriş yaparak devam edin."}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#718397] mb-1 block">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-gray-400" />
              <Input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="sirket@ornek.com" 
                className="pl-9 h-10" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#718397] mb-1 block">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-gray-400" />
              <Input 
                required 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="pl-9 h-10" 
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-[#122c4a] hover:bg-[#1a3a5f] text-white h-10 cursor-pointer">
            {loading ? "İşlem yapılıyor..." : isSignUp ? "Kayıt Ol" : "Giriş Yap"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
          >
            {isSignUp ? "Zaten hesabınız var mı? Giriş yapın" : "Şirketiniz için hesap oluşturun mu? Kayıt olun"}
          </button>
        </div>
      </div>
    </div>
  )
}
