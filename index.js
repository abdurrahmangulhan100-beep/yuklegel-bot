const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const axios = require('axios');
const qrcode = require('qrcode-terminal');

// 1. BotFather'dan aldığın uzun Token'ı yaz:
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 

// 2. Ekrandan aldığımız Chat ID:
const TELEGRAM_CHAT_ID = '-100412724337'; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false // Özel QR gösterici kullanacağız
    });

    sock.ev.on('creds.update', saveCreds);

    // Bağlantı durumunu dinle ve koparsa yeniden başlat
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📌 LÜTFEN AŞAĞIDAKİ QR KODU WHATSAPP\'TAN OKUTUN:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Bağlantı koptu, tekrar deneniyor...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! İLANLAR TELEGRAMA ATILACAK...');
        }
    });

    // Mesajları yakala
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            // Numarayı tespit et
            if (text.includes('05') || text.includes('53') || text.includes('54') || text.includes('55')) {
                console.log("🚚 İlan Yakalandı -> Telegram'a Fırlatılıyor...");

                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `📦 **YENİ YÜK İLANI**\n\n${text}`
                });

                console.log("✅ Telegram'a başarıyla gönderildi!");
            }
        } catch (err) {
            console.error("Aktarım Hatası:", err.message);
        }
    });
}

startBot();