"use client"

import { Phone, MessageCircle, Star, Truck, Clock, Copy, Check, Flag, Ban, Zap, Package, ChevronDown } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Sheet } from "@/components/Sheet"

export type Load = {
  id: string
  userId?: string
  company: string
  initials: string
  from: string
  to: string
  cargo: string
  message?: string
  vehicle: string
  distance?: string
  price?: string
  urgent?: boolean
  time: string
  color?: string
  source: "user" | "bot"
  phone: string
  createdAt?: string
}

type LoadCardProps = {
  load: Load
  searchQuery?: string
  isFavorite?: boolean
  onToggleFavorite?: (listingId?: string) => void
  onUserBlocked?: (userIdOrPhone: string) => void
}

const REPORT_REASONS = [
  "Sahte veya Yanıltıcı İlan",
  "Uygunsuz / Hakaret İçeren Dil",
  "Spam / Tekrarlanan İçerik",
  "Hatalı Telefon Numarası",
]

const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, "gi")
  const parts = text.split(regex)
  const q = query.toLocaleLowerCase('tr-TR')

  return parts.map((part, i) => {
    const isMatch = part.toLocaleLowerCase('tr-TR') === q

    return isMatch ? (
      <mark key={i} className="rounded bg-[#fff1c2] px-0.5 font-semibold text-[#122c4a]">
        {part}
      </mark>
    ) : (
      part
    )
  })
}

// 05321234567 -> 0532 123 45 67
const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "")
  if (d.length === 11) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
  return phone
}

export function LoadCard({ load, searchQuery = "", isFavorite = false, onToggleFavorite, onUserBlocked }: LoadCardProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [isFavLoading, setIsFavLoading] = useState(false)

  const cleanQuery = searchQuery.trim()
  const isUserLoad = load.source === "user"
  const hasPhone = Boolean(load.phone) && load.phone !== "Belirtilmedi"
  // Engellenebilecek kimlik: kullanıcı ilanında kullanıcı id'si, saha ilanında telefon numarası
  const blockTarget = isUserLoad ? load.userId : (hasPhone ? load.phone : undefined)

  const displayCompany = isUserLoad 
    ? (load.company || "İsimsiz Firma")
    : (load.company && !load.company.toLowerCase().includes("whatsapp") ? load.company : "Saha Lojistik Ağı")

  const hasFrom = Boolean(load.from) && load.from !== "-"
  const hasTo = Boolean(load.to) && load.to !== "-"
  const showRoute = hasFrom && hasTo
  const hasPrice = Boolean(load.price) && load.price !== "₺0"
  const cargoText = load.cargo && load.cargo !== "-" ? load.cargo : "Yük detayı belirtilmedi."
  const isLongCargo = cargoText.length > 160
  const showMessage = Boolean(load.message) && load.message !== "-" && load.message !== load.cargo

  const copyPhone = async () => {
    if (!hasPhone) return
    try {
      await navigator.clipboard.writeText(load.phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano erişimi yoksa sessizce geç
    }
  }

  const handleWhatsApp = () => {
    if (!hasPhone) return

    const cleanPhone = load.phone.replace(/\D/g, "")
    const formattedPhone = cleanPhone.startsWith("0") 
      ? `9${cleanPhone}` 
      : cleanPhone.startsWith("90") 
        ? cleanPhone 
        : `90${cleanPhone}`

    const message = isUserLoad 
      ? `Merhaba, ${load.from} -> ${load.to} güzergahındaki (${load.cargo || 'Yük'}) ilanınız için yazıyorum.`
      : `Merhaba, saha ağında paylaştığınız ilanınız için görüşmek istiyorum.`

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const handleCall = () => {
    if (hasPhone) window.location.href = `tel:${load.phone}`
  }

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const isGuest = typeof window !== "undefined" ? localStorage.getItem("is_guest") === "true" : false
    if (isGuest) {
      alert("Favorilere ilan ekleyebilmek için lütfen ücretsiz üye olunuz veya giriş yapınız.")
      return
    }

    if (isFavLoading) return
    setIsFavLoading(true)

    try {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Favorilere eklemek için oturum açmanız gerekmektedir.")
        return
      }

      const listingIdStr = String(load.id)

      if (isFavorite) {
        // Silme işlemi (Temizlenmiş ID veya ön ekli ID bazlı siler)
        const cleanId = listingIdStr.replace(/^(user-|bot-)/, "")
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .or(`listing_id.eq.${listingIdStr},listing_id.eq.${cleanId},listing_id.eq.user-${cleanId}`)

        if (error) throw error
      } else {
        // Ekleme işlemi (Kullanıcı veritabanına ekler)
        const { error } = await supabase
          .from("favorites")
          .insert([
            {
              user_id: user.id,
              listing_id: listingIdStr
            }
          ])

        if (error) throw error
      }

      if (onToggleFavorite) {
        onToggleFavorite(listingIdStr)
      }
    } catch (err) {
      console.error("Favori işlemi hatası:", err)
      alert("Favori işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.")
    } finally {
      setIsFavLoading(false)
    }
  }

  const handleSendReport = async () => {
    setIsSubmittingReport(true)
    try {
      if (!supabase) throw new Error("Bağlantı yok")
      const { error } = await supabase.from("reports").insert([
        {
          listing_id: load.id,
          reason: reportReason,
          target_phone: hasPhone ? load.phone : null
        }
      ])
      if (error) throw error
      setReportSuccess(true)
      setTimeout(() => {
        setIsReportOpen(false)
        setReportSuccess(false)
      }, 1500)
    } catch (err) {
      console.error("Şikayet gönderilemedi:", err)
      alert("Şikayet gönderilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.")
    } finally {
      setIsSubmittingReport(false)
    }
  }

  const handleBlockUser = () => {
    const target = blockTarget
    if (!target) return

    if (confirm("Bu kullanıcıyı engellemek istediğinizden emin misiniz? Bu kişiye ait ilanları bir daha görmeyeceksiniz.")) {
      let blocked: string[] = []
      try { blocked = JSON.parse(localStorage.getItem("blocked_users") || "[]") } catch { blocked = [] }
      if (!blocked.includes(target)) {
        blocked.push(target)
        localStorage.setItem("blocked_users", JSON.stringify(blocked))
      }
      if (onUserBlocked) onUserBlocked(target)
      setIsReportOpen(false)
    }
  }

  return (
    <article className="animate-rise group relative flex flex-col overflow-hidden rounded-2xl border border-[#e4e9ef] bg-white shadow-[0_1px_3px_rgba(18,44,74,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(18,44,74,0.08)]">
      {load.urgent && <div className="h-1 w-full bg-gradient-to-r from-[#d64526] via-[#ef6a3a] to-[#f4a259]" />}

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        {/* Üst: firma + aksiyonlar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white",
              isUserLoad ? "bg-gradient-to-br from-[#e5522f] to-[#c13a1c]" : "bg-gradient-to-br from-[#3f7199] to-[#274f73]"
            )}>
              {isUserLoad ? (load.initials || "NK") : "SL"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold leading-tight text-[#122c4a]">
                {highlightMatch(displayCompany, cleanQuery)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8da0b2]">
                <Clock className="size-3 shrink-0" />
                <span>{load.time}</span>
                <span className="text-[#cbd5e1]">•</span>
                <span className="truncate">{isUserLoad ? "Nakliye Cepte" : "Saha Lojistik"}</span>
              </div>
            </div>
          </div>

          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
            <button
              onClick={handleFavoriteClick}
              disabled={isFavLoading}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              className={cn(
                "grid size-10 place-items-center rounded-full transition-all active:scale-90",
                isFavLoading && "opacity-50",
                isFavorite ? "text-amber-500" : "text-[#b4c1ce] hover:text-amber-500"
              )}
            >
              <Star className={cn("size-[22px]", isFavorite && "fill-amber-400")} />
            </button>
            <button
              onClick={() => setIsReportOpen(true)}
              aria-label="İlanı şikayet et veya engelle"
              className="grid size-10 place-items-center rounded-full text-[#b4c1ce] transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Flag className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Rozetler */}
        {(load.urgent || (load.vehicle && load.vehicle !== "-")) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {load.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0ec] px-2.5 py-1 text-[11px] font-bold text-[#d64526]">
                <Zap className="size-3 fill-[#d64526]" />
                ACİL YÜK
              </span>
            )}
            {load.vehicle && load.vehicle !== "-" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4f8] px-2.5 py-1 text-[11px] font-semibold text-[#315d83]">
                <Truck className="size-3.5" />
                {highlightMatch(load.vehicle, cleanQuery)}
              </span>
            )}
          </div>
        )}

        {/* Güzergah + fiyat */}
        {showRoute && (
          <div className="flex items-stretch justify-between gap-3 rounded-2xl bg-[#f6f9fc] p-3.5">
            <div className="flex min-w-0 flex-1 items-stretch gap-3">
              <div className="flex flex-col items-center py-1.5" aria-hidden>
                <span className="size-3 rounded-full border-[3px] border-emerald-500 bg-white" />
                <span className="my-1 w-px flex-1 border-l-2 border-dashed border-[#c4d0dc]" />
                <span className="size-3 rounded-full bg-[#d64526]" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8da0b2]">Yükleme</div>
                  <div className="truncate text-[15px] font-bold text-[#122c4a]">{highlightMatch(load.from, cleanQuery)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8da0b2]">Teslimat</div>
                  <div className="truncate text-[15px] font-bold text-[#122c4a]">{highlightMatch(load.to, cleanQuery)}</div>
                </div>
              </div>
            </div>

            {(hasPrice || (load.distance && load.distance !== "Belirtilmemiş")) && (
              <div className="flex shrink-0 flex-col items-end justify-center text-right">
                {hasPrice && (
                  <>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8da0b2]">Fiyat</div>
                    <div className="text-xl font-extrabold leading-tight text-emerald-600">{load.price}</div>
                  </>
                )}
                {load.distance && load.distance !== "Belirtilmemiş" && (
                  <div className="mt-1 text-[11px] font-medium text-[#8da0b2]">{load.distance}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fiyat güzergah olmadan geldiyse */}
        {!showRoute && hasPrice && (
          <div className="inline-flex w-fit items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-700">
            {load.price}
          </div>
        )}

        {/* Yük detayı */}
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8da0b2]">
            <Package className="size-3" />
            Yük detayı
          </div>
          <p className={cn("break-words text-sm leading-relaxed text-[#334e68]", !expanded && "line-clamp-3")}>
            {highlightMatch(cargoText, cleanQuery)}
          </p>
          {isLongCargo && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#315d83]"
            >
              {expanded ? "Daha az göster" : "Devamını oku"}
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>

        {showMessage && (
          <p className="line-clamp-2 rounded-xl border-l-4 border-[#cfdceb] bg-[#f6f9fc] px-3 py-2 text-xs italic leading-relaxed text-[#627d98]">
            {highlightMatch(load.message as string, cleanQuery)}
          </p>
        )}
      </div>

      {/* Alt: iletişim */}
      <div className="border-t border-[#edf0f3] bg-[#fbfcfd] p-3">
        {hasPhone ? (
          <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
            <span className="text-[13px] font-semibold tabular-nums text-[#122c4a]">{formatPhone(load.phone)}</span>
            <button
              onClick={copyPhone}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#627d98] transition-colors hover:bg-[#eef2f6]"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        ) : (
          <p className="mb-2.5 px-1 text-xs font-medium text-[#8da0b2]">Bu ilan için telefon numarası belirtilmemiş.</p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleCall}
            disabled={!hasPhone}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#122c4a] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a3d68] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Phone className="size-[18px]" />
            Ara
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={!hasPhone}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageCircle className="size-[18px]" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Şikayet / engelle */}
      <Sheet
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title="İlanı bildir veya engelle"
        subtitle="Şikayetiniz incelenmek üzere ekibimize iletilir."
        footer={
          !reportSuccess ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSendReport}
                disabled={isSubmittingReport}
                className="h-12 w-full rounded-xl bg-[#d64526] text-sm font-semibold text-white transition-colors hover:bg-[#b93820] disabled:opacity-60"
              >
                {isSubmittingReport ? "Gönderiliyor..." : "İlanı Şikayet Et"}
              </button>
              {blockTarget && (
                <button
                  onClick={handleBlockUser}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#dbe3ec] text-sm font-semibold text-[#334e68] transition-colors hover:bg-[#f5f7fa]"
                >
                  <Ban className="size-4 text-red-500" />
                  Bu Kullanıcıyı Engelle
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {reportSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="size-7" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Şikayetiniz incelenmek üzere iletildi.</p>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Şikayet sebebi" className="space-y-2 pt-1">
            {REPORT_REASONS.map((reason) => {
              const selected = reportReason === reason
              return (
                <button
                  key={reason}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReportReason(reason)}
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    selected ? "border-[#122c4a] bg-[#122c4a]/5 text-[#122c4a]" : "border-[#e4e9ef] text-[#334e68] hover:bg-[#f9fafc]"
                  )}
                >
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-[#122c4a]" : "border-[#c4d0dc]")}>
                    {selected && <span className="size-2.5 rounded-full bg-[#122c4a]" />}
                  </span>
                  {reason}
                </button>
              )
            })}
          </div>
        )}
      </Sheet>
    </article>
  )
}
