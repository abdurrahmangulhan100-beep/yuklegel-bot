-- Nakliye Cepte - Bildirim gönderimi (ADIM 3)
-- Supabase > SQL Editor içinde çalıştırın. Birden fazla kez çalıştırmak güvenlidir.
-- ÇALIŞTIRMADAN ÖNCE aşağıdaki 2 yeri değiştirin:
--   PROJE_REF       -> Supabase proje referansı (https://XXXX.supabase.co içindeki XXXX)
--   GIZLI_ANAHTAR   -> kendi uydurduğunuz uzun rastgele bir metin (aynısını Edge Function secret'ına da gireceksiniz)

create extension if not exists pg_net with schema extensions;

-- Aynı rota için art arda bildirim yağmasın diye son bildirim zamanı
alter table public.notification_routes add column if not exists last_notified_at timestamptz;

-- Rota başına bildirim "rezervasyonu": son 10 dakikada bildirim gittiyse false döner. Yalnızca sunucu (service role) çağırır.
create or replace function public.claim_route_notification(p_route uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update public.notification_routes
     set last_notified_at = now()
   where id = p_route
     and (last_notified_at is null or last_notified_at < now() - interval '10 minutes');
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function public.claim_route_notification(uuid) from public, anon, authenticated;

-- Yeni ilan eklenince Edge Function'ı çağırır. Hata olsa bile ilan kaydı ASLA engellenmez (bot güvende).
create or replace function public.notify_new_listing()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url     := 'https://PROJE_REF.supabase.co/functions/v1/notify-listing',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'GIZLI_ANAHTAR'),
    body    := jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(new)),
    timeout_milliseconds := 3000
  );
  return new;
exception when others then
  return new;
end $$;
revoke execute on function public.notify_new_listing() from public, anon, authenticated;

drop trigger if exists listings_notify on public.listings;
create trigger listings_notify after insert on public.listings
  for each row execute function public.notify_new_listing();

drop trigger if exists bot_listings_notify on public.bot_listings;
create trigger bot_listings_notify after insert on public.bot_listings
  for each row execute function public.notify_new_listing();
