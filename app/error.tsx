"use client"

import { useEffect } from "react"

// Beklenmedik bir hatada beyaz ekran yerine kullanıcıya anlaşılır bir ekran gösterir
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Uygulama hatası:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/60 px-6 text-center">
      <h1 className="text-xl font-extrabold text-foreground/80">Bir sorun oluştu</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Sayfa yüklenirken beklenmedik bir hata oldu. İnternet bağlantınızı kontrol edip tekrar deneyin.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <button onClick={() => reset()} className="h-12 rounded-xl bg-[#122c4a] text-sm font-bold text-white">
          Tekrar dene
        </button>
        <a href="/" className="flex h-12 items-center justify-center rounded-xl text-sm font-semibold text-[#315d83] hover:bg-card">
          Ana sayfaya dön
        </a>
      </div>
    </div>
  )
}
