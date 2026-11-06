-- Nakliye Cepte - Gelir/Gider (finances) güvenlik düzeltmesi
-- Supabase > SQL Editor içinde ÇALIŞTIRIN. Birden fazla kez çalıştırmak güvenlidir.
--
-- Sorun: finances tablosunda kullanıcı ayrımı yoksa, uygulamadaki herkes herkesin
-- gelir-gider kayıtlarını görebilir/değiştirebilir (anon anahtar tarayıcıda herkese açıktır).

------------------------------------------------------------------
-- 1) user_id sütunu (yeni kayıtlarda otomatik oturumdaki kullanıcı)
------------------------------------------------------------------
alter table public.finances add column if not exists user_id uuid default auth.uid();

------------------------------------------------------------------
-- 2) MEVCUT KAYITLARI KENDİ HESABINIZA BAĞLAYIN (önemli!)
--    E-posta adresinizi yazın. Aksi halde eski kayıtlar user_id'si boş olduğu için
--    görünmez olur. Tek kullanıcılı bir veri ise bu satır yeterlidir.
------------------------------------------------------------------
-- update public.finances
--    set user_id = (select id from auth.users where email = 'EPOSTA_ADRESINIZ@gmail.com')
--  where user_id is null;

------------------------------------------------------------------
-- 3) RLS: herkes sadece kendi kayıtlarını görür ve değiştirir
------------------------------------------------------------------
alter table public.finances enable row level security;

drop policy if exists "finances_own" on public.finances;
create policy "finances_own"
  on public.finances for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists finances_user_id_idx on public.finances (user_id);

------------------------------------------------------------------
-- 4) Seferlerim > "Yenile" ve "Tamamlandı" için ilan sahibi güncelleme/silme izni
--    (listings tablosunda RLS zaten açıksa ve bu politikalar varsa atlayın)
------------------------------------------------------------------
-- create policy "listings_update_own" on public.listings for update to authenticated using (auth.uid() = user_id);
-- create policy "listings_delete_own" on public.listings for delete to authenticated using (auth.uid() = user_id);
