-- Nakliye Cepte - Play Store uyumluluk kurulumu
-- Supabase > SQL Editor içinde ÇALIŞTIRIN. Birden fazla kez çalıştırmak güvenlidir.

------------------------------------------------------------------
-- 1) ŞİKAYET TABLOSU
------------------------------------------------------------------
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  listing_id  text not null,
  reason      text not null,
  target_phone text,
  created_at  timestamptz not null default now()
);

alter table public.reports add column if not exists reporter_id uuid default auth.uid();
alter table public.reports alter column created_at set default now();

alter table public.reports enable row level security;

drop policy if exists "reports_insert_anyone" on public.reports;
create policy "reports_insert_anyone"
  on public.reports for insert
  to anon, authenticated
  with check (true);
-- SELECT politikası bilinçli olarak yok: şikayetleri sadece siz (dashboard) görürsünüz.

------------------------------------------------------------------
-- 2) GERÇEK HESAP SİLME (auth kaydı dahil)
------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  t   record;
begin
  if uid is null then
    raise exception 'Oturum bulunamadı';
  end if;

  -- user_id sütunu olan tüm tablolardan kullanıcının satırlarını sil
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and tb.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where user_id::text = $1', t.table_name)
    using uid::text;
  end loop;

  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;   -- giriş hesabı kalıcı olarak silinir
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

------------------------------------------------------------------
-- 3) RLS DURUM KONTROLÜ (sadece okur - sonucu kontrol edin)
------------------------------------------------------------------
-- rls_enabled = false olan tablo varsa herkes o tabloyu okuyabilir/değiştirebilir!
select c.relname as tablo, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

------------------------------------------------------------------
-- 4) ŞABLON POLİTİKALAR (tabloda user_id sütunu varsa, ihtiyacınıza göre açın)
------------------------------------------------------------------
-- alter table public.finances enable row level security;
-- create policy "finances_own" on public.finances for all to authenticated
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
--
-- alter table public.favorites enable row level security;
-- create policy "favorites_own" on public.favorites for all to authenticated
--   using (auth.uid() = user_id) with check (auth.uid() = user_id);
--
-- alter table public.listings enable row level security;
-- create policy "listings_read_all" on public.listings for select to anon, authenticated using (true);
-- create policy "listings_insert_own" on public.listings for insert to authenticated with check (auth.uid() = user_id);
-- create policy "listings_update_own" on public.listings for update to authenticated using (auth.uid() = user_id);
-- create policy "listings_delete_own" on public.listings for delete to authenticated using (auth.uid() = user_id);
--
-- alter table public.profiles enable row level security;
-- create policy "profiles_own" on public.profiles for all to authenticated
--   using (auth.uid() = id) with check (auth.uid() = id);
