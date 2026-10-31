"use client"

import { useState } from "react"
import { Mail, HelpCircle, MessageSquare, ShieldCheck, FileText, ChevronDown, ChevronUp, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HelpCenterView() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      q: "Nakliye Cepte nasıl çalışır?",
      a: "Nakliye Cepte, yük veren firmalar ile taşıyıcı nakliyecileri doğrudan buluşturan dijital lojistik ağıdır. İlan oluşturabilir, mevcut seferleri inceleyebilir ve ilan sahipleriyle iletişime geçebilirsiniz."
    },
    {
      q: "İlan yayınlamak ücretli mi?",
      a: "Platformumuzda temel yük ve sefer ilanı oluşturmak tamamen ücretsizdir."
    },
    {
      q: "Hesabımı veya verilerimi nasıl silebilirim?",
      a: "Şirket Profili sayfasının en altında yer alan 'Hesabı ve Tüm Verileri Sil' butonunu kullanarak veya destek e-posta adresimiz üzerinden talepte bulunarak verilerinizi sildirebilirsiniz."
    },
    {
      q: "Saha Ağı ilanları nereden geliyor?",
      a: "Saha Ağı ilanları, ilanı yayımlayan kişilerce kamuya açık alanlarda herkese açık şekilde paylaşılmış nakliye ilanlarından derlenir. Nakliye Cepte bu ilanların yayımcısı değildir ve içerik doğruluğunu garanti etmez. İlan size aitse ve kaldırılmasını istiyorsanız, ilan kartındaki ⋯ menüsünden 'İlanı bildir' seçeneğini kullanabilir veya destek e-posta adresimize yazabilirsiniz."
    },
    {
      q: "İlan veren firma veya taşıyıcıya nasıl ulaşırım?",
      a: "İlan kartındaki Ara ve WhatsApp butonlarını kullanarak ilan sahibiyle doğrudan iletişim kurabilirsiniz."
    }
  ]

  return (
    <div className="max-w-4xl space-y-8">
      {/* Başlık Alanı */}
      <div>
        <span className="text-xs font-semibold text-brand">Destek & İletişim</span>
        <h1 className="text-2xl font-bold text-foreground">Yardım Merkezi</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Sorularınız için rehberimizi inceleyebilir veya destek ekibimizle doğrudan iletişime geçebilirsiniz.
        </p>
      </div>

      {/* İletişim Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* E-Posta Destek Kartı */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="size-10 rounded-xl bg-orange-50 text-brand flex items-center justify-center mb-4">
              <Mail className="size-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">E-Posta Destek Hattı</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Her türlü soru, görüş, şikayet ve veri silme talepleriniz için bize e-posta gönderebilirsiniz.
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border text-xs font-semibold text-foreground break-all">
              destek.nakliyecepte.com@gmail.com
            </div>
          </div>
          <div className="mt-5">
            <a href="mailto:destek.nakliyecepte.com@gmail.com" className="w-full">
              <Button className="w-full bg-brand hover:bg-brand/90 text-white text-xs cursor-pointer">
                E-Posta Gönder
              </Button>
            </a>
          </div>
        </div>

        {/* Çalışma Saatleri ve Lokasyon */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-50 text-foreground/80 flex items-center justify-center shrink-0">
                <Clock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Çalışma Saatleri</h4>
                <p className="text-xs text-muted-foreground">Pazartesi - Cumartesi: 09:00 - 18:00</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Merkez Hizmet Alanı</h4>
                <p className="text-xs text-muted-foreground">Konya / Türkiye (Tüm Türkiye Lojistik Ağı)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Güvenli Lojistik</h4>
                <p className="text-xs text-muted-foreground">Doğrulanmış ilanlar ve doğrudan iletişim imkanı.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sıkça Sorulan Sorular (SSS) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="size-5 text-brand" />
          <h2 className="text-base font-bold text-foreground">Sıkça Sorulan Sorular</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 text-left bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-xs font-semibold text-foreground">{faq.q}</span>
                {openFaq === index ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
              {openFaq === index && (
                <div className="p-4 text-xs text-muted-foreground bg-card border-t border-border leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
