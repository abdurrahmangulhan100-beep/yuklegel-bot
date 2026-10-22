-- Nakliye Cepte - Güvenlik sertleştirme + kontrol (Supabase > SQL Editor). Birden fazla kez çalıştırmak güvenlidir.

------------------------------------------------------------------
-- 1) subscriptions: kullanıcı yalnızca KENDİ satırını OKUYABİLİR, hiçbir şey yazamaz.
--    Yazma yalnızca premium-verify Edge Function'dan (service role) yapılır; service role RLS'i atlar.
--    Aksi halde biri tarayıcıdan kendi kaydını "active" yapıp bedava Premium alabilir.
------------------------------------------------------------------
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

-- Eski, fazla geniş olabilecek yazma politikalarını kaldır (adı farklıysa aşağıdaki RAPOR'dan görüp elle silin)
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_all_own" on public.subscriptions;
revoke insert, update, delete on public.subscriptions from anon, authenticated;

------------------------------------------------------------------
-- 2) RAPOR: hangi tabloda RLS açık, hangi politikalar var? (yalnızca okur, hiçbir şeyi değiştirmez)
--    Çıktıyı bana gönderirsen eksikleri birlikte kapatırız.
------------------------------------------------------------------
select c.relname as tablo,
       c.relrowsecurity as rls_acik,
       coalesce((select string_agg(p.polname || ' [' || p.polcmd || case when p.polpermissive then '' else ' RESTRICTIVE' end || ']', ', ')
                   from pg_policy p where p.polrelid = c.oid), '(politika yok)') as politikalar
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by c.relname;
