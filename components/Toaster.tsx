"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { TOAST_EVENT, type ToastKind } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Item = { id: number; message: string; kind: ToastKind }

/** alert() yerine kullanılan bildirim kutusu: kendiliğinden kapanır, dokununca hemen kapanır, Premium'a geçişi engellemez */
export function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    let seq = 0
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; kind: ToastKind }>).detail
      if (!d?.message) return
      const id = ++seq
      setItems((prev) => [...prev.filter((p) => p.message !== d.message).slice(-2), { id, message: d.message, kind: d.kind }])
      const ms = Math.min(9000, 3500 + d.message.length * 40)
      setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== id)), ms)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-8"
    >
      {items.map((t) => {
        const Icon = t.kind === "error" ? AlertCircle : t.kind === "success" ? CheckCircle2 : Info
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setItems((prev) => prev.filter((p) => p.id !== t.id))}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-[13.5px] font-semibold leading-snug text-white shadow-[0_12px_32px_-12px_rgba(18,44,74,0.6)] animate-rise",
              t.kind === "error" ? "bg-[#b23a1f]" : t.kind === "success" ? "bg-emerald-600" : "bg-[#122c4a]"
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
