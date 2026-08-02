const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1004412724337'; 

// ⏱️ MÜKERRER İLAN ENGELLEME SÜRESİ (Dakika)
const BEKLEME_SURESI_DK = 30; 
const gonderilenIlanlar = new Map(); // { ilanKimligi: timestamp }

// 🚫 KARA LİSTE (Spam, reklam ve gereksiz metinler)
const KARA_LISTE = [
    'grup kuralı', 'grup kuralları', 'reklam', 'satılık tır', 'satılık çekici', 
    'satılık dorsa', 'kiralık', 'üye ol', 'chat.whatsapp.com', 't.me/', 
    'hoşgeldiniz', 'saygılar', 'hayırlı işler', 'hayırlı cumalar', 'aranmaktadır'
];

// 🚚 BEYAZ LİSTE (Yük ve Araç Kelimeleri)
const BEYAZ_LISTE = [
    'yuk', 'yük', 'ton', 'kapak', 'dorse', 'tır', 'tir', 'kamyon', 'kırkayak', 'kirkayak',
    'onteker', 'on teker', 'fide', 'palet', 'çuval', 'cuval', 'dökme', 'dokme', 'sarilacak',
    'sarılayım', 'yuklenecek', 'yüklenecek', 'araniyor', 'aranıyor', 'hazir', 'hazır', 'tenteli', 'frigo'
];

// 🧹 Metin Temizleme ve Ayrıştırma Motoru
function detayliIlanAyristir(rawText) {
    // 1. Temel temizlik: Fazla yıldız, çizgi ve gereksiz karakterleri at
    let text = rawText
        .replace(/[*_~`]/g, '') // WhatsApp kalın/italik işaretlerini temizle
        .replace(/[-=_]{3,}/g, '') // --- veya === şeklindeki uzun çizgileri temizle
        .replace(/\n{3,}/g, '\n\n') // Fazla boş satırları teke düşür
        .trim();

    // 2. İletişim Numaralarını Yakala
    const telRegex = /(?:0\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})/g;
    const telefonlar = text.match(telRegex);
    const telefonStr = telefonlar ? [...new Set(telefonlar)].join(', ') : 'Belirtilmedi';

    // Telefondan arındırılmış metin hazırlayalım
    let temizText = text.replace(telRegex, '').trim();

    // 3. Güzergah Yakalama (Örn: İzmir - Ankara veya Gebze'den Adana'ya)
    const guzergahRegex = /([A-ZÇĞİÖŞÜa-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)?(?:\s*['’]?[dae]n|\s*['’]?[dae]n)?)\s*(?:[-─>➔]|den|dan|ya|ye|e|a)\s*([A-ZÇĞİÖŞÜa-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)?(?:\s*['’]?[yae]|\s*['’]?[yae])?)/i;
    
    let guzergah = "Belirtilmedi";
    const satirlar = temizText.split('\n');
    
    // Satırlar içinden kritik bilgileri ayıkla
    let yukDetaylari = [];

    satirlar.forEach(satir => {
        const s = satir.trim();
        if (!s) return;
        
        const kucuk = s.toLowerCase();
        if (KARA_LISTE.some(k => kucuk.includes(k))) return;

        // Güzergah tespiti yap
        if (guzergah === "Belirtilmedi" && (kucuk.includes('-') || kucuk.includes('>') || kucuk.includes('den') || kucuk.includes('dan'))) {
            const m = s.match(guzergahRegex);
            if (m && m[1] && m[2] && m[1].length > 2 && m[2].length > 2) {
                guzergah = `${m[1].trim()} ➔ ${m[2].trim()}`;
            }
        }

        // Yük/Araç/Tonaj içeren satırları detay listesine ekle
        if (BEYAZ_LISTE.some(b => kucuk.includes(b)) || kucuk.includes('ton') || kucuk.includes('m3')) {
            if (s.length < 100) { // Çok uzun reklam paragrafı değilse al
                yukDetaylari.push(s);
            }
        }
    });

    // Detay satırı kalmadıysa ilk 2 temiz satırı koy
    if (yukDetaylari.length === 0) {
        yukDetaylari = satirlar.filter(s => s.trim().length > 3 && !KARA_LISTE.some(k => s.toLowerCase().includes(k))).slice(0, 2);
    }

    return {
        guzergah: guzergah,
        detay: yukDetaylari.join('\n') || 'Yük Detayı Belirtilmedi',
        telefon: telefonStr
    };
}

// 🛡️ Geçerli İlan Filtresi
function ilanMimiGecerli(text) {
    const kucuk = text.toLowerCase();
    if (KARA_LISTE.some(k => kucuk.includes(k))) return false;
    
    const numaraVar = /(?:0\s*5\d{2})/g.test(text);
    if (!numaraVar) return false;

    return BEYAZ_LISTE.some(b => kucuk.includes(b));
}

// 🔄 Mükerrer (Duplicate) Kontrolü
function mukerrerIlanMi(telefon, detay) {
    // İlana özel benzersiz kimlik (Tel + Detay metni)
    const ilanKimligi = `${telefon}_${detay.replace(/\s+/g, '').toLowerCase().slice(0, 50)}`;
    const simdi = Date.now();

    if (gonderilenIlanlar.has(ilanKimligi)) {
        const sonGonderim = gonderilenIlanlar.get(ilanKimligi);
        const gecenSureSaniye = (simdi - sonGonderim) / 1000;

        if (gecenSureSaniye < BEKLEME_SURESI_DK * 60) {
            const kalanDk = (BEKLEME_SURESI_DK - (gecenSureSaniye / 60)).toFixed(1);
            console.log(`⏳ Aynı ilan tekrar geldi, pas geçildi. (${kalanDk} dk sonra tekrar atılabilir)`);
            return true;
        }
    }

    gonderilenIlanlar.set(ilanKimligi, simdi);
    return false;
}

// 🧹 Bellek Temizleyici (Her 10 dk'da bir eski verileri siler)
setInterval(() => {
    const simdi = Date.now();
    for (let [key, zaman] of gonderilenIlanlar.entries()) {
        if ((simdi - zaman) > BEKLEME_SURESI_DK * 60 * 1000) {
            gonderilenIlanlar.delete(key);
        }
    }
}, 10 * 60 * 1000);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({ 
        version,
        auth: state, 
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '110.0.5563.64'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('\n📌 QR KOD LINKI:', qrImageUrl, '\n');
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Bağlantı koptu (Kod: ${statusCode}), tekrar deneniyor...`);
            
            if (shouldReconnect) {
                setTimeout(startBot, 3000);
            }
        } else if (connection === 'open') {
            console.log('\n🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! AKILLI VE TEMİZ İLANLAR TELEGRAMA ATILACAK...\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            if (ilanMimiGecerli(text)) {
                // Detaylı Ayrıştırma Yap
                const { guzergah, detay, telefon } = detayliIlanAyristir(text);

                // Mükerrer Kontrolü Yap
                if (mukerrerIlanMi(telefon, detay)) {
                    return; // Aynı ilan geldiyse dur ve atma
                }

                console.log("🚚 Taze Yük İlanı Ayrıştırıldı -> Telegram'a Fırlatılıyor...");

                // Telegram Formatı
                const duzenliMesaj = `📦 **YENİ YÜK İLANI**\n` +
                                     `───────────────────\n` +
                                     `📍 **Güzergah:** ${guzergah}\n\n` +
                                     `📋 **İlan Detayı:**\n${detay}\n\n` +
                                     `📞 **İletişim:** ${telefon}\n` +
                                     `───────────────────\n` +
                                     `🚛 *Nakliye Cepte Bot*`;

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: duzenliMesaj
                });

                console.log("✅ Tertemiz İlan Telegram'a Gönderildi!");
            }
        } catch (err) {
            if (err.response) {
                console.error("Telegram API Hatası Detayı:", JSON.stringify(err.response.data));
            } else {
                console.error("Aktarım Hatası:", err.message);
            }
        }
    });
}

startBot();