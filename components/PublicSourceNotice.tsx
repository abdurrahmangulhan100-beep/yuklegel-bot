"use client"

import { useState } from "react"
import Link from "next/link"
import { Info, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Kamuya açık kaynaklardan derlenen ilanlar için kalıcı bilgilendirme.
 * Kısa hali her zaman görünür; "Ayrıntı" ile tam metin açılır.
 */
export function PublicSourceNotice({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <aside
      aria-label="Kaynak bilgilendirmesi"
      className={cn("rounded-2xl border border-[#d9e6f2] bg-[#f1f7fc] px-3.5 py-3", className)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2.5 text-left"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-[#315d83]" aria-hidden />
        <span className="flex-1 text-xs leading-relaxed text-[#315d83]">
          <strong className="font-bold text-[#122c4a]">Saha Ağı ilanları</strong>, kamuya açık alanlarda paylaşılan
          nakliye ilanlarından derlenir.
        </span>
        <span className="flex shrink-0 items-center gap-0.5 pt-0.5 text-[11px] font-semibold text-[#315d83]">
          Ayrıntı
          <ChevronDown className={cn("size-3.5", open && "rotate-180")} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2 border-t border-[#d9e6f2] pt-2.5 pl-[26px] text-xs leading-relaxed text-[#4a6178]">
          <p>
            Bu ilanlar yalnızca kamuya açık erişime sahip paylaşım alanlarından, ilanı yayımlayan kişinin zaten herkese
            açık biçimde paylaştığı bilgilerle sınırlı olarak listelenir. Nakliye Cepte bu ilanların yayımcısı ya da
            tarafı değildir; ilan içeriğinin doğruluğundan ilanı paylaşan kişi sorumludur ve yük, ödeme ve taşıma
            süreçlerinde aracılık yapılmaz.
          </p>
          <p>
            İlanı size aitse ve listelenmesini istemiyorsanız, ilan kartındaki <strong>⋯</strong> menüsünden{" "}
            <strong>İlanı bildir</strong> seçeneğiyle ya da{" "}
            <a href="mailto:destek.nakliyecepte.com@gmail.com" className="font-semibold text-[#315d83] underline">
              destek.nakliyecepte.com@gmail.com
            </a>{" "}
            adresine yazarak kaldırma talebinde bulunabilirsiniz. Talepler incelenir ve ilgili kayıtlar silinir.
          </p>
          <p>
            Ayrıntılı bilgi için{" "}
            <Link href="/privacy#kamuya-acik-ilanlar" className="font-semibold text-[#315d83] underline">
              Gizlilik Politikası
            </Link>
            &apos;nı inceleyebilirsiniz.
          </p>
        </div>
      )}
    </aside>
  )
}
