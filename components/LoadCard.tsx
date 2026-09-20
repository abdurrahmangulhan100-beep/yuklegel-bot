"use client"

import { Phone, MessageSquare, Star, Building2, MapPin, ArrowRight, Truck, Clock, ShieldCheck, Copy, Check } from "lucide-react"
import { useState } from "react"

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

export function LoadCard({ load, searchQuery = "" }: LoadCardProps) {
  const [copied, setCopied] = useState(false)
  const cleanQuery = searchQuery.trim()
  const isUserLoad = load.source === "user"

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

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[#cbd5e1] hover:shadow-md">
      <div>
        {/* ÜST KISIM: Firma Bilgisi & Zaman */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#f0f4f8]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`grid size-10 shrink-0 place-items-center rounded-xl text-white font-bold text-sm shadow-xs ${load.color || (isUserLoad ? "bg-[#d64526]" : "bg-[#315d83]")}`}>
              {load.initials || load.company?.substring(0, 2).toUpperCase() || (isUserLoad ? "LN" : "SL")}
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-sm text-[#122c4a] truncate">
                  {highlightMatch(load.company || (isUserLoad ? "İsimsiz Firma" : "Saha Lojistik Ağı"), cleanQuery)}
                </span>
                {isUserLoad && (
                  <ShieldCheck className="size-4 text-blue-600 shrink-0" title="Onaylı İlan" />
                )}
              </div>
              <div className="text-xs text-[#8da0b2] flex items-center gap-1 mt-0.5">
                <Building2 className="size-3 shrink-0" /> 
                <span className="truncate">
                  {isUserLoad ? "Nakliye Cepte Kullanıcısı" : "Saha Lojistik İlanı"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {load.urgent && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600 border border-red-200 animate-pulse">
                ACİL YÜK
              </span>
            )}
            <span className="text-xs font-medium text-[#8da0b2] bg-[#f5f7fa] px-2 py-1 rounded-md flex items-center gap-1">
              <Clock className="size-3" />
              {load.time}
            </span>
          </div>
        </div>

        {/* NEREDEN - NEREYE ROTA KUTUSU (Sadece Kullanıcı İlanlarında Gösterilir) */}
        {isUserLoad && (
          <div className="my-4 rounded-xl bg-[#f8fafc] p-3.5 border border-[#edf2f7]">
            <div className="flex items-center justify-between gap-2">
              {/* Kalkış */}
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold tracking-wider text-[#8da0b2] uppercase">Nereden</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-[#122c4a] text-sm sm:text-base truncate">
                    {load.from && load.from !== "-" ? highlightMatch(load.from, cleanQuery) : "Belirtilmedi"}
                  </span>
                </div>
              </div>

              {/* Ok */}
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

              {/* Varış */}
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
            title="Favorilere Ekle" 
            className="grid size-9 place-items-center rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-amber-500 transition-colors cursor-pointer"
          >
            <Star className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
