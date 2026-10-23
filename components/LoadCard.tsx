"use client"

import { Phone, MessageCircle, Star, Check, Ban, Zap, ChevronDown, Share2, Copy, Flag, MoreHorizontal, MapPin, Truck, Clock, Weight, Ruler, Repeat2 } from "lucide-react"
import { Fragment, memo, useState } from "react"
import { isMissing } from "@/lib/route"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Sheet } from "@/components/Sheet"
import { usePremium } from "@/components/PremiumProvider"
import { FREE_LIMITS, consumeContact, contactLimitMessage, openPremium } from "@/lib/premium"

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
  districtOf?: Record<string, string>
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
  const { isPremium } = usePremium()
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
  for (const c of load.cities ?? []) addTag(load.districtOf?.[c] ? `${c} · ${load.districtOf[c]}` : c, c)
  const cityText = cityTags.map((t) => t.label).join(" · ")
  const showMessage = Boolean(load.message) && load.message !== "-" && load.message !== load.cargo

  // Ücretsiz planda günlük iletişim limiti (aynı ilan gün içinde bir kez sayılır)
  const allowContact = () => {
    if (consumeContact(String(load.id), isPremium)) return true
    alert(contactLimitMessage())
    openPremium()
    return false
  }

  const copyPhone = async () => {
    if (!hasPhone) return
    if (!allowContact()) return
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
    if (!allowContact()) return

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
    if (hasPhone && allowContact()) window.location.href = `tel:${load.phone}`
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
        // Ücretsiz planda favori limiti
        if (!isPremium) {
          const { count } = await supabase
            .from("favorites")
            .select("listing_id", { count: "exact", head: true })
            .eq("user_id", user.id)
          if ((count ?? 0) >= FREE_LIMITS.favorites) {
            alert(`Ücretsiz planda en fazla ${FREE_LIMITS.favorites} favori ekleyebilirsiniz. Sınırsız favori için Premium'a geçin.`)
            openPremium()
            return
          }
        }
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

  // Çıkış ve varış şehri ikisi de biliniyorsa net bir güzergâh satırı göster; diğer şehirler etiket olarak kalır
  const route =
    load.fromCity && load.toCity && load.fromCity !== load.toCity ? { from: load.fromCity, to: load.toCity } : null
  // Güzergâh bilinmiyorsa şehirler tek satırda, sade metin olarak gösterilir (kutucuk / rozet yok)
  const places = route ? [] : cityTags
  // İlanın tazeliği: ilk dakikalar en değerli, rengiyle anlaşılır
  const ageMin = load.createdAt ? (Date.now() - Date.parse(load.createdAt)) / 60000 : NaN
  const fresh = Number.isFinite(ageMin) && ageMin >= 0 ? (ageMin < 15 ? "hot" : ageMin < 60 ? "warm" : "") : ""
  const hasTags = load.urgent || hasVehicle || load.trailer || load.tonnage || load.timing || (load.repeatCount ?? 0) > 1

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

  const hasSpecs = hasTags || hasPrice || hasDistance

  return (
    <article
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 280px" }}
      className={cn(
        "relative overflow-hidden rounded-[22px] border bg-white transition-shadow",
        "shadow-[0_1px_2px_rgba(18,44,74,0.05),0_12px_28px_-18px_rgba(18,44,74,0.28)] hover:shadow-[0_2px_4px_rgba(18,44,74,0.06),0_18px_36px_-18px_rgba(18,44,74,0.34)]",
        load.urgent ? "border-[#f4cdbf]" : "border-[#e8edf3]"
      )}
    >
      {load.urgent && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#e5522f] to-[#f4a259]" />}

      <div className="flex flex-col gap-3.5 p-4">
        {/* Üst: kaynak + zaman + aksiyonlar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full text-[12.5px] font-bold text-white",
                isUserLoad ? "bg-gradient-to-br from-[#e5522f] to-[#c13a1c]" : "bg-gradient-to-br from-[#3f7199] to-[#274f73]"
              )}
            >
              {isUserLoad ? (load.initials || "NK") : "SL"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-bold leading-tight text-[#122c4a]">
                {highlightMatch(displayCompany, cleanQuery)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#8da0b2]">
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1",
                    fresh === "hot" && "font-semibold text-emerald-600",
                    fresh === "warm" && "font-medium text-amber-600"
                  )}
                >
                  {fresh && <span aria-hidden className={cn("size-1.5 rounded-full", fresh === "hot" ? "bg-emerald-500" : "bg-amber-500")} />}
                  {load.time}
                </span>
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

        {/* Güzergâh: tek bakışta nereden → nereye */}
        {route ? (
          <div className="rounded-2xl border border-[#e3ebf3] bg-gradient-to-br from-white to-[#f1f6fb] px-4 py-3.5 shadow-[0_1px_0_rgba(18,44,74,0.03)]">
            <div className="flex items-center gap-3">
              <Place dot="bg-emerald-500" caption="Çıkış" label={highlightMatch(route.from, cleanQuery)} sub={load.districtOf?.[route.from]} align="left" onClick={onCitySearch ? () => onCitySearch(route.from) : undefined} />
              <div aria-hidden className="flex w-14 shrink-0 sm:w-20 items-center gap-1.5 text-[#a9bacb]">
                <span className="h-0 flex-1 border-t-2 border-dotted border-current" />
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#d64526] shadow-sm ring-1 ring-[#e3ebf3]"><Truck className="size-4" /></span>
                <span className="h-0 flex-1 border-t-2 border-dotted border-current" />
              </div>
              <Place dot="bg-[#e5522f]" caption="Varış" label={highlightMatch(route.to, cleanQuery)} sub={load.districtOf?.[route.to]} align="right" onClick={onCitySearch ? () => onCitySearch(route.to) : undefined} />
            </div>
          </div>
        ) : places.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {places.slice(0, 4).map((t) => (
              <button key={t.city} type="button" disabled={!onCitySearch} onClick={() => onCitySearch?.(t.city)} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e3ebf3] bg-gradient-to-b from-white to-[#f4f8fc] py-1.5 pl-2.5 pr-3 text-[14px] font-bold text-[#122c4a] active:opacity-60">
                <MapPin aria-hidden className="size-3.5 shrink-0 text-[#d64526]" />
                <span className="truncate">{highlightMatch(t.label, cleanQuery)}</span>
              </button>
            ))}
            {places.length > 4 && <span className="text-xs font-semibold text-[#8da0b2]">+{places.length - 4}</span>}
          </div>
        ) : null}

        {/* Özellikler: tek tip, sakin görünüm; yalnızca acil ve zamanlama renkli */}
        {hasSpecs && (
          <div className="flex flex-wrap items-center gap-1.5">
            {load.urgent && (
              <Tag tone="bg-[#e5522f] text-white">
                <Zap className="size-3 fill-white" />
                ACİL
              </Tag>
            )}
            {load.timing && <Tag tone="bg-emerald-50 text-emerald-700" icon={<Clock className="size-3" />}>{load.timing}</Tag>}
            {hasVehicle && <Tag tone="bg-[#eef3f8] text-[#2c4a66]" icon={<Truck className="size-3" />}>{highlightMatch(load.vehicle, cleanQuery)}</Tag>}
            {load.trailer && <Tag tone="bg-[#eef3f8] text-[#2c4a66]" icon={<Ruler className="size-3" />}>{load.trailer}</Tag>}
            {load.tonnage && <Tag tone="bg-[#eef3f8] text-[#2c4a66]" icon={<Weight className="size-3" />}>{load.tonnage}</Tag>}
            {hasDistance && <Tag tone="bg-[#f1f5f9] text-[#3c566e]">{load.distance}</Tag>}
            {hasPrice && <Tag tone="bg-emerald-600 text-white">{load.price}</Tag>}
            {(load.repeatCount ?? 0) > 1 && <Tag tone="bg-[#f1f5f9] text-[#627d98]" icon={<Repeat2 className="size-3" />}>{load.repeatCount} kez paylaşıldı</Tag>}
          </div>
        )}

        {/* Yük detayı */}
        <div>
          <p className={cn("whitespace-pre-line break-words text-[13.5px] leading-[1.6] text-[#425b73]", !expanded && "line-clamp-3")}>
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
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCall}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#122c4a] text-sm font-semibold text-white shadow-[0_6px_14px_-8px_rgba(18,44,74,0.7)] active:scale-[0.98] active:bg-[#1a3d68]"
            >
              <Phone className="size-[17px]" />
              Ara
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-[0_6px_14px_-8px_rgba(5,150,105,0.8)] active:scale-[0.98] active:bg-emerald-700"
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

function Place({ caption, dot, label, sub, align, onClick }: { caption: string; dot?: string; label: React.ReactNode; sub?: string; align: "left" | "right"; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn("min-w-0 flex-1 active:opacity-60", align === "right" ? "text-right" : "text-left")}
    >
      <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8da0b2]", align === "right" && "justify-end")}>{dot && <i className={cn("size-1.5 rounded-full", dot)} />}{caption}</span>
      <span className="mt-0.5 block truncate text-[17px] font-extrabold leading-tight text-[#122c4a]">{label}</span>
      {sub && <span className="block truncate text-[12px] font-semibold text-[#6b8399]">{sub}</span>}
    </button>
  )
}

function Tag({ tone, icon, children }: { tone: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", tone)}>
      {icon}{children}
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
