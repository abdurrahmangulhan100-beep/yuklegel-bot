-- Nakliye Cepte - Bildirim altyapısı (ADIM 1)
-- Supabase > SQL Editor içinde çalıştırın. Birden fazla kez çalıştırmak güvenlidir.

------------------------------------------------------------------
-- 1) Premium mi? (yalnızca sunucu içi kullanım; istemci çağıramaz)
------------------------------------------------------------------
create or replace function public.is_premium(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'grace', 'canceled')
      and (s.expires_at is null or s.expires_at > now())
  );
$$;
revoke execute on function public.is_premium(uuid) from public, anon, authenticated;

------------------------------------------------------------------
-- 2) Cihaz abonelikleri (Web Push)
------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Kullanıcı yalnızca kendi cihazlarını görebilir / silebilir. Ekleme SADECE aşağıdaki RPC ile.
drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own" on public.push_subscriptions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own" on public.push_subscriptions for delete to authenticated using (auth.uid() = user_id);

-- Aynı cihaz başka hesapla giriş yaparsa abonelik yeni hesaba taşınır
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, last_seen = now();
end $$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant  execute on function public.save_push_subscription(text, text, text) to authenticated;

------------------------------------------------------------------
-- 3) Bildirim rotaları (hangi ilanlar için haber verilsin)
--    Limit SUNUCUDA zorlanır: ücretsiz 1, premium 5 rota
------------------------------------------------------------------
create table if not exists public.notification_routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_city   text,                 -- boş = herhangi bir şehir
  to_city     text,
  vehicle     text,
  urgent_only boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notification_routes_user_idx on public.notification_routes (user_id);

alter table public.notification_routes enable row level security;
drop policy if exists "routes_own" on public.notification_routes;
create policy "routes_own" on public.notification_routes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.enforce_route_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare n int; lim int;
begin
  select count(*) into n from public.notification_routes where user_id = new.user_id;
  lim := case when public.is_premium(new.user_id) then 5 else 1 end;
  if n >= lim then raise exception 'route_limit'; end if;
  return new;
end $$;

drop trigger if exists notification_routes_limit on public.notification_routes;
create trigger notification_routes_limit
  before insert on public.notification_routes
  for each row execute function public.enforce_route_limit();
