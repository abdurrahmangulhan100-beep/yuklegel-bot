const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1004412724337'; 

// 🚫 KARA LİSTE (Reklam ve Sohbet Filtresi)
const KARA_LISTE = [
    'grup kuralı', 'grup kuralları', 'reklam', 'satılık tır', 'satılık çekici', 
    'satılık dorsa', 'kiralık', 'üye ol', 'chat.whatsapp.com', 't.me/', 
    'hoşgeldiniz', 'saygılar', 'hayırlı işler'
];

// 🚚 BEYAZ LİSTE (Yük/Araç Terimleri)
const BEYAZ_LISTE = [
    'yuk', 'yük', 'ton', 'kapak', 'dorse', 'tır', 'tir', 'kamyon', 'kırkayak', 'kirkayak',
    'onteker', 'on teker', 'fide', 'palet', 'çuval', 'cuval', 'dökme', 'dokme', 'sarilacak',
    'sarılayım', 'yuklenecek', 'yüklenecek', 'araniyor', 'aranıyor', 'hazir', 'hazır'
];

// 🧠 Akıllı Ayrıştırıcı: Metinden Sadece Temel Bilgileri Çeker
function metniAyristir(text) {
    // 1. Telefon Numarasını Bul (Örn: 0532 123 45 67 veya 05321234567)
    const telRegex = /(?:0\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})/g;
    const telefonlar = text.match(telRegex);
    const telefon = telefonlar ? telefonlar.join(', ') : 'Belirtilmedi';

    // 2. Satır Satır Temizlik Yap (İçinde yük/araç/şehir geçen kritik satırları al)
    const satirlar = text.split('\n');
    let ozetSatirlar = [];

    satirlar.forEach(satir => {
        const kucukSatir = satir.toLowerCase().trim();
        // Boş satırları, sadece numara içerenleri ve kara liste kelimelerini at
        if (!kucukSatir) return;
        if (KARA_LISTE.some(k => kucukSatir.includes(k))) return;

        // Satırda şehir yönlendirmesi (den/dan/a/e/-/>) veya yük/araç terimi var mı?
        const kritikSatir = BEYAZ_LISTE.some(b => kucukSatir.includes(b)) || 
                            kucukSatir.includes('->') || 
                            kucukSatir.includes('>') || 
                            kucukSatir.includes('-');

        if (kritikSatir) {
            // Telefon numarasını satır içinden temizle ki tekrar etmesin
            let temizSatir = satir.replace(telRegex, '').trim();
            if (temizSatir.length > 3) {
                ozetSatirlar.push(temizSatir);
            }
        }
    });

    // Eğer süzülen satır yoksa ama numara varsa ilk 2 satırı al
    if (ozetSatirlar.length === 0) {
        ozetSatirlar = satirlar.slice(0, 2).map(s => s.replace(telRegex, '').trim()).filter(Boolean);
    }

    return {
        detay: ozetSatirlar.join('\n'),
        telefon: telefon
    };
}

function ilanMimiGecerli(text) {
    const kucukMetin = text.toLowerCase();
    if (KARA_LISTE.some(kelime => kucukMetin.includes(kelime))) return false;
    
    const numaraVar = /(?:0\s*5\d{2})/g.test(text);
    if (!numaraVar) return false;

    return BEYAZ_LISTE.some(kelime => kucukMetin.includes(kelime));
}

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
            console.log('\n🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! ÖZET İLANLAR TELEGRAMA ATILACAK...\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            if (ilanMimiGecerli(text)) {
                console.log("🚚 Yük İlanı Yakalandı -> Ayrıştırılıyor...");

                // Metni Sadeleştir
                const { detay, telefon } = metniAyristir(text);

                // Telegram için Tertemiz Kart Formatı
                const duzenliMesaj = `📦 **YENİ YÜK İLANI**\n` +
                                     `───────────────────\n` +
                                     `📋 **İlan Özeti:**\n${detay}\n\n` +
                                     `📞 **İletişim:** ${telefon}\n` +
                                     `───────────────────\n` +
                                     `🚛 *Nakliye Cepte*`;

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: duzenliMesaj
                });

                console.log("✅ Özet İlan Telegram'a Fırlatıldı!");
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