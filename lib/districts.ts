/**
 * İlçe / yaygın sanayi bölgesi -> il eşlemesi (nakliye ilanlarında sık geçenler).
 * Birden fazla ilde aynı adı taşıyan (Ereğli, Yenişehir, Gölbaşı...) veya günlük dilde
 * başka anlamı olan (Ulaş, Kale, Pazar, Çay, Bala...) adlar bilerek EKLENMEDİ.
 */
const RAW: Record<string, string> = {
  "İstanbul": "Arnavutköy,Hadımköy,Sazlıbosna,İkitelli,Esenyurt,Beylikdüzü,Avcılar,Küçükçekmece,Büyükçekmece,Başakşehir,Bağcılar,Bahçelievler,Bakırköy,Bayrampaşa,Esenler,Gaziosmanpaşa,Sultangazi,Eyüpsultan,Kağıthane,Şişli,Beşiktaş,Sarıyer,Beyoğlu,Zeytinburnu,Güngören,Silivri,Çatalca,Şile,Beykoz,Ümraniye,Ataşehir,Kadıköy,Üsküdar,Maltepe,Kartal,Pendik,Tuzla,Sancaktepe,Sultanbeyli,Çekmeköy,Dudullu,Yenibosna,Halkalı",
  "Kocaeli": "Gebze,Dilovası,Darıca,Çayırova,Körfez,Derince,İzmit,Gölcük,Kartepe,Kandıra,Başiskele,Karamürsel",
  "Sakarya": "Adapazarı,Hendek,Arifiye,Akyazı,Karasu,Sapanca,Serdivan,Erenler,Kaynarca,Pamukova,Geyve,Ferizli",
  "Tekirdağ": "Çorlu,Çerkezköy,Çerkezkoy,Kapaklı,Süleymanpaşa,Ergene,Malkara,Şarköy,Hayrabolu,Muratlı,Marmaraereğlisi",
  "Edirne": "Keşan,Uzunköprü,Havsa,Lalapaşa,Enez,İpsala,Kapıkule",
  "Kırklareli": "Lüleburgaz,Babaeski,Pınarhisar,Pehlivanköy,Kofçaz",
  "Bursa": "Osmangazi,Nilüfer,Mudanya,Gemlik,Orhangazi,İnegöl,Karacabey,Mustafakemalpaşa,Gürsu,Kestel,Orhaneli,Harmancık,Büyükorhan,İznik,Yenişehir Bursa,Demirtaş,Hasanağa",
  "Balıkesir": "Bandırma,Edremit,Gönen,Burhaniye,Ayvalık,Susurluk,Bigadiç,Sındırgı,Erdek,Havran,Savaştepe,Dursunbey,Manyas",
  "Çanakkale": "Biga,Gelibolu,Lapseki,Ayvacık,Ezine,Bayramiç,Eceabat",
  "Bilecik": "Bozüyük,Osmaneli,Söğüt,Pazaryeri,Gölpazarı",
  "Yalova": "Çiftlikköy,Çınarcık,Altınova,Armutlu",
  "Ankara": "Çankaya,Keçiören,Yenimahalle,Mamak,Etimesgut,Sincan,Polatlı,Gölbaşı,Pursaklar,Altındağ,Beypazarı,Kazan,Kahramankazan,Ayaş,Haymana,Elmadağ,Kızılcahamam,Nallıhan,Akyurt,Temelli,Ostim,Şereflikoçhisar",
  "Eskişehir": "Odunpazarı,Tepebaşı,Sivrihisar,Alpu,Çifteler,Mihalıççık,Seyitgazi,İnönü",
  "İzmir": "Aliağa,Bornova,Buca,Karşıyaka,Çiğli,Menemen,Torbalı,Kemalpaşa,Bayraklı,Gaziemir,Konak,Karabağlar,Ödemiş,Bergama,Foça,Urla,Çeşme,Seferihisar,Menderes,Kınık,Bayındır,Narlıdere,Güzelbahçe,Balçova,Torbali,Pancar",
  "Manisa": "Akhisar,Turgutlu,Salihli,Soma,Alaşehir,Saruhanlı,Kırkağaç,Demirci,Gördes,Ahmetli,Yunusemre,Şehzadeler,Kula",
  "Aydın": "Söke,Nazilli,Efeler,Kuşadası,Didim,Çine,Germencik,Sultanhisar,Bozdoğan,Incirliova,İncirliova,Karacasu",
  "Denizli": "Pamukkale,Merkezefendi,Çivril,Acıpayam,Honaz,Sarayköy,Buldan,Tavas,Kale Denizli,Çardak,Babadağ",
  "Muğla": "Fethiye,Bodrum,Marmaris,Milas,Menteşe,Yatağan,Ortaca,Dalaman,Köyceğiz,Datça,Seydikemer,Kavaklıdere",
  "Uşak": "Banaz,Sivaslı,Karahallı",
  "Kütahya": "Tavşanlı,Simav,Gediz,Emet,Domaniç,Altıntaş,Dumlupınar",
  "Afyonkarahisar": "Sandıklı,Bolvadin,Emirdağ,Dazkırı,Sinanpaşa,Şuhut,İscehisar,Bayat",
  "Isparta": "Eğirdir,Şarkikaraağaç,Senirkent,Gelendost,Atabey,Keçiborlu",
  "Burdur": "Bucak,Gölhisar,Tefenni,Yeşilova,Ağlasun",
  "Antalya": "Alanya,Manavgat,Kumluca,Serik,Kepez,Konyaaltı,Muratpaşa,Döşemealtı,Finike,Demre,Elmalı,Gazipaşa,Korkuteli,Gündoğmuş",
  "Konya": "Selçuklu,Karatay,Meram,Akşehir,Beyşehir,Cihanbeyli,Çumra,Ilgın,Kadınhanı,Karapınar,Kulu,Sarayönü,Seydişehir,Bozkır,Doğanhisar,Hadim,Yunak,Altınekin,Akören,Güneysınır,Taşkent",
  "Karaman": "Ermenek,Kazımkarabekir,Sarıveliler,Ayrancı",
  "Aksaray": "Ortaköy,Gülağaç,Güzelyurt",
  "Nevşehir": "Ürgüp,Avanos,Göreme,Gülşehir,Kozaklı,Derinkuyu,Hacıbektaş",
  "Niğde": "Çamardı,Ulukışla,Altunhisar",
  "Kayseri": "Melikgazi,Kocasinan,Talas,Develi,Yahyalı,Bünyan,Tomarza,İncesu,Pınarbaşı,Sarıoğlan,Hacılar,Yeşilhisar,Felahiye",
  "Kırşehir": "Kaman,Mucur,Çiçekdağı,Boztepe",
  "Kırıkkale": "Yahşihan,Keskin,Sulakyurt,Balışeyh",
  "Yozgat": "Sorgun,Akdağmadeni,Yerköy,Boğazlıyan,Sarıkaya,Çekerek,Şefaatli",
  "Sivas": "Şarkışla,Suşehri,Divriği,Yıldızeli,Gemerek,Hafik,Gürün,Koyulhisar,Akıncılar",
  "Çorum": "Sungurlu,Osmancık,İskilip,Alaca,Mecitözü,Bayat Çorum,Kargı,Dodurga",
  "Amasya": "Merzifon,Suluova,Taşova,Gümüşhacıköy,Göynücek",
  "Tokat": "Erbaa,Niksar,Turhal,Zile,Reşadiye,Almus,Artova,Sulusaray",
  "Samsun": "Bafra,Çarşamba,Terme,Vezirköprü,Havza,İlkadım,Atakum,Canik,Tekkeköy,Alaçam,Ladik,Ondokuzmayıs",
  "Ordu": "Ünye,Fatsa,Perşembe,Altınordu,Aybastı,Gölköy",
  "Giresun": "Bulancak,Espiye,Tirebolu,Görele,Eynesil,Dereli",
  "Trabzon": "Akçaabat,Vakfıkebir,Sürmene,Araklı,Yomra,Ortahisar,Arsin,Beşikdüzü,Maçka",
  "Rize": "Ardeşen,Pazar Rize,Çayeli,Fındıklı,Kalkandere,Derepazarı",
  "Artvin": "Hopa,Arhavi,Borçka,Şavşat,Yusufeli",
  "Kastamonu": "Taşköprü,Tosya,İnebolu,Cide,Daday,Bozkurt Kastamonu",
  "Sinop": "Boyabat,Gerze,Ayancık,Durağan,Türkeli",
  "Bolu": "Gerede,Mudurnu,Mengen,Göynük,Yeniçağa",
  "Düzce": "Akçakoca,Gölyaka,Kaynaşlı,Cumayeri,Yığılca,Gümüşova",
  "Zonguldak": "Çaycuma,Alaplı,Devrek,Kilimli,Kozlu,Gökçebey",
  "Karabük": "Safranbolu,Yenice Karabük,Eskipazar,Ovacık Karabük",
  "Bartın": "Amasra,Kurucaşile,Ulus Bartın",
  "Çankırı": "Ilgaz,Kurşunlu,Şabanözü,Çerkeş",
  "Adana": "Seyhan,Yüreğir,Çukurova,Sarıçam,Ceyhan,Kozan,İmamoğlu,Karaisalı,Pozantı,Yumurtalık,Tufanbeyli,Aladağ,Feke,Saimbeyli",
  "Mersin": "Tarsus,Anamur,Silifke,Erdemli,Mezitli,Toroslar,Bozyazı,Gülnar,Aydıncık,Çamlıyayla,Mut Mersin,Akkuyu",
  "Osmaniye": "Kadirli,Düziçi,Toprakkale,Sumbas",
  "Hatay": "İskenderun,Antakya,Dörtyol,Defne,Payas,Kırıkhan,Reyhanlı,Samandağ,Erzin,Arsuz,Altınözü,Yayladağı",
  "Kahramanmaraş": "Elbistan,Afşin,Pazarcık,Göksun,Türkoğlu,Dulkadiroğlu,Onikişubat,Andırın,Çağlayancerit",
  "Gaziantep": "Şahinbey,Şehitkamil,Nizip,İslahiye,Oğuzeli,Nurdağı,Araban,Karkamış,Yavuzeli",
  "Kilis": "Elbeyli,Polateli,Musabeyli",
  "Adıyaman": "Kahta,Besni,Gölbaşı Adıyaman,Gerger,Çelikhan,Samsat",
  "Malatya": "Battalgazi,Yeşilyurt,Darende,Doğanşehir,Akçadağ,Arapgir,Yazıhan,Hekimhan,Pütürge",
  "Elazığ": "Karakoçan,Palu,Baskil,Sivrice,Ağın,Arıcak",
  "Bingöl": "Solhan,Karlıova,Kiğı",
  "Tunceli": "Ovacık,Pertek,Hozat,Çemişgezek",
  "Diyarbakır": "Bismil,Ergani,Silvan,Çınar,Kayapınar,Bağlar,Yenişehir Diyarbakır,Hazro,Kulp,Lice,Çermik,Çüngüş",
  "Mardin": "Kızıltepe,Nusaybin,Midyat,Artuklu,Ömerli,Savur,Dargeçit,Mazıdağı",
  "Batman": "Kozluk,Beşiri,Sason,Gercüş,Hasankeyf",
  "Şanlıurfa": "Siverek,Viranşehir,Birecik,Ceylanpınar,Suruç,Akçakale,Harran,Halfeti,Bozova,Hilvan,Eyyübiye,Haliliye,Karaköprü",
  "Siirt": "Kurtalan,Pervari,Baykan,Eruh,Şirvan",
  "Şırnak": "Cizre,Silopi,İdil,Uludere,Beytüşşebap,Güçlükonak,Habur",
  "Van": "Erciş,Çaldıran,Özalp,Gevaş,Muradiye,Edremit Van,Başkale",
  "Hakkari": "Yüksekova,Şemdinli,Çukurca,Derecik",
  "Erzurum": "Aziziye,Palandöken,Yakutiye,Horasan,Oltu,Pasinler,Tortum,Karayazı,Hınıs,Aşkale,Narman",
  "Erzincan": "Refahiye,Tercan,Üzümlü,Çayırlı,Kemah",
  "Ağrı": "Doğubayazıt,Patnos,Taşlıçay,Diyadin,Eleşkirt,Tutak",
  "Kars": "Sarıkamış,Kağızman,Digor,Arpaçay",
  "Iğdır": "Tuzluca,Karakoyunlu,Dilucu",
  "Ardahan": "Göle,Posof,Hanak,Çıldır",
  "Muş": "Malazgirt,Varto,Hasköy Muş",
}
export type District = { city: string; name: string }
const FOLD: Record<string, string> = { "ı": "i", "İ": "i", "I": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c", "â": "a", "î": "i", "û": "u" }
const f = (s: string) => Array.from(s).map((c) => FOLD[c] ?? c.toLowerCase()).join("")

/** katlanmış ilçe adı -> { il, görünen ad } (tek kelimelik adlar; "Yenişehir Bursa" gibi ayrımlı olanlar kendi adıyla eşleşmez) */
export const DISTRICTS: Map<string, District> = new Map()
for (const [city, list] of Object.entries(RAW)) {
  for (const name of list.split(",")) {
    if (name.includes(" ")) continue
    const k = f(name)
    if (!DISTRICTS.has(k)) DISTRICTS.set(k, { city, name })
  }
}
