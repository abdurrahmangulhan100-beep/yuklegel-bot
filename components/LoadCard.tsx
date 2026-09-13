"use client"

import { useState } from "react"
import { MessageCircle, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type Load = { 
  id: number | string; 
  company: string; 
  initials: string; 
  from: string; 
  to: string; 
  cargo: string; 
  vehicle: string; 
  distance: string; 
  price: string; 
  urgent?: boolean; 
  time: string; 
  color: string; 
  source: "user" | "bot";
  phone?: string;
}

export function LoadCard({ load }: { load: Load }) { 
  const [saved, setSaved] = useState(false); 
  const phoneNum = load.phone || "05551234567";

  return (
    <article className="rounded-xl border border-[#e4e9ef] bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(18,44,74,0.07)]">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("grid size-10 place-items-center rounded-lg text-xs font-bold text-white", load.color)}>{load.initials}</div>
          <div>
            <div className="text-sm font-bold">{load.company}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-[#8da0b2]">{load.time}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {load.source === "bot" && <Badge className="bg-[#eef4f8] text-[10px] font-semibold text-[#315d83] hover:bg-[#eef4f8]">WhatsApp / Bot</Badge>}
          {load.urgent && <Badge className="bg-[#fff0ec] text-[10px] font-semibold text-[#d64526] hover:bg-[#fff0ec]">Acil</Badge>}
        </div>
      </div>

      {load.source === "user" ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-[#f7f9fb] px-4 py-3">
          <div><div className="text-sm font-bold">{load.from}</div><div className="text-[10px] text-[#8da0b2]">Çıkış</div></div>
          <div className="flex flex-1 items-center gap-2"><div className="h-px flex-1 bg-[#cad5df]" /><div className="text-[#d64526]">→</div><div className="h-px flex-1 bg-[#cad5df]" /></div>
          <div className="text-right"><div className="text-sm font-bold">{load.to}</div><div className="text-[10px] text-[#8da0b2]">Varış</div></div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-[#f7f9fb] p-3 text-sm text-[#243c5a] leading-relaxed border border-[#edf0f3]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8da0b2]">WhatsApp Mesaj İçeriği</div>
          <p className="font-normal whitespace-pre-wrap">{load.cargo}</p>
        </div>
      )}

      {load.source === "user" && (
        <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
          <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Yük detayı</div><div className="font-medium">{load.cargo}</div></div>
          <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Araç tipi</div><div className="font-medium">{load.vehicle}</div></div>
        </div>
      )}

      <div className="flex items-end justify-between border-t border-[#edf0f3] pt-4">
        {load.source === "user" ? (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[#9aaaba]">Fiyat / Bilgi</div>
            <div className="mt-1 text-xl font-bold text-[#d64526]">{load.price}</div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[#9aaaba]">İletişim Hattı</div>
            <div className="mt-1 text-sm font-bold text-[#315d83]">{phoneNum}</div>
          </div>
        )}
        
        <div className="flex gap-2">
          <a href={`https://wa.me/${phoneNum.replace(/\D/g, "")}?text=İlanınızla%20ilgileniyorum`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#3b8068] hover:bg-[#e7f5ed]"><MessageCircle /></a>
          <a href={`tel:${phoneNum}`} aria-label="Ara" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#315d83] hover:bg-[#eef4f8]"><Phone /></a>
          <button type="button" aria-label="Kaydet" className={cn("cursor-pointer rounded-lg border p-2", saved ? "border-[#806c41] bg-[#fff8e8] text-[#806c41]" : "border-[#dbe3ea] text-[#806c41]")} onClick={() => setSaved(!saved)}>☆</button>
        </div>
      </div>
    </article>
  )
}
