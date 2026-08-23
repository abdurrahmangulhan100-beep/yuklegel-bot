'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="size-4" /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">
              Gizlilik Politikası
            </h1>
            <p className="text-xs text-zinc-500">Son Güncelleme: 23 Ağustos 2026</p>
          </div>
        </div>

        <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-4 leading-relaxed">
          <section>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">1. Toplanan Veriler</h2>
            <p>Nakliye Cepte olarak, hizmetlerimizi sunabilmek amacıyla e-posta adresiniz, iletişim bilgileriniz, ilan başlıklarınız ve konum verileriniz gibi temel bilgileri topluyoruz.</p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">2. Verilerin Kullanımı</h2>
            <p>Toplanan veriler yalnızca yük ve araç ilanlarının eşleştirilmesi, kullanıcı doğrulamaları ve platform güvenliğinin sağlanması amacıyla kullanılır. Verileriniz üçüncü taraflarla satılmaz veya pazarlama amacıyla paylaşılmaz.</p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">3. Veri Güvenliği ve Silme</h2>
            <p>Verileriniz endüstri standardı şifreleme yöntemleriyle saklanır. İstediğiniz zaman uygulama veya web sitemiz üzerinden hesabınızı silme talebinde bulunabilirsiniz.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
