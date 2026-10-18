"use client"

import { useState, useEffect } from "react"
import { WifiOff, RefreshCw } from "lucide-react"

export function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Ilk yuklemede internet durumunu kontrol et
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-6 text-center">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
        <WifiOff size={40} />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">
        İnternet Bağlantısı Yok
      </h2>

      <p className="text-muted-foreground max-w-xs mb-8 text-sm leading-relaxed">
        Lütfen internet bağlantınızı kontrol edip tekrar deneyin. Bağlantı sağlandığında ekran otomatik yenilenecektir.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-lg hover:opacity-90 transition-all active:scale-95"
      >
        <RefreshCw size={18} />
        Tekrar Dene
      </button>
    </div>
  )
}
