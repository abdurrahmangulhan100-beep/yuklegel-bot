"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Mobilde alttan açılan (bottom sheet), geniş ekranda ortada duran pencere.
 * Arka plan kaydırmasını kilitler; ESC, dış alana tıklama ve telefonun GERİ tuşuyla kapanır.
 * document.body'ye taşınarak (portal) çizilir: kart içinde çizilirse kartın `content-visibility`
 * kuralı "fixed" konumu kartın içine hapseder; pencere kayar, kırpılır ve kapatılamaz hale gelirdi.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, className }: SheetProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Geri tuşu: pencere açılınca bir geçmiş kaydı eklenir; geri basınca sayfadan çıkmak yerine pencere kapanır.
  useEffect(() => {
    if (!open) return
    let closedByBack = false
    window.history.pushState({ ...(window.history.state ?? {}), __sheet: true }, "")
    const onPop = () => {
      closedByBack = true
      onCloseRef.current()
    }
    window.addEventListener("popstate", onPop)
    return () => {
      window.removeEventListener("popstate", onPop)
      // Pencere geri tuşuyla değil (X, dış alan, işlem sonrası) kapandıysa eklediğimiz kaydı geri al
      if (!closedByBack && window.history.state?.__sheet) window.history.back()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="animate-fade absolute inset-0 touch-none bg-[#0b1d33]/55"
      />

      <div
        className={cn(
          "animate-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl",
          className
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[#d5dde6] sm:hidden" />

        {title && (
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight text-[#122c4a]">{title}</h2>
              {subtitle && <p className="mt-1 text-xs leading-relaxed text-[#627d98]">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f0f4f8] text-[#627d98] transition-colors hover:bg-[#e4e9ef]"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-[#edf0f3] bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
