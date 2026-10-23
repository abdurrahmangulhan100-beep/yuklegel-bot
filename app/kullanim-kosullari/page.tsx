import { ContentPage } from "@/components/ContentPage"

export const metadata = {
  title: "Kullanım Koşulları ve Sorumluluk Reddi | Nakliye Cepte",
  description: "Nakliye Cepte kullanım koşulları, ilan ve araç içeriklerine ilişkin sorumluluk reddi, hesaplama ve gelir-gider araçları uyarıları.",
}

const MAIL = "destek.nakliyecepte.com@gmail.com"

export default function TermsPage() {
  return (
    <ContentPage title="Kullanım Koşulları ve Sorumluluk Reddi" subtitle="Son güncelleme: Ekim 2026">
      <p>
        Nakliye Cepte (“Platform”) uygulamasını veya web sitesini kullanarak aşağıdaki koşulları okuduğunuzu ve kabul ettiğinizi beyan edersiniz.
        Koşulları kabul etmiyorsanız Platform’u kullanmayınız.
      </p>

      <h2>1. Platform’un niteliği</h2>
      <p>
        Nakliye Cepte; yük ve araç ilanlarını bir araya getiren, nakliyecilere yönelik hesaplama, kayıt tutma ve hatırlatma araçları sunan bir <strong>bilgi ve aracılık platformudur</strong>.
        Platform; taşıyıcı, taşıma komisyoncusu, taşıma işleri organizatörü, acente, sigortacı, mali müşavir, avukat veya ödeme kuruluşu <strong>değildir</strong>.
        Kullanıcılar arasında kurulan taşıma, kiralama, ücret ve ödeme ilişkilerinin tarafı değildir; bu ilişkilerden doğan hak ve yükümlülükler yalnızca ilgili kullanıcılara aittir.
      </p>

      <h2>2. Saha ağı ve üçüncü kişi ilanları</h2>
      <ul>
        <li>“Saha Ağı” ilanları, herkese açık kaynaklardan otomatik yöntemlerle derlenir; metinler, şehir/ilçe, araç, tonaj ve telefon bilgileri otomatik olarak ayıklanır ve <strong>hatalı, eksik ya da güncelliğini yitirmiş olabilir</strong>.</li>
        <li>Bu ilanların doğruluğu, yükün veya aracın gerçekten mevcut olduğu, ilan sahibinin kimliği ve yetkisi Platform tarafından doğrulanmaz ve garanti edilmez.</li>
        <li>İlanlardaki içerik ilgili ilan sahibine aittir. Platform bu içeriği yalnızca görüntüler; içeriğin hukuka uygunluğundan sorumlu değildir.</li>
        <li>İlanının kaldırılmasını isteyen kişiler, ilan üzerindeki bildirim menüsünden veya <a className="underline" href={`mailto:${MAIL}`}>{MAIL}</a> adresinden başvurabilir; talepler makul sürede değerlendirilir.</li>
      </ul>

      <h2>3. Kullanıcı ilanları ve davranış kuralları</h2>
      <ul>
        <li>Kullanıcı, yayımladığı ilanın doğru, güncel ve hukuka uygun olmasından <strong>kendisi sorumludur</strong>.</li>
        <li>Yasa dışı, yanıltıcı, hakaret veya nefret içeren, üçüncü kişilerin haklarını ihlal eden ilanlar bildirim üzerine veya Platform’un tespitiyle önceden haber verilmeksizin kaldırılabilir.</li>
        <li>Platform, 5651 sayılı Kanun kapsamında yer sağlayıcı konumundadır; hukuka aykırı olduğu bildirilen içeriği makul sürede inceleyip gerekirse kaldırır, genel bir izleme yükümlülüğü üstlenmez.</li>
        <li>Tekrarlayan ihlal, sahte ilan veya kötüye kullanım halinde hesap kısıtlanabilir veya kapatılabilir.</li>
      </ul>

      <h2>4. Kullanıcılar arası anlaşmalar, ödeme ve güvenlik</h2>
      <p>
        Yük/araç anlaşmaları, fiyat pazarlığı, ödeme, teslimat, gecikme, hasar, eksik/fazla teslim ve benzeri tüm hususlar taraflar arasındadır.
        Platform üzerinden tanıştığınız kişilerle çalışmadan önce <strong>kimlik, yetki belgesi (ör. K, R, L, D, C belgeleri), araç ruhsatı, sigorta ve ödeme koşullarını kendiniz doğrulamalısınız</strong>.
        Peşin ödeme, avans veya IBAN talepleri gibi durumlarda dolandırıcılık riskine karşı dikkatli olunuz. Platform; dolandırıcılık, ödeme alamama, yük kaybı/hasarı, gecikme veya taraflar arasındaki uyuşmazlıklardan sorumlu tutulamaz.
        Taşıma sırasında gerekli yük ve sorumluluk sigortalarını yaptırmak, irsaliye/CMR/sevk belgelerini düzenlemek ve mevzuata uymak ilgili kullanıcının yükümlülüğündedir.
      </p>

      <h2>5. Gelir-gider, sefer hesaplama ve diğer araçlar</h2>
      <ul>
        <li>Gelir-Gider, Seferlerim, Sefer Hesapla, yakıt, hacim, takograf, belge ve kontrol listesi gibi araçlar yalnızca <strong>bilgi ve kolaylık amacıyla</strong> sunulur.</li>
        <li>Bu araçlar; mali müşavirlik, vergi, muhasebe, hukuk veya sigorta danışmanlığı değildir. Çıktılar <strong>fatura, defter, beyanname veya resmî belge yerine geçmez</strong>.</li>
        <li>Hesaplamalar kullanıcının girdiği verilere ve tahmini varsayımlara dayanır; yakıt fiyatı, geçiş ücreti, mesafe, süre, kâr ve maliyet sonuçlarının doğruluğu, eksiksizliği veya güncelliği garanti edilmez.</li>
        <li>Vergi, SGK, defter-belge düzeni, e-fatura/e-irsaliye, beyanname ve her türlü yasal kayıt yükümlülüğü <strong>tamamen kullanıcıya aittir</strong>; resmî işlemler için yetkili mali müşavirinize danışınız.</li>
        <li>Kayıtlarınızı düzenli olarak dışa aktararak (CSV) yedeklemeniz önerilir. Teknik arıza, hesap silme veya hizmet değişikliği nedeniyle oluşabilecek veri kaybından Platform sorumlu tutulamaz.</li>
      </ul>

      <h2>6. Şoför araçları ve mevzuat hatırlatmaları</h2>
      <p>
        Çalışma/dinlenme süreleri, belge son kullanma tarihleri, muayene/sigorta hatırlatmaları ve benzeri özellikler yalnızca yardımcı niteliktedir.
        Karayolları Trafik Kanunu, taşıma mevzuatı, takograf ve süre kuralları dahil tüm yasal yükümlülüklere uymak, belgelerin geçerliliğini ve araç/sürücü uygunluğunu kontrol etmek kullanıcıya aittir.
        Bir hatırlatmanın gelmemesi, gecikmesi veya hatalı olması yasal sorumluluğu ortadan kaldırmaz. Araç kullanırken uygulamayı kullanmayınız; trafik güvenliği her zaman önceliklidir.
      </p>

      <h2>7. Harita, konum ve bildirimler</h2>
      <p>
        Konum, harita, mesafe ve bildirim özellikleri cihaz, ağ ve üçüncü taraf hizmetlerine bağlıdır; kesinti, gecikme ve hata içerebilir.
        Bildirimlerin zamanında ulaşacağı veya bir ilanın bildirim sonrasında hâlâ mevcut olacağı garanti edilmez.
      </p>

      <h2>8. Premium abonelik</h2>
      <ul>
        <li>Premium abonelik Google Play üzerinden satın alınır ve Google Play’in ödeme, yenileme, iptal ve iade koşullarına tabidir. Aboneliği Google Play’den dilediğiniz zaman iptal edebilirsiniz; iptal, içinde bulunulan dönemin sonunda geçerli olur.</li>
        <li>Premium özelliklerin kapsamı ve sınırları zaman içinde değişebilir; ücretsiz ve ücretli plan sınırları uygulama içinde belirtilir.</li>
        <li>Tüketicinin mevzuattan doğan cayma ve diğer zorunlu hakları saklıdır.</li>
      </ul>

      <h2>9. Hizmetin “olduğu gibi” sunulması</h2>
      <p>
        Platform “olduğu gibi” ve “mevcut haliyle” sunulur. Hizmetin kesintisiz, hatasız, güvenli veya belirli bir amaca uygun olacağı, içeriklerin doğru ve güncel olacağı taahhüt edilmez.
        Bakım, güncelleme, üçüncü taraf hizmet (ör. barındırma, veritabanı, mesajlaşma altyapısı) kesintileri veya mücbir sebepler nedeniyle hizmet geçici ya da kalıcı olarak değiştirilebilir, sınırlandırılabilir veya durdurulabilir.
      </p>

      <h2>10. Sorumluluğun sınırlandırılması</h2>
      <p>
        Emredici hukuk kurallarının izin verdiği azami ölçüde; Platform, yöneticileri ve çalışanları; Platform’un kullanılması veya kullanılamamasından, ilan ve hesaplama içeriklerine güvenilmesinden,
        kullanıcılar arası anlaşmalardan doğan <strong>dolaylı zararlardan, kâr/kazanç kaybından, itibar kaybından, ceza ve idari para cezalarından, yük/araç hasarından ve veri kaybından sorumlu değildir</strong>.
        Doğrudan zararlar bakımından da sorumluluk, ücretli abonelik varsa son 12 ayda ödenen abonelik bedeliyle sınırlıdır.
        Kast veya ağır kusurdan doğan sorumluluk, kişilerin ölüm veya vücut bütünlüğüne ilişkin zararları ile tüketici mevzuatı gibi kanunen sınırlandırılamayan haklar bu maddenin dışındadır.
      </p>

      <h2>11. Tazminat</h2>
      <p>
        Kullanıcı; bu koşulları veya mevzuatı ihlal etmesi, yayımladığı içerik ya da kurduğu ticari ilişkiler nedeniyle Platform’a yöneltilen talep, ceza ve masraflardan,
        Platform’un kusuru oranında olmamak kaydıyla, Platform’u haberdar ederek sorumlu tutmayacağını ve doğan zararı gidereceğini kabul eder.
      </p>

      <h2>12. Hesap, güvenlik ve kişisel veriler</h2>
      <p>
        Hesap bilgilerinin güvenliği kullanıcıya aittir. Kişisel verilerin işlenmesine ilişkin esaslar <a className="underline" href="/privacy">Gizlilik Politikası</a>’nda açıklanmıştır.
        Hesabınızı dilediğiniz zaman <a className="underline" href="/delete-account">Hesap Silme</a> sayfasından silebilirsiniz.
      </p>

      <h2>13. Fikri mülkiyet</h2>
      <p>
        Platform’un tasarımı, yazılımı, logosu ve markası Nakliye Cepte’ye aittir; izinsiz kopyalanamaz, çoğaltılamaz, otomatik yöntemlerle toplu olarak çekilemez.
      </p>

      <h2>14. Değişiklikler</h2>
      <p>
        Bu koşullar güncellenebilir. Güncel metin bu sayfada yayımlanır; güncellemeden sonra Platform’u kullanmaya devam etmek güncel koşulların kabulü anlamına gelir.
      </p>

      <h2>15. Uygulanacak hukuk ve yetki</h2>
      <p>
        Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda Konya Mahkemeleri ve İcra Daireleri yetkilidir; tüketicilerin kanundan doğan tüketici hakem heyeti ve tüketici mahkemesi başvuru hakları saklıdır.
      </p>

      <h2>16. İletişim</h2>
      <p>Sorularınız, şikâyetleriniz ve içerik kaldırma talepleriniz için: <a className="underline" href={`mailto:${MAIL}`}>{MAIL}</a></p>
    </ContentPage>
  )
}
