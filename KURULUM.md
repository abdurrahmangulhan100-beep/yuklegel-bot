# Statik yayın + Cloudflare kurulumu

## 1) Repo'da yapılacaklar
- Bu klasördeki dosyaları repo'ya aynı yollarla kopyala (üzerine yaz):
  next.config.mjs, wrangler.jsonc, .env.example, app/layout.tsx,
  components/PremiumProvider.tsx, supabase/functions/premium-verify/index.ts
- SİL: app/api/premium/verify/route.ts  (app/api klasörü tamamen boşalırsa klasörü de sil)
- Bilgisayarında dene: `pnpm install` sonra `pnpm build` -> "out" klasörü oluşmalı.
- GitHub'a gönder (commit + push).

## 2) Supabase Edge Function
    supabase login
    supabase link --project-ref <proje-ref>
    supabase secrets set PLAY_PACKAGE_NAME=<paket-adi>
    supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='<json-in-tamami>'
    supabase functions deploy premium-verify --no-verify-jwt
(Supabase CLI yoksa Dashboard > Edge Functions > Deploy a new function üzerinden de yüklenebilir.)

## 3) Cloudflare (Workers & Pages > yuklegel-bot > Settings > Build)
- Git deposu: yuklegel-bot (main)
- Build command: pnpm build
- Deploy command: npx wrangler deploy
- Build variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PLAY_PACKAGE, NEXT_PUBLIC_ADSENSE_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT
- Gizli anahtarları (service role, Google JSON) Cloudflare'e GİRME.

## 4) Doğrulama
- https://nakliyecepte.online ve /login, /privacy, /delete-account açılıyor mu
- https://nakliyecepte.online/.well-known/assetlinks.json JSON döndürüyor mu
- Giriş + premium kontrolü çalışıyor mu (tarayıcı konsolunda CORS hatası olmamalı)

---

# Bildirimler (Web Push) kurulumu

## A) Anahtar üret (bir kez)
Bilgisayarda: `npx web-push generate-vapid-keys`  -> "Public Key" ve "Private Key" çıkar.

## B) Supabase SQL
1. `supabase/002_bildirimler.sql` (daha önce çalıştırdıysanız atlayın)
2. `supabase/003_bildirim_gonder.sql` -> içindeki **PROJE_REF** ve **GIZLI_ANAHTAR** yerlerini değiştirip çalıştırın.

## C) Edge Function
    supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:siz@ornek.com NOTIFY_WEBHOOK_SECRET=<003 SQL'deki GIZLI_ANAHTAR ile AYNI>
    supabase functions deploy notify-listing --no-verify-jwt

## D) Cloudflare
Build variables'a ekle: `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public>` (private anahtarı ASLA girme). Sonra yeniden yayınla.

## E) Deneme
1. Uygulama > Şirket Profili > "İlan Bildirimleri" > Aç (izin ver) > bir güzergâh ekle.
2. Başka bir hesaptan (ya da Supabase Table Editor'den) o güzergâha uygun ilan ekle.
3. Gelmezse: Supabase > Edge Functions > notify-listing > Logs bölümüne bakın.

Notlar: Aynı güzergâh için en fazla 10 dakikada bir bildirim gider. Kendi ilanınız için bildirim almazsınız.
Ücretsiz 1, Premium 5 güzergâh (sunucuda zorlanır). iPhone'da bildirim için uygulamanın ana ekrana eklenmiş olması gerekir.
