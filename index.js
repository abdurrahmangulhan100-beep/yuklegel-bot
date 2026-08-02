const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1004412724337'; 

// ⏱️ MÜKERRER İLAN ENGELLEME SÜRESİ (Dakika)
const BEKLEME_SURESI_DK = 30; 
const gonderilenIlanlar = new Map();

// 🚫 KARA LİSTE (Reklam ve Sohbet Filtresi)
const KARA_LISTE = [
    'grup kuralı', 'grup kuralları', 'reklam', 'satılık tır', 'satılık çekici', 
    'satılık dorsa', 'kiralık', 'üye ol', 'chat.whatsapp.com', 't.me/', 
    'hoşgeldiniz', 'saygılar', 'hayırlı işler', 'hayırlı cumalar'
];

// 🚚 BEYAZ LİSTE (Yük ve Araç Terimleri)
const BEYAZ_LISTE = [
    'yuk', 'yük', 'ton', 'kapak', 'dorse', 'tır', 'tir', 'kamyon', 'kırkayak', 'kirkayak',
    'onteker', 'on teker', 'fide', 'palet', 'çuval', 'cuval', 'dökme', 'dokme', 'sarilacak',
    'sarılayım', 'yuklenecek', 'yüklenecek', 'araniyor', 'aranıyor', 'hazir', 'hazır', 'tenteli', 'frigo'
];

// 🧹 Sade & Temiz İlan Ayrıştırıcı
function sadeIlanAyristir(rawText) {
    // 1. Temel Karakter Temizliği
    let text = rawText
        .replace(/[*_~`]/g, '') // WhatsApp formatlama karakterlerini sil
        .replace(/[-=_]{3,}/g, '') // Uzun cizgileri sil
        .trim();

    // 2. Telefon Numarasını Çek
    const telRegex = /(?:0\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})/g;
    const telefonlar = text.match(telRegex);
    const telefonStr = telefonlar ? [...new Set(telefonlar)].join(', ') : 'Belirtilmedi';

    // Numarayı metinden çıkar
    let temizText = text.replace(telRegex, '').trim();

    // 3. Satırları Ayrıştır
    const satirlar = temizText.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !KARA_LISTE.some(k => s.toLowerCase().includes(k)));

    // İlk satırı genelde Güzergah/Başlık olarak alıyoruz (En sade ve hatasız yöntem)
    let guzergah = satirlar[0] || "Belirtilmedi";
    
    // Eğer ilk satır çok uzunsa veya ilan detayına benziyorsa kısalt
    if (guzergah.length > 60) {
        guzergah = guzergah.substring(0, 57) + "...";
    }

    // Geri kalan satırları Detay olarak birleştir
    let detaySatirlari = satirlar.slice(1).filter(s => s.length < 120);
    
    // Eğer detay kalmadıysa ilk satırı detay olarak da yaz
    let detayStr = detaySatirlari.length > 0 ? detaySatirlari.join('\n') : satirlar[0] || 'Detay belirtilmedi';

    return {
        guzergah: guzergah,
        detay: detayStr,
        telefon: telefonStr
    };
}

// 🛡️ Geçerli İlan Kontrolü
function ilanMiGecerli(text) {
    const kucuk = text.toLowerCase();
    if (KARA_LISTE.some(k => kucuk.includes(k))) return false;
    
    const numaraVar = /(?:0\s*5\d{2})/g.test(text);
    if (!numaraVar) return false;

    return BEYAZ_LISTE.some(b => kucuk.includes(b));
}

// 🔄 Mükerrer (Duplicate) Kontrolü
function mukerrerIlanMi(telefon, detay) {
    const ilanKimligi = `${telefon}_${detay.replace(/\s+/g, '').toLowerCase().slice(0, 40)}`;
    const simdi = Date.now();

    if (gonderilenIlanlar.has(ilanKimligi)) {
        const sonGonderim = gonderilenIlanlar.get(ilanKimligi);
        const gecenSureSaniye = (simdi - sonGonderim) / 1000;

        if (gecenSureSaniye < BEKLEME_SURESI_DK * 60) {
            console.log(`⏳ Aynı ilan tekrar geldi, pas geçildi.`);
            return true;
        }
    }

    gonderilenIlanlar.set(ilanKimligi, simdi);
    return false;
}

// 🧹 Bellek Temizleyici
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
            console.log('\n🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! SADE VE DÜZENLİ İLANLAR ATILACAK...\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            if (ilanMiGecerli(text)) {
                const { guzergah, detay, telefon } = sadeIlanAyristir(text);

                if (mukerrerIlanMi(telefon, detay)) {
                    return;
                }

                console.log("🚚 Taze İlan Yakalandı -> Telegram'a Fırlatılıyor...");

                // Telegram Sade Kart Formatı
                const duzenliMesaj = `📦 **YENİ YÜK İLANI**\n` +
                                     `───────────────────\n` +
                                     `📍 **İlan / Güzergah:**\n${guzergah}\n\n` +
                                     `📋 **Detay:**\n${detay}\n\n` +
                                     `📞 **İletişim:** ${telefon}\n` +
                                     `───────────────────\n` +
                                     `🚛 *Nakliye Cepte*`;

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: duzenliMesaj
                });

                console.log("✅ Sade İlan Telegram'a Başarıyla Gönderildi!");
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