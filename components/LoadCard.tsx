"use client"

import { toast } from "@/lib/toast"
import { hidePhones } from "@/lib/listings"
import { Phone, MessageCircle, Star, Check, Ban, Zap, ChevronDown, Share2, Copy, Flag, MoreHorizontal, MapPin, Truck, Clock, Weight, Ruler, Repeat2, Route as RouteIcon, Fuel, Wallet } from "lucide-react"
import { Fragment, memo, useEffect, useRef, useState } from "react"
import { isMissing } from "@/lib/route"
import { placeKm, tripEstimate, AVG_CONSUMPTION } from "@/lib/distance"
import { useFuelPrice, agoLabel } from "@/lib/fuel"
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
  /** Metinde geçen ama çıkış/varış olarak ayrılamayan diğer şehirler */
  extraCities?: string[]
  /** Varış alanında birden çok şehir varsa hepsi (ilk eleman ana varış) */
  destinations?: string[]
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
  const textRef = useRef<HTMLParagraphElement>(null)
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
  const cargoClean = !isMissing(load.cargo) ? (isUserLoad ? load.cargo : hidePhones(load.cargo)) : ""
  const cargoText = cargoClean || "Yük detayı belirtilmedi."
  // Saha ilanı: WhatsApp mesajı olduğu gibi gösterilir (satırlar korunur); yalnızca reklam satırları ayıklanır
  const cargoShown = isUserLoad ? cargoText : toDisplayLines(cargoText).join("\n")

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
  }, [cargoShown])

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
              <div className="truncate text-[14px] font-bold leading-tight text-foreground">
                {isUserLoad ? highlightMatch(displayCompany, cleanQuery) : "Saha İlanı"}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
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
                {isUserLoad && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="truncate font-medium text-brand">Nakliye Cepte</span>
                  </>
                )}
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
                isFavorite ? "text-amber-500" : "text-muted-foreground/60"
              )}
            >
              <Star className={cn("size-[21px]", isFavorite && "fill-amber-400")} />
            </button>
            <button
              onClick={openMenu}
              aria-label="İlan işlemleri"
              className="grid size-10 place-items-center rounded-full text-muted-foreground active:bg-muted"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        {/* Güzergâh: tek bakışta nereden → nereye */}
        {route ? (
          <div className="rounded-2xl bg-muted/60 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-center gap-3">
              <Place dot="bg-emerald-500" caption="Çıkış" name={route.from} label={highlightMatch(route.from, cleanQuery)} sub={load.districtOf?.[route.from]} align="left" onClick={onCitySearch ? () => onCitySearch(route.from) : undefined} />
              <div className="flex w-[78px] shrink-0 flex-col items-center sm:w-[108px]">
                <VehicleIcon vehicle={load.vehicle} className="h-9 w-full sm:h-[50px]" />
                <span aria-hidden className="mt-1 h-0 w-full border-t-2 border-dotted border-muted-foreground/40" />
              </div>
              <Place dot="bg-brand" caption="Varış" name={route.to} label={highlightMatch(route.to, cleanQuery)} sub={load.districtOf?.[route.to]} align="right" onClick={onCitySearch ? () => onCitySearch(route.to) : undefined} />
            </div>
            {(load.destinations?.length ?? 0) > 1 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Varışlar</span>
                {load.destinations!.slice(0, 6).map((c) => (
                  <button key={c} type="button" disabled={!onCitySearch} onClick={() => onCitySearch?.(c)} className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-[12.5px] font-bold text-foreground active:opacity-60">
                    {highlightMatch(c, cleanQuery)}
                  </button>
                ))}
                {load.destinations!.length > 6 && <span className="text-xs font-semibold text-muted-foreground">+{load.destinations!.length - 6}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/60 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><i className="size-1.5 rounded-full bg-brand" />Konum</span>
                {places.length > 0 ? (
                  <div className="mt-1 flex flex-col items-start gap-0.5">
                    {places.slice(0, 3).map((t, i) => (
                      <button
                        key={t.city}
                        type="button"
                        disabled={!onCitySearch}
                        onClick={() => onCitySearch?.(t.city)}
                        className={cn("max-w-full text-left font-extrabold leading-tight text-foreground active:opacity-60", i === 0 ? "line-clamp-2 break-words text-[16px] sm:text-[17px]" : "truncate text-[13px] text-foreground/80")}
                      >
                        {highlightMatch(t.label, cleanQuery)}
                      </button>
                    ))}
                    {places.length > 3 && <span className="text-xs font-semibold text-muted-foreground">+{places.length - 3}</span>}
                  </div>
                ) : (
                  <span className="mt-1 block text-[13px] font-semibold text-muted-foreground">Güzergâh ilan metninde</span>
                )}
              </div>
              <div className="flex w-[78px] shrink-0 flex-col items-center sm:w-[108px]">
                <VehicleIcon vehicle={load.vehicle} className="h-9 w-full sm:h-[50px]" />
                <span aria-hidden className="mt-1 h-0 w-full border-t-2 border-dotted border-muted-foreground/40" />
              </div>
            </div>
          </div>
        )}

        {/* Özellikler: tek tip, sakin görünüm; yalnızca acil ve zamanlama renkli */}
        {hasSpecs && (
          <div className="flex flex-wrap items-center gap-1.5">
            {load.urgent && (
              <Tag tone="bg-brand text-white">
                <Zap className="size-3 fill-white" />
                ACİL
              </Tag>
            )}
            {load.timing && <Tag tone="bg-emerald-50 text-emerald-700" icon={<Clock className="size-3" />}>{load.timing}</Tag>}
            {hasVehicle && <Tag tone="bg-muted text-foreground/80">{highlightMatch(load.vehicle, cleanQuery)}</Tag>}
            {load.trailer && !/13[.,]60/.test(load.vehicle ?? "") && <Tag tone="bg-muted text-foreground/80" icon={<Ruler className="size-3" />}>{load.trailer}</Tag>}
            {load.tonnage && <Tag tone="bg-muted text-foreground/80" icon={<Weight className="size-3" />}>{load.tonnage}</Tag>}
            {hasDistance && <Tag tone="bg-muted text-foreground/80">{load.distance}</Tag>}
            {hasPrice && <Tag tone="bg-emerald-600 text-white">{load.price}</Tag>}
            {(load.repeatCount ?? 0) > 1 && <Tag tone="bg-muted text-muted-foreground" icon={<Repeat2 className="size-3" />}>{load.repeatCount} kez paylaşıldı</Tag>}
          </div>
        )}

        <RouteCost from={load.fromCity} to={load.toCity} fromDistrict={load.fromCity ? load.districtOf?.[load.fromCity] : undefined} toDistrict={load.toCity ? load.districtOf?.[load.toCity] : undefined} />

        {/* Yük detayı */}
        <div className="flex-1">
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p
              ref={textRef}
              className="line-clamp-4 whitespace-pre-line break-words text-[13.5px] leading-[1.6] text-foreground/80"
            >
              {highlightMatch(cargoShown, cleanQuery)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="mt-1 inline-flex items-center gap-1 py-1 text-xs font-semibold text-foreground/80"
          >
            {clamped ? "Tamamını gör" : "İlan detayı"}
            <ChevronDown className="size-3.5 -rotate-90" />
          </button>
          {showMessage && (
            <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">
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
          subtitle={load.time}
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
            {route && (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-3.5 py-3 text-[15px] font-extrabold text-foreground">
                <span className="min-w-0 truncate">{route.from}</span>
                <span aria-hidden className="shrink-0 text-muted-foreground">→</span>
                <span className="min-w-0 truncate">{route.to}</span>
              </div>
            )}
            {!route && places.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {places.map((t) => (
                  <span key={t.city} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-1.5 pl-2.5 pr-3 text-[13.5px] font-bold text-foreground">
                    <MapPin aria-hidden className="size-3.5 shrink-0 text-brand" />
                    {t.label}
                  </span>
                ))}
              </div>
            )}
            {hasSpecs && (
              <div className="flex flex-wrap items-center gap-1.5">
                {load.urgent && <Tag tone="bg-brand text-white"><Zap className="size-3 fill-white" />ACİL</Tag>}
                {load.timing && <Tag tone="bg-emerald-50 text-emerald-700" icon={<Clock className="size-3" />}>{load.timing}</Tag>}
                {hasVehicle && <Tag tone="bg-muted text-foreground/80">{load.vehicle}</Tag>}
                {load.trailer && !/13[.,]60/.test(load.vehicle ?? "") && <Tag tone="bg-muted text-foreground/80" icon={<Ruler className="size-3" />}>{load.trailer}</Tag>}
                {load.tonnage && <Tag tone="bg-muted text-foreground/80" icon={<Weight className="size-3" />}>{load.tonnage}</Tag>}
                {hasDistance && <Tag tone="bg-muted text-foreground/80">{load.distance}</Tag>}
                {hasPrice && <Tag tone="bg-emerald-600 text-white">{load.price}</Tag>}
              </div>
            )}
            <RouteCost from={load.fromCity} to={load.toCity} fromDistrict={load.fromCity ? load.districtOf?.[load.fromCity] : undefined} toDistrict={load.toCity ? load.districtOf?.[load.toCity] : undefined} />
            <div className="rounded-xl bg-muted/60 px-3.5 py-3">
              <p className="whitespace-pre-line break-words text-[14.5px] leading-[1.65] text-foreground/80">{cargoShown}</p>
            </div>
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
function RouteCost({ from, to, fromDistrict, toDistrict }: { from?: string; to?: string; fromDistrict?: string; toDistrict?: string }) {
  const { price, live, updatedAt } = useFuelPrice(from)
  const tableEstimate = tripEstimate(from, to, null)
  const [routeKm, setRouteKm] = useState<{ km: number; hours: number } | null>(null)

  useEffect(() => {
    let alive = true
    setRouteKm(null)
    if (!from || !to || from === to) return
    if (tableEstimate?.exact) {
      setRouteKm({ km: tableEstimate.km, hours: tableEstimate.hours })
      return
    }
    placeKm(from, fromDistrict, to, toDistrict).then((result) => {
      if (alive && result) setRouteKm(result)
    })
    return () => { alive = false }
  }, [from, to, fromDistrict, toDistrict])

  if (!from || !to) return null
  const km = routeKm?.km ?? (tableEstimate?.exact ? tableEstimate.km : null)
  const liters = km && km > 0 ? Math.round((km / 100) * AVG_CONSUMPTION) : null
  const cost = liters !== null && price !== null && live ? Math.round((liters * price) / 10) * 10 : null
  const fmt = (n: number) => n.toLocaleString("tr-TR")
  const Stat = ({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) => (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 text-center">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{icon}{label}</span>
      <span className={cn("max-w-full truncate text-[14px] font-extrabold tabular-nums sm:text-[15px]", strong ? "text-brand" : "text-foreground")}>{value}</span>
    </div>
  )
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_2px_10px_rgba(18,44,74,0.045)]">
      <div className="grid grid-cols-3 divide-x divide-border/80 px-1 py-3">
        <Stat icon={<RouteIcon className="size-3.5" />} label="Mesafe" value={km ? `${fmt(km)} km` : "Hesaplanıyor"} />
        <Stat icon={<Fuel className="size-3.5" />} label="Yakıt" value={liters !== null ? `${fmt(liters)} lt` : "—"} />
        <Stat icon={<Wallet className="size-3.5" />} label="Ort. masraf" value={cost !== null ? `₺${fmt(cost)}` : "—"} strong />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/25 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", live ? "bg-emerald-500" : "bg-amber-400")} />
          {live && price !== null ? `Motorin ₺${price.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}/lt · ${agoLabel(updatedAt)}` : "Güncel yakıt verisi bekleniyor"}
        </span>
        <span className="shrink-0">{AVG_CONSUMPTION} lt/100 km</span>
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
