"use client"

import { toast } from "@/lib/toast"
import { hidePhones, maskPhones, cleanRaw } from "@/lib/listings"
import { RichListingText, SummaryChips } from "@/components/RichListingText"
import { Phone, MessageCircle, Star, Check, Ban, Zap, ChevronDown, Share2, Copy, Flag, MoreHorizontal, MapPin, Truck, Clock, Weight, Ruler, Repeat2, Route as RouteIcon, Fuel, Wallet } from "lucide-react"
import { Component, Fragment, memo, useEffect, useRef, useState } from "react"
import { isMissing, type DestinationInfo } from "@/lib/route"
import { routeKm, AVG_CONSUMPTION } from "@/lib/distance"
import { useRoadKm } from "@/lib/road-km-live"
import { useDieselPrice } from "@/lib/fuel"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Sheet } from "@/components/Sheet"
import { VehicleIcon } from "@/components/VehicleIcon"
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
  /** Mesafe hesabında yalnızca gerçek çıkış/varış ilçeleri kullanılır. */
  fromDistrict?: string
  toDistrict?: string
  /** Metinde geçen ama çıkış/varış olarak ayrılamayan diğer şehirler */
  extraCities?: string[]
  /** Varış alanında birden çok şehir varsa hepsi (ilk eleman ana varış) */
  destinations?: string[]
  /** Net kalıpla ayrılmış çoklu rota (ilk eleman ana varış). Belirsizse tanımsız. */
  routes?: DestinationInfo[]
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
      <mark key={i} className="rounded bg-[#fff1c2] dark:bg-amber-400/25 px-0.5 font-semibold text-foreground">
        {part}
      </mark>
    ) : (
      part
    )
  })
}


// ── Ekranda okunaklı gösterim (veritabanındaki metne dokunulmaz) ──

// Başka uygulama / kanal reklamı satırları ekranda gösterilmez (eski kayıtlar için)
const AD_LINE = [
  /\bgetir nakliye\b|\bucretsiz indir\w*|\bdiger ilanlar icin\b|\b(?:google play|play store|app store|apk)\b/,
  /^(?:android|ios|iphone)(?: (?:android|ios|iphone))*$/,
  /\buygulama\w*\b.{0,25}\b(?:indir\w*|yukle\w*)\b|\bindir\w*\b.{0,20}\b(?:android|ios)\b/,
  /\b(?:kanalimiza|kanalimiz|bizi takip|abone ol\w*|takip edin)\b/,
  /\bilanlari\s+\d+\s+ilan\b/,
]
const foldText = (line: string) =>
  line
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
const isAdLine = (line: string) => {
  const n = foldText(line)
  return AD_LINE.some((r) => r.test(n))
}

const toDisplayLines = (text: string) =>
  text
    .replace(/[ \t]+•[ \t]+/g, "\n")
    .replace(/^•\s*/, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !isAdLine(l))

// Ekran için: emoji/dekoratif semboller silinir (oklar "→" olur), süs çizgileri ve reklam satırları düşer.
// Kelimelere, rakamlara, telefon ve satır sırasına dokunulmaz; veritabanındaki metin değişmez.
const ARROWS = /[\u2190-\u21FF\u27F5-\u27FF\u2B00-\u2B11\u2794\u279C\u27A1\u27A4\u25B6\u25BA\u23E9]+/gu
const toCleanDisplay = (text: string) =>
  cleanRaw(text.replace(ARROWS, " {>} "))
    .replace(/ ?\{>\} ?/g, " → ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && /[\p{L}\p{N}]/u.test(l) && !isAdLine(l))
    .join("\n")

const PREVIEW_PX = 138 // ~5 satır: bundan uzun ilanlar solarak kesilir, "Tamamını gör" çıkar
const FADE = "linear-gradient(to bottom, #000 62%, transparent 100%)"

// Yüklenme saati (sabit Türkiye saati: sunucu/cihaz farkı olmasın)
const clockOf = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })
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
  const [detailOpen, setDetailOpen] = useState(false)
  const [clamped, setClamped] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
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
  const cargoClean = !isMissing(load.cargo) ? load.cargo : ""
  const cargoText = cargoClean || "Yük detayı belirtilmedi."
  // Bot ilanında veritabanından gelen metin aynen gösterilir; satır, emoji ve telefon silinmez.
  const cargoShown = toCleanDisplay(cargoText)
  // Kartta numaralar kısmen gizli (gizlilik); tam numara ilan detayında ve Ara / WhatsApp butonlarında
  const cargoPreview = maskPhones(cargoShown)

  // Önizleme gerçekten kırpıldı mı? (satır kaydırmaları dahil, ekranda ölçülür)
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    check()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cargoPreview])

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
    toast(contactLimitMessage())
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
    // Ham mesaj paylaşılır: uygulama adı / imza eklenmez, kesilmez. Telefon paylaşmak da iletişim sayılır:
    // ücretsiz planda günlük limit dolmuşsa numara metinden çıkarılır (ilan metni yine paylaşılır).
    const canShowPhone = !hasPhone || consumeContact(String(load.id), isPremium)
    let text: string
    if (isUserLoad) {
      const route = [load.from, load.to].filter((x) => !isMissing(x)).join(" → ")
      const body = !isMissing(load.cargo) ? load.cargo : ""
      const msg = showMessage ? load.message ?? "" : ""
      text = [route, body, msg, hasPhone && canShowPhone ? formatPhone(load.phone) : ""].filter(Boolean).join("\n")
    } else {
      const raw = !isMissing(load.cargo) ? load.cargo : ""
      text = canShowPhone ? raw : hidePhones(raw)
    }
    text = text.trim()
    if (!text) return
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
      toast("Favorilere ilan ekleyebilmek için lütfen ücretsiz üye olunuz veya giriş yapınız.")
      return
    }

    if (isFavLoading) return
    setIsFavLoading(true)

    try {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast("Favorilere eklemek için oturum açmanız gerekmektedir.")
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
            toast(`Ücretsiz planda en fazla ${FREE_LIMITS.favorites} favori ekleyebilirsiniz. Sınırsız favori için Premium'a geçin.`)
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
      toast("Favori işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.")
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
      toast("Şikayet gönderilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.")
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
  const clockTime = clockOf(load.createdAt)
  const hasTags = Boolean(load.urgent || hasVehicle || load.trailer || load.tonnage || load.timing || (load.repeatCount ?? 0) > 1)

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

  // Detay alanları: yalnızca formdan / ilan metninden bulunabilen bilgi satır olur. Bilinmeyen alan hiç gösterilmez.
  const placeLabel = (given: string, city?: string, district?: string) =>
    !isMissing(given) ? given : city ? (district ? `${city} / ${district}` : city) : ""
  const fromLabel = placeLabel(load.from, load.fromCity, load.fromDistrict)
  const toLabel = placeLabel(load.to, load.toCity, load.toDistrict)
  const multiRoutes = (load.routes?.length ?? 0) > 1 ? load.routes! : null
  const vehicleLabel = [hasVehicle ? load.vehicle : "", load.trailer && !/13[.,]60/.test(load.vehicle ?? "") ? load.trailer : ""].filter(Boolean).join(" · ")
  const hasFieldRows = Boolean(fromLabel || toLabel || multiRoutes || vehicleLabel || load.tonnage || load.timing)
  const showDistanceTag = hasDistance && (!route || !routeKm(load.fromCity, load.fromDistrict, load.toCity, load.toDistrict))
  const otherPlaces = cityTags.filter((t) => t.city !== load.fromCity && t.city !== load.toCity)

  return (
    <article
      onClick={(e) => {
        // Butonlara / bağlantılara basış detayı açmaz; kartın geri kalanına dokunmak açar
        if ((e.target as HTMLElement).closest("button, a")) return
        setDetailOpen(true)
      }}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 280px" }}
      className={cn(
        "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border bg-card transition-shadow",
        "shadow-sm hover:shadow-md dark:shadow-none",
        load.urgent ? "border-brand/40" : "border-border"
      )}
    >
      {load.urgent && <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#e5522f] to-[#f4a259]" />}

      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:gap-3.5 sm:p-4">
        {/* Üst: yüklenme zamanı + favori / menü */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", fresh === "hot" ? "bg-emerald-500" : fresh === "warm" ? "bg-amber-500" : "bg-muted-foreground/40")} />
            <span className={cn("shrink-0 font-semibold", fresh === "hot" ? "text-emerald-600" : fresh === "warm" ? "text-amber-600" : "text-foreground/70")}>{load.time}</span>
            {isUserLoad && <span className="truncate">· {highlightMatch(displayCompany, cleanQuery)}</span>}
          </div>
          <div className="-mr-1.5 flex shrink-0 items-center">
            <button
              onClick={handleFavoriteClick}
              disabled={isFavLoading}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              className={cn("grid size-9 place-items-center rounded-full active:scale-90", isFavLoading && "opacity-50", isFavorite ? "text-amber-500" : "text-muted-foreground/60")}
            >
              <Star className={cn("size-[20px]", isFavorite && "fill-amber-400")} />
            </button>
            <button onClick={openMenu} aria-label="İlan işlemleri" className="grid size-9 place-items-center rounded-full text-muted-foreground active:bg-muted">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        {/* Güzergâh: Çıkış — tır — Varış, km tırın altında */}
        <RouteRow load={load} route={route} places={places} query={cleanQuery} onCitySearch={onCitySearch} />

        {/* İlan metni: botdan geldiği gibi, sembolsüz; uzunsa solar ve tamamı detayda */}
        <div className="flex-1">
          {cargoClean && <div className="mb-2"><SummaryChips text={cargoPreview} /></div>}
          <div
            ref={textRef}
            style={{ maxHeight: PREVIEW_PX, ...(clamped ? { maskImage: FADE, WebkitMaskImage: FADE } : null) }}
            className="overflow-hidden px-0.5"
          >
            <RichListingText text={cargoPreview} renderPlain={(t) => highlightMatch(t, cleanQuery)} />
          </div>
          {clamped && (
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="mt-1 inline-flex items-center gap-1 px-0.5 py-1 text-[13px] font-bold text-brand active:opacity-60"
            >
              Tamamını gör
              <ChevronDown className="size-4 -rotate-90" />
            </button>
          )}
          {showMessage && (
            <p className="mt-1.5 line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">
              {highlightMatch(load.message as string, cleanQuery)}
            </p>
          )}
        </div>

        {/* İletişim */}
        {hasPhone ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCall}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white active:scale-[0.98] active:opacity-90"
            >
              <Phone className="size-[17px]" />
              Ara
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-600/10 text-sm font-semibold text-emerald-700 active:scale-[0.98] active:bg-emerald-600/20"
            >
              <MessageCircle className="size-[17px]" />
              WhatsApp
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-background px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">
            Bu ilan için telefon numarası belirtilmemiş.
          </p>
        )}
      </div>

      {/* İlan detayı: tüm metin, güzergâh, özellikler ve iletişim */}
      {detailOpen && (
        <Sheet
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={isUserLoad ? displayCompany : "Saha İlanı"}
          subtitle={clockTime ? `${load.time} · ${clockTime}` : load.time}
          footer={
            hasPhone ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={handleCall} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white active:opacity-90">
                  <Phone className="size-[17px]" />
                  Ara
                </button>
                <button onClick={handleWhatsApp} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-600/10 text-sm font-semibold text-emerald-700 active:bg-emerald-600/20">
                  <MessageCircle className="size-[17px]" />
                  WhatsApp
                </button>
              </div>
            ) : undefined
          }
        >
          <div className="space-y-3 pt-1">
            <RouteRow load={load} route={route} places={places} query="" />
            {cargoClean && <SummaryChips text={cargoShown} />}
            <RichListingText text={cargoShown} textClass="text-[14.5px] leading-[1.65]" />
            {showMessage && <p className="text-xs italic leading-relaxed text-muted-foreground">{load.message}</p>}
          </div>
        </Sheet>
      )}

      {/* İşlem menüsü / şikayet (sadece açıkken oluşturulur) */}
      {isReportOpen && (
        <Sheet
          open={isReportOpen}
          onClose={closeSheet}
          title={sheetView === "menu" ? "İlan işlemleri" : "İlanı bildir"}
          subtitle={
            sheetView === "menu"
              ? cityText || (isUserLoad ? displayCompany : "Saha İlanı")
              : "Bildiriminiz incelenmek üzere ekibimize iletilir."
          }
          footer={
            sheetView === "report" && !reportSuccess ? (
              <button
                onClick={handleSendReport}
                disabled={isSubmittingReport}
                className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white active:opacity-90 disabled:opacity-60"
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
                      selected ? "border-primary bg-primary/5 text-foreground" : "border-border text-foreground/80"
                    )}
                  >
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", selected ? "border-primary" : "border-input")}>
                      {selected && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    {reason}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setSheetView("menu")}
                className="px-1 pt-2 text-xs font-semibold text-foreground/80"
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

/** Mesafe, yakıt ve gider: üç hücre. Hesap cihazda (ağ yok). Rota bilinmiyorsa görünmez; mazot fiyatı yoksa gider hücresi gizlenir. */
function TripStatsInner({ from, to, fromDistrict, toDistrict }: { from?: string; to?: string; fromDistrict?: string; toDistrict?: string }) {
  const diesel = useDieselPrice()
  const r = useRoadKm(from, fromDistrict, to, toDistrict)
  if (!from || !to || from === to || !r) return null
  const pre = r.exact ? "" : "≈ "
  const liters = Math.round((r.km / 100) * AVG_CONSUMPTION)
  const cost = diesel ? Math.round((liters * diesel) / 10) * 10 : null
  const Cell = ({ icon: Icon, label, value, brand }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; brand?: boolean }) => (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon aria-hidden className={cn("size-3.5", brand ? "text-brand" : "text-muted-foreground")} />
        {label}
      </span>
      <span className={cn("max-w-full truncate text-[15px] font-extrabold tabular-nums", brand ? "text-brand" : "text-foreground")}>{value}</span>
    </div>
  )
  return (
    <div className={cn("mt-3 grid divide-x divide-border/70 rounded-xl bg-card/80 py-2.5 ring-1 ring-border/60", cost !== null ? "grid-cols-3" : "grid-cols-2")}>
      <Cell icon={RouteIcon} label="Mesafe" value={`${pre}${nf(r.km)} km`} />
      <Cell icon={Fuel} label="Yakıt" value={`${pre}${nf(liters)} lt`} />
      {cost !== null && <Cell icon={Wallet} label="Gider" value={`${pre}₺${nf(cost)}`} brand />}
    </div>
  )
}

function RouteRow({ load, route, places, query, onCitySearch }: {
  load: Load
  route: { from: string; to: string } | null
  places: { label: string; city: string }[]
  query: string
  onCitySearch?: (city: string) => void
}) {
  const hasVeh = !isMissing(load.vehicle)
  const vehicleText = hasVeh ? <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-foreground/80 ring-1 ring-border"><Truck aria-hidden className="size-3 shrink-0 text-brand" /><span className="truncate">{load.vehicle}</span></span> : null
  return (
    <div className="rounded-2xl bg-gradient-to-br from-muted/80 to-muted/30 px-3.5 py-3.5 ring-1 ring-border/60 sm:px-4">
      {route ? (
        <div className="flex items-center gap-2.5">
          <Place dot="bg-emerald-500" caption="Çıkış" name={route.from} label={highlightMatch(route.from, query)} sub={load.fromDistrict ?? load.districtOf?.[route.from]} align="left" onClick={onCitySearch ? () => onCitySearch(route.from) : undefined} />
          <div className="flex w-[104px] shrink-0 flex-col items-center sm:w-[132px]">
            <VehicleIcon vehicle={load.vehicle} className="h-11 w-full sm:h-14" />
            <div aria-hidden className="mt-1 flex w-full items-center">
              <i className="size-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="mx-1 h-0 flex-1 border-t-2 border-dashed border-muted-foreground/35" />
              <i className="size-2 shrink-0 rounded-full bg-brand" />
            </div>
            {vehicleText}
          </div>
          <Place dot="bg-brand" caption="Varış" name={route.to} label={highlightMatch(route.to, query)} sub={load.toDistrict ?? load.districtOf?.[route.to]} align="right" onClick={onCitySearch ? () => onCitySearch(route.to) : undefined} />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex w-[104px] shrink-0 flex-col items-center sm:w-[132px]">
            <VehicleIcon vehicle={load.vehicle} className="h-11 w-full sm:h-14" />
            {vehicleText}
          </div>
          <div className="min-w-0 flex-1">
            {places.length > 0 ? (
              <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                {places.slice(0, 4).map((t) => (
                  <button key={t.city} type="button" disabled={!onCitySearch} onClick={() => onCitySearch?.(t.city)} className="max-w-full truncate text-left text-[16px] font-extrabold leading-tight text-foreground active:opacity-60">
                    {highlightMatch(t.label, query)}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[13px] font-semibold text-muted-foreground">Güzergâh ilan metninde</span>
            )}
          </div>
        </div>
      )}
      {route && <SafeBox><TripStatsInner from={load.fromCity} to={load.toCity} fromDistrict={load.fromDistrict} toDistrict={load.toDistrict} /></SafeBox>}
    </div>
  )
}

function Place({ caption, dot, label, sub, align, onClick, name = "" }: { caption: string; dot?: string; label: React.ReactNode; sub?: string; align: "left" | "right"; onClick?: () => void; name?: string }) {
  // Uzun il adları ("Afyonkarahisar", "Kahramanmaraş") üç nokta ile kesilmesin: yazı küçülür, gerekirse 2 satıra bölünür
  const size = name.length > 12 ? "text-[13.5px] sm:text-[15px]" : name.length > 9 ? "text-[15px] sm:text-[16.5px]" : "text-[17px]"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn("min-w-0 flex-1 active:opacity-60", align === "right" ? "text-right" : "text-left")}
    >
      <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground", align === "right" && "justify-end")}>{dot && <i className={cn("size-1.5 rounded-full", dot)} />}{caption}</span>
      <span className={cn("mt-0.5 line-clamp-2 break-words font-extrabold leading-tight text-foreground", size)}>{label}</span>
      {sub && <span className="block truncate text-[12px] font-semibold text-muted-foreground">{sub}</span>}
    </button>
  )
}

/** Mesafe + yakıt tahmini (32 lt/100 km, güncel mazot fiyatı): yalnızca çıkış ve varış şehri belliyse görünür */
const fmt = (n: number) => n.toLocaleString("tr-TR")
function Stat({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center">
      <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</span>
      <span className={cn("max-w-full truncate text-[15px] font-extrabold tabular-nums", strong ? "text-brand" : "text-foreground")}>{value}</span>
    </div>
  )
}
// Hesap kutusunda beklenmedik bir hata olsa bile ilan listesi çökmesin: sessizce gizlenir
class SafeBox extends Component<{ children: React.ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  render() { return this.state.bad ? null : this.props.children }
}

const nf = (n: number) => n.toLocaleString("tr-TR")
/** Sade tahmin: ağ isteği yok, anında hesaplanır. Tablo varsa gerçek km, yoksa "≈" yaklaşık. Fiyat yoksa yalnızca litre gösterilir. */
function RouteCostInner({ from, to, fromDistrict, toDistrict }: { from?: string; to?: string; fromDistrict?: string; toDistrict?: string }) {
  const diesel = useDieselPrice()
  const r = useRoadKm(from, fromDistrict, to, toDistrict) // ilçe varsa önce tahmin, sonra OSRM kesin değeri
  if (!from || !to || from === to) return null
  if (!r) return null
  const { km, exact } = r
  const liters = Math.round((km / 100) * AVG_CONSUMPTION)
  const cost = diesel ? Math.round((liters * diesel) / 10) * 10 : null
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3.5 py-2.5 text-[13px] tabular-nums">
      <span className="inline-flex items-center gap-1.5 font-bold text-foreground"><RouteIcon className="size-4 text-muted-foreground" />{exact ? "" : "≈ "}{nf(km)} km</span>
      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80"><Fuel className="size-4 text-muted-foreground" />{exact ? "" : "≈ "}{nf(liters)} lt</span>
      {cost !== null && <span className="inline-flex items-center gap-1.5 font-extrabold text-brand"><Wallet className="size-4" />{exact ? "" : "≈ "}₺{nf(cost)}</span>}
    </div>
  )
}
function RouteCost(props: { from?: string; to?: string; fromDistrict?: string; toDistrict?: string }) {
  return <SafeBox><RouteCostInner {...props} /></SafeBox>
}

function FieldRow({ icon: Icon, tone, label, children }: { icon: React.ComponentType<{ className?: string }>; tone?: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", tone ?? "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
        <div className="break-words text-[14.5px] font-semibold leading-snug text-foreground">{children}</div>
      </div>
    </div>
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
        "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold active:bg-muted",
        danger ? "text-red-600" : "text-foreground"
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", danger ? "text-red-500" : "text-muted-foreground")} />
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs font-medium tabular-nums text-muted-foreground">{hint}</span>}
    </button>
  )
}
