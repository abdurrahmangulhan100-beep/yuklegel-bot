// lib/route.ts ve lib/districts.ts değiştiğinde çalıştırın:  node scripts/sync-shared.mjs
// Supabase Edge Function'lar (bildirimler) Deno kullandığı için aynı dosyaların ".ts" uzantılı kopyasına ihtiyaç duyar.
// Böylece web sitesi ile bildirim sistemi aynı sözlüğü kullanır ve birbirinden sapmaz.
import { readFileSync, writeFileSync } from "node:fs"
const dst = "supabase/functions/_shared/"
writeFileSync(dst + "districts.ts", readFileSync("lib/districts.ts", "utf8"))
writeFileSync(dst + "route.ts", readFileSync("lib/route.ts", "utf8").replace('from "./districts"', 'from "./districts.ts"'))
console.log("supabase/functions/_shared/ güncellendi. Ardından: supabase functions deploy notify-listing --no-verify-jwt")
