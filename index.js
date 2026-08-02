const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 
const TELEGRAM_CHAT_ID = '-100412724337'; // Kanal veya Grup ID'niz

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
            console.log('\n🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! İLANLAR TELEGRAMA ATILACAK...\n');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            // Telefon numarası içeren ilanları filtreleme
            if (text.includes('05') || text.includes('53') || text.includes('54') || text.includes('55')) {
                console.log("🚚 İlan Yakalandı -> Telegram'a Fırlatılıyor...");

                // Telegram'a temiz mesaj gönderimi (400 hatasını engellemek için markdown kaldırıldı)
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `📦 YENİ YÜK İLANI\n\n${text}`
                });

                console.log("✅ Telegram'a başarıyla gönderildi!");
            }
        } catch (err) {
            // Hatanın detayını görmek için logu genişletiyoruz
            if (err.response) {
                console.error("Telegram API Hatası Detayı:", JSON.stringify(err.response.data));
            } else {
                console.error("Aktarım Hatası:", err.message);
            }
        }
    });
}

startBot();