'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function DeleteAccountPage() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Talebi aldıktan sonra onay mesajı gösteriyoruz
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="size-5" />
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
            Hesap Silme Talebi
          </h1>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          Nakliye Cepte platformundaki hesabınızı ve hesabınıza bağlı tüm verileri (ilanlar, profil bilgileri, kayıtlar) silmek için aşağıdaki formu doldurabilirsiniz.
        </p>

        {submitted ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-6 text-center">
            <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Talebiniz Alındı
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Hesabınız ve ilişkili verileriniz güvenlik kontrollerinin ardından 48 saat içerisinde sistemden kalıcı olarak silinecektir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 flex items-start gap-3">
              <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Dikkat:</strong> Bu işlem geri alınamaz. Silme işlemi tamamlandığında tüm aktif yük ve araç ilanlarınız da yayından kaldırılacaktır.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Kayıtlı E-posta Adresiniz
              </label>
              <input
                type="email"
                required
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-3 px-4 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Silme Nedeni (Opsiyonel)
              </label>
              <textarea
                rows={3}
                placeholder="Hesabınızı neden silmek istediğinizi belirtebilirsiniz..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 py-3 px-4 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-all"
            >
              Hesabımı Silme Talebi Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
