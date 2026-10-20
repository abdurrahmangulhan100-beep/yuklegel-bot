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
