"use client"

import { Phone, MessageSquare, Star, Building2, MapPin, ArrowRight, Truck, Clock, ShieldCheck, Copy, Check, Flag, Ban, X } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

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
}

type LoadCardProps = {
  load: Load
  searchQuery?: string
  isFavorite?: boolean
  onToggleFavorite?: (listingId?: string) => void
  onUserBlocked?: (userIdOrPhone: string) => void
}

const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, "gi")
  const parts = text.split(regex)

  return parts.map((part, i) => {
    const isMatch = part.toLocaleLowerCase('tr-TR') === query.toLocaleLowerCase('tr-TR')

    return isMatch ? (
      <span key={i} className="bg-[#eef4f8] text-[#122c4a] border border-[#cbd5e1] font-semibold px-1.5 py-0.5 rounded-md mx-0.5 inline-block text-xs">
        {part}
      </span>
    ) : (
      part
    )
  })
}

export function LoadCard({ load, searchQuery = "", isFavorite = false, onToggleFavorite, onUserBlocked }: LoadCardProps) {
  const [copied, setCopied] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState("Sahte veya Yanıltıcı İlan")
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [isFavLoading, setIsFavLoading] = useState(false)

  const cleanQuery = searchQuery.trim()
  const isUserLoad = load.source === "user"

  const displayCompany = isUserLoad 
    ? (load.company || "İsimsiz Firma")
    : (load.company && !load.company.toLowerCase().includes("whatsapp") ? load.company : "Saha Lojistik Ağı")

  const copyPhone = () => {
    if (!load.phone || load.phone === "Belirtilmedi") return
    navigator.clipboard.writeText(load.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    if (!load.phone || load.phone === "Belirtilmedi") {
      alert("Bu ilan için telefon numarası bulunamadı.")
      return
    }

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
    if (load.phone && load.phone !== "Belirtilmedi") {
      window.location.href = `tel:${load.phone}`
    } else {
      alert("Bu ilan için telefon numarası bulunamadı.")
    }
  }

  // FAVORİ EKLEME & ÇIKARMA / MİSAFİR KONTROLÜ
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // 1. Misafir Kullanıcı Kontrolü
    const isGuest = typeof window !== "undefined" ? localStorage.getItem("is_guest") === "true" : false
    if (isGuest) {
      alert("Favorilere ilan ekleyebilmek için lütfen ücretsiz üye olunuz veya giriş yapınız.")
      return
    }

    if (isFavLoading) return
    setIsFavLoading(true)

    try {
      if (!supabase) return

      // 2. Aktif Kullanıcı Kontrolü
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Favorilere eklemek için oturum açmanız gerekmektedir.")
        setIsFavLoading(false)
        return
      }

      const listingIdStr = String(load.id)

      if (isFavorite) {
        // Supabase favorites tablosundan sil
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingIdStr)

        if (error) throw error
      } else {
        // Supabase favorites tablosuna ekle
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

      // Üst bileşene durumun değiştiğini bildir
      if (onToggleFavorite) {
        onToggleFavorite(listingIdStr)
      }
    } catch (err) {
      console.error("Favori işlemi sırasında hata oluştu:", err)
      alert("Favori işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.")
    } finally {
      setIsFavLoading(false)
    }
  }

  // Google Play UGC Şikayet Gönderme İşlemi
  const handleSendReport = async () => {
    setIsSubmittingReport(true)
    try {
      if (supabase) {
        await supabase.from("reports").insert([
          {
            listing_id: load.id,
            reason: reportReason,
            target_phone: load.phone,
            created_at: new Date().toISOString()
          }
        ])
      }
      setReportSuccess(true)
      setTimeout(() => {
        setIsReportOpen(false)
        setReportSuccess(false)
      }, 1500)
    } catch (err) {
      console.error("Şikayet gönderilemedi:", err)
      alert("Şikayetiniz alındı, teşekkür ederiz.")
      setIsReportOpen(false)
    } finally {
      setIsSubmittingReport(false)
    }
  }

  // Google Play UGC Kullanıcı Engelleme İşlemi
  const handleBlockUser = () => {
    const target = load.userId || load.phone
    if (!target) return

    if (confirm("Bu kullanıcıyı engellemek istediğinizden emin misiniz? Bu kişiye ait ilanları bir daha görmeyeceksiniz.")) {
      const blocked = JSON.parse(localStorage.getItem("blocked_users") || "[]")
      if (!blocked.includes(target)) {
        blocked.push(target)
        localStorage.setItem("blocked_users", JSON.stringify(blocked))
      }
      if (onUserBlocked) onUserBlocked(target)
      setIsReportOpen(false)
    }
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#cbd5e1] hover:shadow-md">
      <div>
        {/* ÜST KISIM: Firma Bilgisi & Zaman & UGC Butonları */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#f0f4f8]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`grid size-10 shrink-0 place-items-center rounded-xl text-white font-bold text-sm shadow-xs ${load.color || (isUserLoad ? "bg-[#d64526]" : "bg-[#315d83]")}`}>
              {isUserLoad ? (load.initials || "NK") : "SL"}
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-sm text-[#122c4a] truncate">
                  {highlightMatch(displayCompany, cleanQuery)}
                </span>
                {isUserLoad && (
                  <ShieldCheck className="size-4 text-blue-600 shrink-0" title="Onaylı İlan" />
                )}
              </div>
              <div className="text-xs text-[#8da0b2] flex items-center gap-1 mt-0.5">
                <Building2 className="size-3 shrink-0" /> 
                <span className="truncate">
                  {isUserLoad ? "Nakliye Cepte İlanı" : "Saha Lojistik İlanı"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {load.urgent && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 border border-red-200 animate-pulse">
                ACİL YÜK
              </span>
            )}
            <span className="text-xs font-medium text-[#8da0b2] bg-[#f5f7fa] px-2 py-1 rounded-md flex items-center gap-1">
              <Clock className="size-3" />
              {load.time}
            </span>
            {/* Google Play UGC Şikayet Et İkonu */}
            <button
              onClick={() => setIsReportOpen(true)}
              className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
              title="İlanı Şikayet Et veya Engelle"
            >
              <Flag className="size-3.5" />
            </button>
          </div>
        </div>

        {/* NEREDEN - NEREYE ROTA KUTUSU */}
        {isUserLoad && (
          <div className="my-4 rounded-xl bg-[#f8fafc] p-3.5 border border-[#edf2f7]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold tracking-wider text-[#8da0b2] uppercase">Nereden</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[#122c4a] text-sm sm:text-base truncate">
                    {load.from && load.from !== "-" ? highlightMatch(load.from, cleanQuery) : "Belirtilmedi"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center px-2 shrink-0">
                <div className="flex items-center gap-1 text-[#cbd5e1]">
                  <div className="h-0.5 w-3 bg-[#cbd5e1] rounded-full hidden sm:block" />
                  <ArrowRight className="size-4 text-[#8da0b2]" />
                  <div className="h-0.5 w-3 bg-[#cbd5e1] rounded-full hidden sm:block" />
                </div>
                {load.distance && load.distance !== "Belirtilmemiş" && (
                  <span className="text-[10px] font-medium text-[#8da0b2] mt-0.5">{load.distance}</span>
                )}
              </div>

              <div className="flex-1 min-w-0 text-right">
                <span className="block text-[10px] font-bold tracking-wider text-[#8da0b2] uppercase">Nereye</span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="font-bold text-[#122c4a] text-sm sm:text-base truncate">
                    {load.to && load.to !== "-" ? highlightMatch(load.to, cleanQuery) : "Belirtilmedi"}
                  </span>
                  <MapPin className="size-4 text-red-500 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YÜK DETAYI / İLAN İÇERİĞİ */}
        <div className="space-y-2 my-3">
          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#edf2f7]">
            <span className="text-[10px] uppercase tracking-wider text-[#8da0b2] block font-semibold mb-1">
              İlan İçeriği / Yük Detayı
            </span>
            <p className="text-sm text-[#334e68] leading-relaxed font-normal break-words">
              {highlightMatch(load.cargo || "Yük detayı belirtilmedi.", cleanQuery)}
            </p>
          </div>

          {load.message && load.message !== "-" && load.message !== load.cargo && (
            <p className="text-xs text-[#627d98] bg-[#f0f4f8] p-2.5 rounded-lg border border-[#e2e8f0] italic line-clamp-2">
              "{highlightMatch(load.message, cleanQuery)}"
            </p>
          )}
        </div>

        {/* ARAÇ TİPİ VE FİYAT ROZETLERİ */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {load.vehicle && load.vehicle !== "-" && (
            <span className="inline-flex items-center gap-1 text-xs bg-[#eef4f8] text-[#315d83] font-semibold px-2.5 py-1 rounded-md border border-[#cbd5e1]/40">
              <Truck className="size-3.5" />
              {highlightMatch(load.vehicle, cleanQuery)}
            </span>
          )}

          {load.price && load.price !== "₺0" && (
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-md ml-auto border border-emerald-200 shadow-2xs">
              {load.price}
            </span>
          )}
        </div>
      </div>

      {/* ALT KISIM: İletişim & Butonlar */}
      <div className="flex items-center justify-between pt-3 border-t border-[#f0f4f8] mt-3">
        <div className="flex items-center gap-1.5 text-xs text-[#8da0b2]">
          <span>İletişim:</span>
          <span className="font-bold text-[#122c4a]">{load.phone || "Belirtilmedi"}</span>
          {load.phone && load.phone !== "Belirtilmedi" && (
            <button
              onClick={copyPhone}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
              title="Numarayı Kopyala"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleWhatsApp} 
            title="WhatsApp ile Mesaj Gönder" 
            className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            <MessageSquare className="size-4" />
          </button>
          <button 
            onClick={handleCall} 
            title="Hemen Ara" 
            className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            <Phone className="size-4" />
          </button>
          <button 
            onClick={handleFavoriteClick}
            disabled={isFavLoading}
            title={isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"} 
            className={`grid size-9 place-items-center rounded-lg transition-colors cursor-pointer ${
              isFavLoading ? "opacity-50 cursor-not-allowed" : ""
            } ${
              isFavorite 
                ? "bg-amber-50 text-amber-500 hover:bg-amber-100" 
                : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-amber-500"
            }`}
          >
            <Star className={`size-4 ${isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* GOOGLE PLAY UGC MODAL: ŞİKAYET VE ENGELLEME */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Flag className="size-4" />
                <span>İlanı Bildir veya Engelle</span>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="size-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center text-emerald-600 font-semibold text-sm">
                Şikayetiniz incelenmek üzere iletildi.
              </div>
            ) : (
              <div className="space-y-4 pt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Şikayet Sebebi Seçin:</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs bg-gray-50 text-gray-800"
                  >
                    <option value="Sahte veya Yanıltıcı İlan">Sahte veya Yanıltıcı İlan</option>
                    <option value="Uygunsuz / Hakaret İçeren Dil">Uygunsuz / Hakaret İçeren Dil</option>
                    <option value="Spam / Tekrarlanan İçerik">Spam / Tekrarlanan İçerik</option>
                    <option value="Hatalı Telefon Numarası">Hatalı Telefon Numarası</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleSendReport}
                    disabled={isSubmittingReport}
                    className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    {isSubmittingReport ? "Gönderiliyor..." : "İlanı Şikayet Et"}
                  </button>

                  <button
                    onClick={handleBlockUser}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Ban className="size-3.5 text-red-500" />
                    <span>Bu Kullanıcıyı Engelle</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
