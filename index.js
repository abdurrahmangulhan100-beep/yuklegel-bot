const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const axios = require('axios');

// BotFather'dan aldığın uzun token'ı buraya tırnak içine yaz:
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8681317123:AAEuIRb2TxEa2twCsefD7deAXpqkxyvWD-U'; 

// Ekranda tespit ettiğimiz Chat ID (değiştirme):
const TELEGRAM_CHAT_ID = '-100412724337'; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });

    sock.ev.on('creds.update', saveCreds);

    // Telefon ile bağlantı kurulduğunda
    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('🚀 ✅ WHATSAPP KÖPRÜSÜ AKTİF! MESAJLAR DİNLENİYOR...');
        }
    });

    // Gruplara gelen mesajları yakala
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

            // Mesajda telefon numarası (05xx veya 5xx) tespiti
            if (text.includes('05') || text.includes('53') || text.includes('54') || text.includes('55')) {
                console.log("🚚 Yük İlanı Yakalandı -> Telegram'a Aktarılıyor...");

                // Doğrudan Telegram Grubuna Mesajı Fırlat
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `📦 **YENİ YÜK İLANI**\n\n${text}`
                });

                console.log("✅ Telegram grubuna başarıyla fırlatıldı!");
            }
        } catch (err) {
            console.error("Ufak bir aktarım hatası oluştu (Bot çalışmaya devam ediyor):", err.message);
        }
    });
}

startBot();