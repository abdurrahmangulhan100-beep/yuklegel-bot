// Herkese açık rehber makaleleri (AdSense için özgün yayıncı içeriği). Metinleri buradan düzenleyebilirsiniz.
export type Guide = {
  slug: string
  title: string
  description: string
  updated: string
  sections: { heading: string; paragraphs?: string[]; bullets?: string[] }[]
}

export const GUIDES: Guide[] = [
  {
    slug: "tir-tipleri",
    title: "Yük Taşımada Kullanılan Araç Tipleri: Kamyonet, Kamyon, Tır ve Kırkayak",
    description: "Kamyonet, kamyon, tır, kırkayak, frigo ve damperli araçların farkları, yaklaşık yük kapasiteleri ve hangi yük için hangi aracın seçileceği.",
    updated: "Ekim 2026",
    sections: [
      {
        heading: "Doğru aracı seçmek neden önemli?",
        paragraphs: [
          "Yük için gereğinden küçük araç seçmek tonaj ve hacim sorunu çıkarır; gereğinden büyük araç ise gereksiz navlun ödemenize yol açar. İlan verirken ya da ilan ararken araç tipini doğru yazmak, doğru kişiye ulaşmanın en kolay yoludur.",
        ],
      },
      {
        heading: "Başlıca araç tipleri",
        bullets: [
          "Kamyonet: Şehir içi ve kısa mesafe için uygundur. Taşıma kapasitesi modele göre yaklaşık 1 ile 3,5 ton arasındadır. Küçük partiler, ev eşyası ve parsel yükleri için tercih edilir.",
          "Kamyon (tek kasa): Orta tonajlı yükler içindir. Kasa uzunluğu ve eksen sayısına göre kapasite onlarca tona kadar değişebilir; bölgesel dağıtımda yaygındır.",
          "Tır (çekici + dorse): Şehirler arası ve uluslararası taşımanın ana aracıdır. Standart 13,60 metrelik dorsede yaklaşık 24-26 ton yük ve yaklaşık 33 palet taşınır. Gerçek sınırlar araç ruhsatına ve mevzuata bağlıdır.",
          "Kırkayak: Çok akslı kamyon tipidir; ağır ve gabari bakımından uygun yüklerde kullanılır. Kapasitesi aks sayısına göre değişir.",
          "Frigo (frigorifik): Sıcaklık kontrollü kasadır; gıda, süt ürünleri, ilaç gibi soğuk zincir gerektiren yükler içindir.",
          "Damperli: Hafriyat, kum, tahıl gibi dökme yükler için arkadan boşaltmalı kasadır.",
        ],
      },
      {
        heading: "Dorse çeşitleri",
        bullets: [
          "Kapalı (kapalı kasa) dorse: Yağış ve hırsızlığa karşı korumalıdır, paletli ve hassas yükler için idealdir.",
          "Tenteli dorse: Yandan açılabilen branda ile hızlı yükleme sağlar; genel kargo için en yaygın tiptir.",
          "Açık / platform dorse: Makine, çelik ve uzun yükler içindir. Yük bağlama ve branda örtme sorumluluğu önemlidir.",
          "Lowbed: İş makinesi gibi ağır ve yüksek yükler için alçak şasili dorsedir.",
        ],
      },
      {
        heading: "İlan verirken nelere dikkat edin?",
        paragraphs: [
          "Yükün cinsini, yaklaşık tonaj veya palet sayısını, yükleme ve boşaltma şehrini, istenen araç ve dorse tipini ve yükleme tarihini yazın. Bu beş bilgi, gelen aramaların büyük bölümünün sizin için uygun olmasını sağlar.",
        ],
      },
    ],
  },
  {
    slug: "yuk-ilani-nasil-verilir",
    title: "Yük İlanı Nasıl Verilir? Güvenli Taşıma İçin Kontrol Listesi",
    description: "Etkili bir yük ilanında bulunması gereken bilgiler ve taşıyıcıyla anlaşmadan önce yapılması gereken güvenlik kontrolleri.",
    updated: "Ekim 2026",
    sections: [
      {
        heading: "İyi bir ilanda bulunması gerekenler",
        bullets: [
          "Nereden nereye: yükleme ve teslimat şehri (mümkünse ilçe).",
          "Yük bilgisi: cinsi, tonajı veya palet sayısı, ambalaj durumu, özel koşul (kırılabilir, soğuk zincir, tehlikeli madde vb.).",
          "Araç isteği: tır, kamyon, kamyonet, frigo; kapalı, tenteli veya açık dorse.",
          "Zaman: yükleme tarihi ve teslim için beklenen süre. Acil ise bunu belirtin.",
          "İletişim: telefon numarası ve aranabilecek saatler.",
        ],
      },
      {
        heading: "Taşıyıcıyla anlaşmadan önce",
        bullets: [
          "Sürücünün ve aracın bilgilerini isteyin: ehliyet, araç plakası, dorse plakası ve firma adı. Plakayı yüklemeden önce sevk bilgisiyle eşleştirin.",
          "Yetki belgesini sorun. Ticari yük taşıyan araçların taşıma yetki belgesi olması gerekir; belgeyi görmek meşru taşıyıcıyı ayırt etmenin kolay yoludur.",
          "Fiyatı ve ödeme şeklini baştan netleştirin: navlun tutarı, ödeme zamanı (yüklemede, teslimde ya da vadeli), bekleme ve ek durak ücreti.",
          "Sevk belgelerini düzenleyin. Yükle birlikte irsaliye (e-irsaliye kapsamındaysa e-irsaliye) bulunmalı, teslimde alıcıdan imzalı teslim belgesi alınmalıdır.",
          "Değerli yüklerde sigorta yaptırın. Taşıma sürecindeki hasar ve kayıp riskine karşı yük sigortasının kapsamını önceden öğrenin.",
        ],
      },
      {
        heading: "Dolandırıcılığa karşı işaretler",
        bullets: [
          "Piyasanın çok altında bir navlun teklifi ya da çok yüksek bir ücret vaadi.",
          "Yükleme öncesinde \"kapora\" veya \"güvence bedeli\" adıyla para istenmesi.",
          "Sadece mesajla iletişim kurulup aranınca açılmayan numaralar, sürekli değişen plaka bilgisi.",
          "Acele ettirme: \"hemen karar verin, yoksa araç başkasına gider\" baskısı.",
        ],
      },
      {
        heading: "Şüpheli ilanı bildirin",
        paragraphs: [
          "Nakliye Cepte'de ilan kartındaki menüden kullanıcıyı engelleyebilir ve şüpheli gördüğünüz ilanları bize iletebilirsiniz. Güvenliğiniz için ödeme ve teslim adımlarını her zaman yazılı bir anlaşmayla netleştirin.",
        ],
      },
    ],
  },
  {
    slug: "navlun-nasil-hesaplanir",
    title: "Navlun Nasıl Hesaplanır? Sefer Maliyetini Etkileyen Kalemler",
    description: "Bir seferin gerçek maliyetini oluşturan yakıt, geçiş ücretleri, bakım ve boş dönüş gibi kalemler ve basit bir kâr hesabı yöntemi.",
    updated: "Ekim 2026",
    sections: [
      {
        heading: "Navlun nedir?",
        paragraphs: [
          "Navlun, bir yükün A noktasından B noktasına taşınması karşılığında ödenen taşıma bedelidir. Taşıyıcı için asıl soru, bu bedelin seferin tüm masraflarını karşılayıp karşılamadığıdır.",
        ],
      },
      {
        heading: "Maliyeti oluşturan kalemler",
        bullets: [
          "Yakıt: Gidiş ve dönüş mesafesi ile aracın 100 kilometredeki ortalama tüketimine göre hesaplanır. Yük ağırlığı ve yol eğimi tüketimi artırır.",
          "Yol ve geçiş ücretleri: Otoyol, köprü ve tünel geçişleri sefer başına net olarak toplanmalıdır.",
          "Sürücü maliyeti: Maaş, yemek, konaklama ve günlük harcırah.",
          "Araç giderleri: Lastik, bakım, yağ, sigorta, muayene ve amortisman. Bunları kilometre başına pay olarak hesaba katmak gerekir.",
          "Boş dönüş: Dönüşte yük bulunamazsa dönüş yakıtı da sefere yazılır. Bu yüzden dönüş yükü bulmak karı en çok etkileyen kalemlerden biridir.",
          "Bekleme ve yükleme süresi: Rampada geçen süre kazanç kaybıdır; mümkünse sözleşmede bekleme ücreti belirtilmelidir.",
        ],
      },
      {
        heading: "Basit bir hesap örneği",
        paragraphs: [
          "Sefer maliyetini şöyle toplayabilirsiniz: yakıt + geçiş ücretleri + sürücü gideri + kilometre başı araç gideri payı. Bulduğunuz toplam, teklif edeceğiniz navlunun alt sınırıdır; üzerine hedeflediğiniz kâr marjını ekleyerek fiyatınızı belirlersiniz.",
          "Örneğin toplam maliyet 20.000 TL çıkıyorsa ve yüzde 15 kâr hedefliyorsanız, navlunun en az 23.000 TL olması gerekir. Rakamlar tamamen örnektir; güncel yakıt ve ücret değerlerini kendiniz girmelisiniz.",
        ],
      },
      {
        heading: "Nakliye Cepte ile hesap",
        paragraphs: [
          "Uygulamadaki Sefer Hesapla aracı, mesafe ve masraflarınızı girerek seferin maliyetini ve kârını gösterir. Gelir-Gider sekmesi ise tamamlanan seferleri kaydedip aylık kazancınızı takip etmenizi sağlar.",
        ],
      },
    ],
  },
  {
    slug: "takograf-ve-surus-sureleri",
    title: "Takograf ve Sürüş Süreleri: Mola ve Dinlenme Kuralları",
    description: "Ağır vasıta sürücüleri için sürüş süresi, mola ve dinlenme kurallarına genel bakış; takograf neden önemli?",
    updated: "Ekim 2026",
    sections: [
      {
        heading: "Takograf nedir?",
        paragraphs: [
          "Takograf, aracın hızını, kat ettiği mesafeyi ve sürücünün sürüş, mola ve dinlenme sürelerini kaydeden cihazdır. Amaç, yorgun sürüşü önleyerek trafik güvenliğini artırmak ve sürücülerin çalışma düzenini denetlenebilir kılmaktır.",
        ],
      },
      {
        heading: "Genel çerçeve (AB / AETR kuralları)",
        paragraphs: [
          "Uluslararası taşımada uygulanan AETR ve AB düzenlemelerinde yaygın olarak şu sınırlar esas alınır. Güncel ve bağlayıcı hükümler için her zaman ilgili mevzuata bakın.",
        ],
        bullets: [
          "Günlük sürüş süresi en fazla 9 saattir; haftada en çok iki kez 10 saate çıkarılabilir.",
          "4,5 saatlik sürüşün ardından en az 45 dakika mola verilir. Mola, 15 ve 30 dakikalık iki parça halinde de kullanılabilir.",
          "Haftalık toplam sürüş süresi 56 saati, art arda iki haftada toplam sürüş 90 saati aşmamalıdır.",
          "Günlük dinlenme normalde 11 saattir; koşullara bağlı olarak sınırlı sayıda 9 saate düşürülebilir.",
          "Düzenli haftalık dinlenme en az 45 saattir.",
        ],
      },
      {
        heading: "Pratik öneriler",
        bullets: [
          "Seferi planlarken molaları ve dinlenme noktalarını önceden belirleyin; yoğun sezonda güvenli park yeri bulmak zor olabilir.",
          "Takograf kartınızı ve gerekirse çıktıları araçta bulundurun; kontrol sırasında istenebilir.",
          "Varış saatini hesaplarken yalnızca mesafeyi değil, zorunlu mola ve dinlenmeyi de ekleyin.",
        ],
      },
      {
        heading: "Nakliye Cepte Takograf aracı",
        paragraphs: [
          "Şoför Araçları bölümündeki Takograf aracı, sürüş ve mola sürelerinizi girdiğinizde kalan sürüş süresini ve gereken mola zamanını gösterir. Araç bilgilendirme amaçlıdır; resmî kayıt yerine geçmez.",
        ],
      },
    ],
  },
]

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug)
