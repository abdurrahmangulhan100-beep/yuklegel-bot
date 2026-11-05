-- İlçe dahil kesin km için önbellek: her güzergâh/yer yalnızca BİR kez hesaplanır (ücretsiz kaynakları yormamak için).
-- Okuma/yazma yalnızca Edge Function (service role). Uygulama tablolara doğrudan erişmez.
create table if not exists public.geo_cache (
  place text primary key,            -- "Konya/Beyşehir"
  lat double precision not null,
  lon double precision not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.route_cache (
  route text primary key,            -- "Konya/Beyşehir>Ankara/Çankaya"
  km integer not null,
  updated_at timestamptz not null default now()
);
alter table public.geo_cache enable row level security;
alter table public.route_cache enable row level security;
