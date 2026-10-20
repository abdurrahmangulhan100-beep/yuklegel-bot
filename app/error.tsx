"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Uygulama hatası:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f5f7fa] p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="size-8" />
      </div>
      <h2 className="text-xl font-bold text-[#122c4a]">Bir şeyler ters gitti</h2>
      <p className="max-w-xs text-sm leading-relaxed text-[#718397]">
        Beklenmedik bir hata oluştu. Tekrar denemek genellikle sorunu çözer.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[#d64526] px-5 py-3 text-sm font-semibold text-white active:scale-95"
        >
          <RefreshCw className="size-4" />
          Tekrar Dene
        </button>
        <a href="/" className="rounded-xl border border-[#e4e9ef] bg-white px-5 py-3 text-sm font-semibold text-[#122c4a]">
          Ana Sayfa
        </a>
      </div>
    </div>
  )
}
