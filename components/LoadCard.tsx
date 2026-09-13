"use client"

import { Phone, MessageSquare, Star, ArrowRight, Building2 } from "lucide-react"

export type Load = {
  id: string
  company: string
  initials: string
  from: string
  to: string
  cargo: string
  vehicle: string
  distance: string
  price: string
  urgent: boolean
  time: string
  color: string
  source: "user" | "bot"
  phone: string
}

type LoadCardProps = {
  load: Load
  searchQuery?: string
}

// Türkçe karakter ve büyük/küçük harf duyarlı kusursuz vurgulama fonksiyonu
const highlightMatch = (text: string, query: string) => {
  if (!query || !text) return text
  
  // Türkçe karakterleri ve büyük/küçük harfleri güvenle eşlemek için regex
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, "gi")
  const parts = text.split(regex)

  return parts.map((part, i) => {
    // Eşleşen kelime kontrolü (büyük/küçük harf duyarsız)
    const isMatch = part.toLocaleLowerCase('tr-TR') === query.toLocaleLowerCase('tr-TR')
    
    return isMatch ? (
      <mark key={i} className="bg-amber-300 text-amber-950 font-bold px-1 rounded mx-0.5 shadow-sm">
        {part}
      </mark>
    ) : (
      part
    )
  })
}

export function LoadCard({ load, searchQuery = "" }: LoadCardProps) {
  const cleanQuery = searchQuery.trim()

  const handleWhatsApp = () => {
    const cleanPhone = load.phone.replace(/\D/g, "")
    const message = `Merhaba, ${load.from} - ${load.to} güzergahındaki ilanınız için yazıyorum.`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const handleCall = () => {
    window.location.href = `tel:${load.phone}`
  }

  return (
    <div className="relative flex flex-col justify-between rounded-xl border border-[#e4e9ef] bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div>
        {/* Üst Kısım: Firma ve Zaman */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f8]">
          <div className="flex items-center gap-3">
            <div className={`grid size-10 place-items-center rounded-lg text-white font-bold text-sm ${load.color}`}>
              {load.initials}
            </div>
            <div>
              <div className="font-semibold text-sm text-[#122c4a]">
                {highlightMatch(load.company, cleanQuery)}
              </div>
              <div className="text-xs text-[#8da0b2] flex items-center gap-1">
                <Building2 className="size-3" /> {load.source === "bot" ? "WhatsApp Bot İlanı" : "YükleGel Kullanıcısı"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {load.urgent && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200">
                Acil
              </span>
            )}
            <span className="text-xs font-medium text-[#8da0b2] bg-[#f5f7fa] px-2.5 py-1 rounded-md">
              {load.time}
            </span>
          </div>
        </div>

        {/* Güzergah Bilgisi */}
        <div className="my-4 flex items-center justify-between bg-[#f8fafc] p-3 rounded-lg border border-[#edf2f7]">
          <div className="flex-1 text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-wider text-[#8da0b2] block font-medium">Çıkış</span>
            <span className="font-bold text-[#122c4a] text-sm">
              {highlightMatch(load.from || "-", cleanQuery)}
            </span>
          </div>
          <div className="px-3 text-[#8da0b2]">
            <ArrowRight className="size-4" />
          </div>
          <div className="flex-1 text-center sm:text-right">
            <span className="text-[11px] uppercase tracking-wider text-[#8da0b2] block font-medium">Varış</span>
            <span className="font-bold text-[#122c4a] text-sm">
              {highlightMatch(load.to || "-", cleanQuery)}
            </span>
          </div>
        </div>

        {/* Yük Detayı */}
        <div className="mb-4">
          <span className="text-[11px] uppercase tracking-wider text-[#8da0b2] block font-medium mb-1">Yük ve Araç Detayı</span>
          <p className="text-sm text-[#334e68] bg-[#f8fafc] p-2.5 rounded-lg border border-[#edf2f7] leading-relaxed">
            {highlightMatch(load.cargo, cleanQuery)}
          </p>
        </div>

        {/* Araç ve Fiyat Bilgisi */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs bg-[#eef4f8] text-[#315d83] font-medium px-3 py-1 rounded-md">
            {highlightMatch(load.vehicle, cleanQuery)}
          </span>
          {load.price && (
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-md ml-auto border border-emerald-200">
              {load.price}
            </span>
          )}
        </div>
      </div>

      {/* Alt Butonlar (İletişim) */}
      <div className="flex items-center justify-between pt-3 border-b-0 border-t border-[#f0f4f8] mt-1">
        <div className="text-xs text-[#8da0b2]">
          İletişim: <span className="font-semibold text-[#122c4a]">{load.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleWhatsApp} 
            title="WhatsApp ile yaz" 
            className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <MessageSquare className="size-4" />
          </button>
          <button 
            onClick={handleCall} 
            title="Hemen Ara" 
            className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
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
