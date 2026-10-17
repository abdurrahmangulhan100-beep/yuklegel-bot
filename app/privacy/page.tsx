import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Gizlilik Politikası | Nakliye Cepte",
  description: "Nakliye Cepte platformu gizlilik politikası ve kişisel verilerin korunması hakkında bilgilendirme.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#122c4a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-[#e4e9ef] p-6 sm:p-10">
        
        {/* Üst Başlık & Geri Dönüş */}
        <div className="flex items-center justify-between border-b border-[#edf2f7] pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-[#eef4f8] rounded-xl flex items-center justify-center text-[#315d83]">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#122c4a]">Gizlilik Politikası</h1>
              <p className="text-xs text-[#8da0b2] mt-0.5">Son Güncelleme: Ekim 2026</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-1.5 text-xs font-semibold text-[#315d83] hover:text-[#122c4a] transition-colors bg-[#f5f7fa] px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="size-4" />
            Ana Sayfa
          </Link>
        </div>

        {/* Metin İçeriği */}
        <div className="space-y-6 text-sm text-[#334e68] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">1. Giriş ve Amaç</h2>
            <p>
              Nakliye Cepte ("Platform"), kullanıcılarının kişisel verilerinin gizliliğine ve güvenliğine büyük önem vermektedir. 
              Bu Gizlilik Politikası, platformumuzu ve mobil uygulamamızı kullanırken toplanan, işlenen ve korunan verileriniz hakkında sizleri bilgilendirmek amacıyla hazırlanmıştır.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">2. Toplanan Veriler</h2>
            <p className="mb-2">Platformumuzu kullandığınızda aşağıdaki veriler toplanabilir:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Hesap ve Profil Bilgileri:</strong> Ad, soyad, e-posta adresi, telefon numarası ve firma adı.</li>
              <li><strong>İlan ve Sefer Bilgileri:</strong> Oluşturduğunuz yük ilanları, güzergah bilgileri, araç tipleri ve yük detayları.</li>
              <li><strong>Gelir-Gider Kayıtları:</strong> Uygulamaya kendiniz girdiğiniz finans kayıtları. Bu kayıtlar yalnızca size aittir ve diğer kullanıcılara gösterilmez.</li>
              <li><strong>Favoriler ve Şikayetler:</strong> Favorilediğiniz ilanlar ve gönderdiğiniz şikayet kayıtları.</li>
              <li><strong>Teknik Veriler:</strong> IP adresi, cihaz ve tarayıcı bilgisi ile anonim kullanım istatistikleri (Vercel Analytics).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">3. Verilerin Kullanım Amaçları</h2>
            <p>Toplanan verileriniz şu amaçlarla kullanılır:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm mt-1">
              <li>Nakliye ilanlarının yayınlanması ve lojistik eşleşmelerinin sağlanması,</li>
              <li>İlan sahipleri ve taşıyıcılar arasında iletişimin kolaylaştırılması (WhatsApp/Arama),</li>
              <li>Sistem güvenliğinin ve sahte ilan kontrolünün sağlanması,</li>
              <li>Kullanıcı destek ve bildirim süreçlerinin yönetilmesi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">4. Veri Paylaşımı ve Üçüncü Taraflar</h2>
            <p>
              Kişisel verileriniz, yasal zorunluluklar haricinde üçüncü şahıslara satılmaz veya kiralanmaz. 
              Yayınladığınız yük ilanlarındaki iletişim bilgileri (telefon numarası ve firma adı), ilanı inceleyen diğer kullanıcılar tarafından görüntülenebilir.
            </p>
            <p className="mt-2">
              Kamuya açık kaynaklardan derlenen ilanlara ilişkin ayrıntılar bir sonraki bölümde yer almaktadır.
            </p>
            <p className="mt-2">
              <strong>Hizmet sağlayıcılar:</strong> Verileriniz; veri tabanı ve kimlik doğrulama için Supabase, barındırma ve
              anonim kullanım ölçümü için Vercel altyapılarında işlenir.
            </p>
            <p className="mt-2">
              <strong>Saklama süresi:</strong> Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı sildiğinizde
              hesaba bağlı tüm veriler kalıcı olarak silinir.
            </p>
          </section>

          <section id="kamuya-acik-ilanlar" className="scroll-mt-6 rounded-xl border border-[#d9e6f2] bg-[#f1f7fc] p-4">
            <h2 className="text-base font-bold text-[#122c4a] mb-2">5. Kamuya Açık Kaynaklardan Derlenen İlanlar (Saha Ağı)</h2>
            <p>
              Platformdaki <strong>Saha Ağı</strong> bölümünde yer alan ilanlar, ilanı yayımlayan kişilerce kamuya açık
              alanlarda herkesin görebileceği biçimde paylaşılmış nakliye ilanlarından derlenir. Nakliye Cepte bu
              ilanların yayımcısı ya da tarafı değildir; ilan içeriğinin doğruluğundan ilanı paylaşan kişi sorumludur.
              Nakliye Cepte yük, ödeme veya taşıma süreçlerinde aracılık yapmaz.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm mt-2">
              <li><strong>İşlenen veriler:</strong> İlan metni, güzergah ve araç bilgisi ile ilan sahibinin ilanda kendi isteğiyle paylaştığı telefon numarası. Bunun dışında bir veri toplanmaz.</li>
              <li><strong>Amaç:</strong> Yük ve taşıyıcıların birbirini bulmasını kolaylaştırmak; ilanı, yayımlandığı amaçla uyumlu şekilde göstermek.</li>
              <li><strong>Hukuki sebep:</strong> Verilerin ilgili kişi tarafından alenileştirilmiş olması ve ilan sahipleri ile taşıyıcıların bir araya gelmesine yönelik meşru menfaat (6698 sayılı Kanun m.5/2-d ve m.5/2-f).</li>
              <li><strong>Saklama:</strong> İlanlar güncelliğini yitirdikçe listeden kalkar; bildirim ya da talep halinde ilgili kayıt hemen silinir.</li>
              <li><strong>Veri sorumlusu:</strong> Nakliye Cepte. Bu verilerle reklam profili oluşturulmaz, veriler üçüncü taraflara satılmaz.</li>
            </ul>
            <p className="mt-2">
              <strong>İlanınızın kaldırılmasını istiyorsanız:</strong> İlan kartındaki <strong>⋯</strong> menüsünden
              &quot;İlanı bildir &gt; Bu ilan bana ait, kaldırılmasını istiyorum&quot; seçeneğini kullanabilir veya{" "}
              <strong>destek.nakliyecepte.com@gmail.com</strong> adresine yazabilirsiniz. Talebiniz incelenir ve
              ilgili ilan ile bu ilana bağlı iletişim bilgileri silinir.
            </p>
          </section>

          <section className="bg-red-50/50 p-4 rounded-xl border border-red-100">
            <h2 className="text-base font-bold text-red-900 mb-2">6. Hesap ve Veri Silme Hakkı (Google Play Uyumlu)</h2>
            <p className="text-xs sm:text-sm text-red-800">
              Kullanıcılar diledikleri zaman hesaplarını ve platformda kaydedilmiş tüm verilerini silme hakkına sahiptir. 
              Hesabınızı ve verilerinizi silmek için uygulama içinde <strong>Profilim &gt; Hesabımı Kalıcı Olarak Sil</strong> seçeneğini kullanabilir veya 
              <strong> destek.nakliyecepte.com@gmail.com</strong> e-posta adresi üzerinden veri silme talebinde bulunabilirsiniz.
              Ayrıntılı bilgi için <Link href="/delete-account" className="underline font-semibold">Hesap ve Veri Silme</Link> sayfasına bakın.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">7. KVKK Kapsamındaki Haklarınız</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi uyarınca; verilerinizin işlenip
              işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz.
              Başvurularınızı aşağıdaki e-posta adresine iletebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">8. Şikayet ve Engelleme</h2>
            <p>
              Uygunsuz, sahte veya yanıltıcı ilanları ilan kartındaki bayrak simgesinden bildirebilir ve ilan sahibini
              engelleyebilirsiniz. Bildirimler incelenir ve gerekli görülen ilanlar kaldırılır.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#122c4a] mb-2">9. İletişim</h2>
            <p>
              Gizlilik politikamız veya kişisel verilerinizle ilgili sorularınız için bizimle <strong>destek.nakliyecepte.com@gmail.com</strong> e-posta adresi üzerinden iletişime geçebilirsiniz.
            </p>
          </section>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-8 pt-6 border-t border-[#edf2f7] text-center text-xs text-[#8da0b2]">
          © 2026 Nakliye Cepte - Tüm Hakları Saklıdır.
        </div>
      </div>
    </div>
  )
}
