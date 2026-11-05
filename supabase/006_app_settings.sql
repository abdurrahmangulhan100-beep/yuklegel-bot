-- Canlı mazot fiyatı için ayar tablosu (zaten varsa dokunmaz). Okuma herkese açık, yazma yalnızca service role (Edge Function).
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (true);
-- Başlangıç değeri (Edge Function güncelleyene kadar); elle değiştirmek için: update app_settings set value='XX.XX', updated_at=now() where key='fuel_diesel';
insert into public.app_settings (key, value) values ('fuel_diesel', '42') on conflict (key) do nothing;
