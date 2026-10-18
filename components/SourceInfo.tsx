"use client"

import { useState } from "react"
import Link from "next/link"
import { Info } from "lucide-react"
import { Sheet } from "@/components/Sheet"

/**
 * Saha Ağı ilanlarının kaynağına dair TEK bilgilendirme noktası.
 * Kartlarda ve listede ayrıca uyarı gösterilmez; kullanıcı buradan, Yardım Merkezi'nden
 * ve Gizlilik Politikası'ndan ayrıntıya ulaşır.
 */
export function SourceInfoButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-1 text-xs font-semibold text-[#315d83] active:opacity-70"
        }
      >
        <Info className="size-4" aria-hidden />
        Saha Ağı ilanları hakkında
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Saha Ağı ilanları" subtitle="İlanlar nereden geliyor?">
        <div className="space-y-3 pt-1 text-sm leading-relaxed text-[#4a6178]">
          <p>
            <strong className="text-[#122c4a]">Saha Ağı</strong> bölümündeki ilanlar, ilanı yayımlayan kişilerin kamuya açık
            alanlarda zaten herkese açık biçimde paylaştığı nakliye ilanlarından derlenir ve yalnızca bu bilgilerle sınırlı
            olarak listelenir.
          </p>
          <p>
            Nakliye Cepte bu ilanların yayımcısı ya da tarafı değildir. İçeriğin doğruluğundan ilanı paylaşan kişi
            sorumludur; yük, ödeme ve taşıma süreçlerinde aracılık yapılmaz. Anlaşmadan önce karşı tarafı kendiniz
            doğrulayın.
          </p>
          <p>
            İlan size aitse ve listelenmesini istemiyorsanız, ilan kartındaki <strong>⋯</strong> menüsünden{" "}
            <strong>İlanı bildir</strong> &rsaquo; <em>“Bu ilan bana ait, kaldırılmasını istiyorum”</em> seçeneğini
            kullanın ya da{" "}
            <a href="mailto:destek.nakliyecepte.com@gmail.com" className="font-semibold text-[#315d83] underline">
              destek.nakliyecepte.com@gmail.com
            </a>{" "}
            adresine yazın. Talepler incelenir ve ilgili kayıtlar silinir.
          </p>
          <p>
            Ayrıntılar için{" "}
            <Link href="/privacy#kamuya-acik-ilanlar" className="font-semibold text-[#315d83] underline">
              Gizlilik Politikası
            </Link>
            &apos;nı inceleyebilirsiniz.
          </p>
        </div>
      </Sheet>
    </>
  )
}
