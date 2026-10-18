"use client"

import { Phone, MessageCircle, Star, Check, Ban, Zap, ChevronDown, Share2, Copy, Flag, MoreHorizontal, MapPin } from "lucide-react"
import { memo, useState } from "react"
import { isMissing } from "@/lib/route"
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
  /** İl bazlı şehir (filtre / arama için). Bulunamadıysa tanımsız. */
  fromCity?: string
  toCity?: string
  /** İlan metninde geçen şehirler (etiket olarak gösterilir, yön belirtmez) */
  cities?: string[]
  /** Metinde geçen ama çıkış/varış olarak ayrılamayan diğer şehirler */
  extraCities?: string[]
  trailer?: string
  tonnage?: string
  timing?: string
  /** Aynı saha ilanı kaç kez paylaşılmış (tekrarlar tek kartta birleştirilir) */
  repeatCount?: number
}

type LoadCardProps = {
  load: Load
  searchQuery?: string
  isFavorite?: boolean
  onToggleFavorite?: (listingId?: string) => void
  onUserBlocked?: (userIdOrPhone: string) => void
  /** Şehir adına dokununca o şehre ait ilanları aramak için */
  onCitySearch?: (city: string) => void
}

const REPORT_REASONS = [
  "Sahte veya Yanıltıcı İlan",
  "Uygunsuz / Hakaret İçeren Dil",
  "Spam / Tekrarlanan İçerik",
  "Hatalı Telefon Numarası",
  "Bu ilan bana ait, kaldırılmasını istiyorum",
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

export const LoadCard = memo(function LoadCard({ load, searchQuery = "", isFavorite = false, onToggleFavorite, onUserBlocked, onCitySearch }: LoadCardProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [sheetView, setSheetView] = useState<"menu" | "report">("menu")
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [isFavLoading, setIsFavLoading] = useState(false)
  const [shared, setShared] = useState(false)

  const cleanQuery = searchQuery.trim()
  const isUserLoad = load.source === "user"
  const hasPhone = Boolean(load.phone) && load.phone !== "Belirtilmedi"
  // Engellenebilecek kimlik: kullanıcı ilanında kullanıcı id'si, saha ilanında telefon numarası
  const blockTarget = isUserLoad ? load.userId : (hasPhone ? load.phone : undefined)

  const displayCompany = isUserLoad 
    ? (load.company || "İsimsiz Firma")
    : (load.company && !load.company.toLowerCase().includes("whatsapp") ? load.company : "Saha Lojistik Ağı")

  const hasVehicle = !isMissing(load.vehicle)
  const hasDistance = !isMissing(load.distance)
  const hasPrice = Boolean(load.price) && load.price !== "₺0"
  const cargoText = !isMissing(load.cargo) ? load.cargo : "Yük detayı belirtilmedi."
  const isLongCargo = cargoText.length > 140 || cargoText.split("\n").length > 3

  // Şehir etiketleri. "Nereden → nereye" başlığı yok: saha ilanında ham mesaj gösterilir,
  // metinden bulunan şehirler dokunulabilir etiket olur. Formla açılan ilanlarda çıkış / varış etiketle belirtilir.
  const cityTags: { label: string; city: string; role?: string }[] = []
  const seenCities = new Set<string>()
  const addTag = (label: string, city?: string, role?: string) => {
    const key = (city ?? label).toLocaleLowerCase("tr-TR")
    if (!label || seenCities.has(key)) return
    seenCities.add(key)
    cityTags.push({ label, city: city ?? label, role })
  }
  if (isUserLoad) {
    if (!isMissing(load.from)) addTag(load.from, load.fromCity, "Çıkış")
    if (!isMissing(load.to)) addTag(load.to, load.toCity, "Varış")
  }
  for (const c of load.cities ?? []) addTag(c, c)
  const cityText = cityTags.map((t) => t.label).join(" · ")
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
      ? `Merhaba, Nakliye Cepte'deki${cityText ? ` ${cityText}` : ""} (${!isMissing(load.cargo) ? load.cargo : "Yük"}) ilanınız için yazıyorum. Yük hâlâ müsait mi?`
      : `Merhaba, Nakliye Cepte'de gördüğüm${cityText ? ` ${cityText}` : ""} ilanınız için yazıyorum. Yük hâlâ müsait mi?`

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const handleShare = async () => {
    const parts = [
      cityText,
      hasVehicle ? load.vehicle : "",
      load.trailer,
      load.tonnage,
      cargoText.length > 140 ? cargoText.slice(0, 140) + "…" : cargoText,
      hasPhone ? `Tel: ${formatPhone(load.phone)}` : "",
    ].filter(Boolean)
    const text = `${parts.join(" • ")}\n— Nakliye Cepte`
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ text })
        return
      }
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // Kullanıcı paylaşımı iptal etti veya pano erişimi yok
    }
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

  const hasChips = cityTags.length > 0 || hasPrice
  const hasTags = load.urgent || hasVehicle || load.trailer || load.tonnage || load.timing || (load.repeatCount ?? 0) > 1

  const accent = load.urgent
    ? "bg-gradient-to-b from-[#e5522f] to-[#f4a259]"
    : isUserLoad
      ? "bg-[#e5522f]"
      : "bg-[#3f7199]"

  const openMenu = () => {
    setSheetView("menu")
    setIsReportOpen(true)
  }

  const closeSheet = () => setIsReportOpen(false)

  const shareFromMenu = async () => {
    await handleShare()
    closeSheet()
  }

  const copyFromMenu = async () => {
    await copyPhone()
    setTimeout(closeSheet, 700)
  }

  return (
    <article
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(18,44,74,0.06)]",
        load.urgent ? "border-[#f6d9cf] bg-[#fffaf7]" : "border-[#e4e9ef] bg-white"
      )}
    >
      {/* Sol renk şeridi: ilan türünü / aciliyeti belli eder */}
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", accent)} />

      <div className="flex flex-col gap-3 py-3.5 pl-5 pr-3.5">
        {/* Üst: firma + aksiyonlar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white",
                isUserLoad ? "bg-gradient-to-br from-[#e5522f] to-[#c13a1c]" : "bg-gradient-to-br from-[#3f7199] to-[#274f73]"
              )}
            >
              {isUserLoad ? (load.initials || "NK") : "SL"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight text-[#122c4a]">
                {highlightMatch(displayCompany, cleanQuery)}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8da0b2]">
                <span className="shrink-0">{load.time}</span>
                <span className="text-[#cbd5e1]">•</span>
                <span className={cn("truncate font-medium", isUserLoad ? "text-[#d64526]" : "text-[#3f7199]")}>
                  {isUserLoad ? "Nakliye Cepte" : "Saha Ağı"}
                </span>
              </div>
            </div>
          </div>

          <div className="-mr-1.5 flex shrink-0 items-center">
            <button
              onClick={handleFavoriteClick}
              disabled={isFavLoading}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              className={cn(
                "grid size-10 place-items-center rounded-full active:scale-90",
                isFavLoading && "opacity-50",
                isFavorite ? "text-amber-500" : "text-[#b4c1ce]"
              )}
            >
              <Star className={cn("size-[21px]", isFavorite && "fill-amber-400")} />
            </button>
            <button
              onClick={openMenu}
              aria-label="İlan işlemleri"
              className="grid size-10 place-items-center rounded-full text-[#9aabbb] active:bg-[#eef4f8]"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        {/* Şehir etiketleri (dokununca o şehrin ilanları) ve fiyat */}
        {hasChips && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {cityTags.map((t) => (
                <CityChip
                  key={t.city}
                  label={highlightMatch(t.label, cleanQuery)}
                  role={t.role}
                  onClick={onCitySearch ? () => onCitySearch(t.city) : undefined}
                />
              ))}
            </div>

            {(hasPrice || hasDistance) && (
              <div className="shrink-0 text-right leading-tight">
                {hasPrice && (
                  <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-[15px] font-extrabold text-emerald-700">
                    {load.price}
                  </span>
                )}
                {hasDistance && <div className="mt-1 text-[11px] font-medium text-[#8da0b2]">{load.distance}</div>}
              </div>
            )}
          </div>
        )}

        {/* Etiketler: yalnızca bilinen bilgiler, renkle ayrışır */}
        {hasTags && (
          <div className="flex flex-wrap items-center gap-1.5">
            {load.urgent && (
              <Tag tone="bg-[#e5522f] text-white">
                <Zap className="size-3 fill-white" />
                ACİL
              </Tag>
            )}
            {hasVehicle && <Tag tone="bg-[#e8f0f7] text-[#274f73]">{highlightMatch(load.vehicle, cleanQuery)}</Tag>}
            {load.trailer && <Tag tone="bg-[#efeafb] text-[#5b4a99]">{load.trailer}</Tag>}
            {load.tonnage && <Tag tone="bg-amber-50 text-amber-700">{load.tonnage}</Tag>}
            {load.timing && <Tag tone="bg-emerald-50 text-emerald-700">{load.timing}</Tag>}
            {(load.repeatCount ?? 0) > 1 && <Tag tone="bg-[#f1f5f9] text-[#627d98]">{load.repeatCount} kez paylaşıldı</Tag>}
          </div>
        )}

        {/* Yük detayı */}
        <div>
          <p className={cn("whitespace-pre-line break-words text-[13.5px] leading-relaxed text-[#334e68]", !expanded && "line-clamp-3")}>
            {highlightMatch(cargoText, cleanQuery)}
          </p>
          {isLongCargo && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 inline-flex items-center gap-1 py-1 text-xs font-semibold text-[#315d83]"
            >
              {expanded ? "Daha az" : "Devamı"}
              <ChevronDown className={cn("size-3.5", expanded && "rotate-180")} />
            </button>
          )}
          {showMessage && (
            <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-[#8da0b2]">
              {highlightMatch(load.message as string, cleanQuery)}
            </p>
          )}
        </div>

        {/* İletişim */}
        {hasPhone ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCall}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#122c4a] text-sm font-semibold text-white active:scale-[0.98] active:bg-[#1a3d68]"
            >
              <Phone className="size-[17px]" />
              Ara
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white active:scale-[0.98] active:bg-emerald-700"
            >
              <MessageCircle className="size-[17px]" />
              WhatsApp
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-[#f5f7fa] px-3 py-2.5 text-center text-xs font-medium text-[#8da0b2]">
            Bu ilan için telefon numarası belirtilmemiş.
          </p>
        )}
      </div>

      {/* İşlem menüsü / şikayet (sadece açıkken oluşturulur) */}
      {isReportOpen && (
        <Sheet
          open={isReportOpen}
          onClose={closeSheet}
          title={sheetView === "menu" ? "İlan işlemleri" : "İlanı bildir"}
          subtitle={
            sheetView === "menu"
              ? cityText || displayCompany
              : "Bildiriminiz incelenmek üzere ekibimize iletilir."
          }
          footer={
            sheetView === "report" && !reportSuccess ? (
              <button
                onClick={handleSendReport}
                disabled={isSubmittingReport}
                className="h-12 w-full rounded-xl bg-[#d64526] text-sm font-semibold text-white active:bg-[#b93820] disabled:opacity-60"
              >
                {isSubmittingReport ? "Gönderiliyor..." : "Bildirimi Gönder"}
              </button>
            ) : undefined
          }
        >
          {sheetView === "menu" ? (
            <div className="space-y-1 pt-1">
              <MenuItem icon={Share2} onClick={shareFromMenu}>
                {shared ? "Panoya kopyalandı" : "İlanı paylaş"}
              </MenuItem>
              {hasPhone && (
                <MenuItem icon={copied ? Check : Copy} onClick={copyFromMenu} hint={formatPhone(load.phone)}>
                  {copied ? "Numara kopyalandı" : "Numarayı kopyala"}
                </MenuItem>
              )}
              <MenuItem icon={Flag} onClick={() => setSheetView("report")}>
                İlanı bildir
              </MenuItem>
              {blockTarget && (
                <MenuItem icon={Ban} onClick={handleBlockUser} danger>
                  Bu kullanıcıyı engelle
                </MenuItem>
              )}
            </div>
          ) : reportSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="size-7" />
              </div>
              <p className="text-sm font-semibold text-emerald-700">Bildiriminiz incelenmek üzere iletildi.</p>
            </div>
          ) : (
            <div role="radiogroup" aria-label="Bildirim sebebi" className="space-y-2 pt-1">
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
                      "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium",
                      selected ? "border-[#122c4a] bg-[#122c4a]/5 text-[#122c4a]" : "border-[#e4e9ef] text-[#334e68]"
                    )}
                  >
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-[#122c4a]" : "border-[#c4d0dc]")}>
                      {selected && <span className="size-2.5 rounded-full bg-[#122c4a]" />}
                    </span>
                    {reason}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setSheetView("menu")}
                className="px-1 pt-2 text-xs font-semibold text-[#315d83]"
              >
                ← Geri dön
              </button>
            </div>
          )}
        </Sheet>
      )}
    </article>
  )
})

function CityChip({ label, role, onClick }: { label: React.ReactNode; role?: string; onClick?: () => void }) {
  const inner = (
    <>
      <MapPin aria-hidden className="size-3.5 shrink-0 text-[#315d83]" />
      {role && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8da0b2]">{role}</span>}
      <span className="min-w-0 truncate">{label}</span>
    </>
  )
  const cls = "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[#dbe8f2] bg-[#f1f7fc] px-3 text-[13px] font-bold text-[#122c4a]"
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "active:scale-95 active:bg-[#e3eef8]")}>
      {inner}
    </button>
  ) : (
    <span className={cls}>{inner}</span>
  )
}

function Tag({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", tone)}>
      {children}
    </span>
  )
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  hint,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick: () => void
  hint?: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold active:bg-[#f0f4f8]",
        danger ? "text-red-600" : "text-[#122c4a]"
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", danger ? "text-red-500" : "text-[#627d98]")} />
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs font-medium tabular-nums text-[#8da0b2]">{hint}</span>}
    </button>
  )
}
