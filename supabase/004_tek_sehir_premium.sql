-- Nakliye Cepte - Bildirimler: tek şehir + sadece Premium  |  Ücretsiz plan: ilanlar 10 dk gecikmeli
-- Supabase > SQL Editor içinde çalıştırın. Birden fazla kez çalıştırmak güvenlidir.
-- Önkoşul: 002 ve 003 daha önce çalıştırılmış olmalı.

------------------------------------------------------------------
-- 1) Bildirim şehri: yalnızca Premium ekleyebilir, kullanıcı başına 1 kayıt
------------------------------------------------------------------
create or replace function public.enforce_route_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_premium(new.user_id) then
    raise exception 'premium_required';
  end if;
  if exists (select 1 from public.notification_routes where user_id = new.user_id) then
    raise exception 'route_limit';
  end if;
  return new;
end $$;

-- Yön seçimi: from = şehirden çıkan yükler (varsayılan), to = şehre giden yükler, both = ikisi de
alter table public.notification_routes add column if not exists direction text not null default 'from';
alter table public.notification_routes drop constraint if exists notification_routes_direction_check;
alter table public.notification_routes add constraint notification_routes_direction_check check (direction in ('from', 'to', 'both'));

-- Eski çoklu güzergâh kayıtları varsa her kullanıcı için en eskisi kalsın, fazlası silinsin
delete from public.notification_routes r
 using public.notification_routes k
 where r.user_id = k.user_id
   and (k.created_at, k.id) < (r.created_at, r.id);

-- Art arda bildirim yağmasın: bir rota için en fazla 1 dakikada bir bildirim gider.
-- Aradaki ilanlar kaybolmaz: sayaçta birikir ve bir sonraki bildirimde "N yeni ilan" olarak bildirilir.
alter table public.notification_routes add column if not exists pending_count integer not null default 0;

drop function if exists public.claim_route_notification(uuid);
create function public.claim_route_notification(p_route uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare total int;
begin
  -- Satırı kilitle, eski bekleyen sayısını al; süre dolduysa sıfırla ve (bekleyen + bu ilan) toplamını döndür
  with old as (
    select id, pending_count from public.notification_routes where id = p_route for update
  )
  update public.notification_routes r
     set last_notified_at = now(), pending_count = 0
    from old
   where r.id = old.id
     and (r.last_notified_at is null or r.last_notified_at < now() - interval '1 minute')
  returning old.pending_count + 1 into total;

  if total is null then
    -- Süre dolmadı: bu ilan bekleyenlere eklenir, şimdi bildirim gitmez
    update public.notification_routes set pending_count = pending_count + 1 where id = p_route;
    return 0;
  end if;
  return total;
end $$;
revoke execute on function public.claim_route_notification(uuid) from public, anon, authenticated;

------------------------------------------------------------------
-- 2) Ücretsiz plan: 10 dakikadan yeni ilanlar SUNUCUDA da gizlensin (isteğe bağlı sertleştirme)
--    Uygulama zaten filtreliyor; bu bölüm, anon anahtarla doğrudan veritabanına sorgu atanları da engeller.
--    Güvenlik için: yalnızca tablonun RLS'i ZATEN AÇIKSA politika eklenir. RLS kapalıysa dokunulmaz
--    (RLS'i kapalıyken açmak, bot ve ilan ekleme akışlarını bozabilir) ve aşağıdaki NOTICE mesajı görünür.
------------------------------------------------------------------
create or replace function public.can_see_fresh()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null and public.is_premium(auth.uid());
$$;
revoke execute on function public.can_see_fresh() from public;
grant  execute on function public.can_see_fresh() to anon, authenticated;

-- Ücretsiz kullanıcıya "son 10 dakikada X yeni ilan geldi" demek için SADECE sayı döner (ilan içeriği değil).
-- Sunucu tarafı gecikme politikası açık olsa bile çalışır.
create or replace function public.recent_listing_count(p_since timestamptz)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select (select count(*) from public.listings   where created_at > p_since and (auth.uid() is null or user_id is distinct from auth.uid()))::int
       + (select count(*) from public.bot_listings where created_at > p_since)::int;
$$;
revoke execute on function public.recent_listing_count(timestamptz) from public;
grant  execute on function public.recent_listing_count(timestamptz) to anon, authenticated;

do $$
declare rls boolean;
begin
  select relrowsecurity into rls from pg_class where oid = 'public.listings'::regclass;
  if rls then
    execute 'drop policy if exists "free_delay_10min" on public.listings';
    execute $p$create policy "free_delay_10min" on public.listings
      as restrictive for select to anon, authenticated
      using (created_at <= now() - interval '10 minutes' or user_id = auth.uid() or public.can_see_fresh())$p$;
  else
    raise notice 'listings: RLS kapali, gecikme politikasi eklenmedi (uygulama tarafi filtre calisir).';
  end if;

  select relrowsecurity into rls from pg_class where oid = 'public.bot_listings'::regclass;
  if rls then
    execute 'drop policy if exists "free_delay_10min" on public.bot_listings';
    execute $p$create policy "free_delay_10min" on public.bot_listings
      as restrictive for select to anon, authenticated
      using (created_at <= now() - interval '10 minutes' or public.can_see_fresh())$p$;
  else
    raise notice 'bot_listings: RLS kapali, gecikme politikasi eklenmedi (uygulama tarafi filtre calisir).';
  end if;
end $$;
