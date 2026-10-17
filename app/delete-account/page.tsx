import Link from "next/link"
import { ArrowLeft, UserX } from "lucide-react"

export const metadata = {
  title: "Hesap ve Veri Silme | Nakliye Cepte",
  description: "Nakliye Cepte hesabınızı ve verilerinizi nasıl silebileceğinizi öğrenin.",
}

const SUPPORT_EMAIL = "destek.nakliyecepte.com@gmail.com"

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#122c4a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-[#e4e9ef] p-6 sm:p-10">
        <div className="flex items-center justify-between border-b border-[#edf2f7] pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
              <UserX className="size-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Hesap ve Veri Silme</h1>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-[#315d83] bg-[#f5f7fa] px-3 py-2 rounded-lg">
            <ArrowLeft className="size-4" /> Ana Sayfa
          </Link>
        </div>

        <div className="space-y-6 text-sm text-[#334e68] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">Uygulama içinden silme</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Nakliye Cepte uygulamasına giriş yapın.</li>
              <li>Menüden <strong>Profilim</strong> sayfasını açın.</li>
              <li>Sayfanın en altındaki <strong>Hesabımı Kalıcı Olarak Sil</strong> butonuna basın ve onaylayın.</li>
            </ol>
            <p className="mt-2">
              Silme işlemiyle giriş hesabınız, profiliniz, ilanlarınız, favorileriniz, gelir-gider kayıtlarınız ve
              şikayet kayıtlarınız kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">Uygulamaya erişemiyorsanız</h2>
            <p>
              Hesabınıza kayıtlı e-posta adresinden{" "}
              <a className="font-semibold text-[#315d83] underline" href={`mailto:${SUPPORT_EMAIL}?subject=Hesap%20Silme%20Talebi`}>
                {SUPPORT_EMAIL}
              </a>{" "}
              adresine &quot;Hesap Silme Talebi&quot; konulu bir e-posta gönderin. Talebiniz en geç 30 gün içinde
              sonuçlandırılır.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">Saha ilanlarındaki telefon numaranızın kaldırılması</h2>
            <p>
              Saha lojistik ilanlarında kendi numaranızın yayınlandığını görüyorsanız, aynı e-posta adresine numaranızı
              ve ilgili ilanı belirterek yazın; ilgili kayıtlar kaldırılır.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
