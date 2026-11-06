// Uygulama içi bildirim kutusu (alert() yerine). Herhangi bir yerden: toast("Mesaj")
export const TOAST_EVENT = "nakliye:toast"
export type ToastKind = "info" | "error" | "success"

const ERROR_HINT = /hata|olamad|edilemed|gönderilemed|silinemed|yenilenemed|bulunamad|kurulamad|başarısız|doğrulanamad/i

export function toast(message: string, kind?: ToastKind) {
  if (typeof window === "undefined" || !message) return
  const k: ToastKind = kind ?? (ERROR_HINT.test(message) ? "error" : "info")
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, kind: k } }))
}
