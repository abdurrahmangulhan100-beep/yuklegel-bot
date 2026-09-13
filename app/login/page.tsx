"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")

    if (!supabase) return

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg("Giriş başarısız: " + error.message)
      setLoading(false)
    } else {
      // Giriş başarılı, ana panele yönlendir
      window.location.replace("/")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 text-[#122c4a]">
      <div className="w-full max-w-md rounded-2xl border border-[#e4e9ef] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#d64526] text-xl font-bold text-white">Y</div>
          <h1 className="text-2xl font-bold">YükleGel'e Giriş Yap</h1>
          <p className="text-xs text-[#8da0b2]">Lojistik yönetim panelinize erişin</p>
        </div>

        {errorMsg && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">{errorMsg}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
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
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </div>
    </div>
  )
}
