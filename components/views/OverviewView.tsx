"use client"

import { useMemo } from "react"
import { Truck, Zap, ArrowRight, Calculator, WalletCards, MapPin, TrendingUp, Timer, Search, Crown } from "lucide-react"
import { VehicleIcon, type VehicleKind } from "@/components/VehicleIcon"
import { Load } from "@/components/LoadCard"
import { cn } from "@/lib/utils"
import { AdSlot } from "@/components/AdSlot"
import { hidePhones } from "@/lib/listings"
import { usePremium } from "@/components/PremiumProvider"

type OverviewProps = {
  loads: Load[];
  currentUserId: string | null;
  onOpenCreate: () => void;
  setActiveTab: (tab: string) => void;
  totalCount?: number;
  /** Son 24 saatte eklenen gerçek ilan sayısı */
  last24h?: number;
  urgentCount?: number;
  userName?: string;
  /** Şehir çipine dokununca o şehrin ilanlarını açar */
  onSelectCity?: (city: string) => void;
  /** Acil yük kartına dokununca "Acil" filtresiyle ilanları açar */
  onOpenUrgent?: () => void;
  /** Araç kategorisine dokununca o filtreyle ilanları açar */
  onPickFilter?: (filter: string) => void;
  favoritesCount?: number;
}

const POPULAR: [string, VehicleKind][] = [["Tümü", "tumu"], ["Acil", "acil"], ["Kapalı Dorse", "tir"], ["Kamyon", "kamyon"], ["Frigo", "frigo"], ["Kırkayak", "kirkayak"], ["13.60 Açık Dorse", "acikdorse"], ["Damperli", "damperli"]]

/** Kart başlığı: ilanın ilk satırı (saha ilanında ham mesajın ilk satırı) */
const headline = (l: Load) => {
  const first = (l.source === "bot" ? hidePhones(l.cargo || "") : l.cargo || "").split("\n").find((x) => x.trim()) ?? ""
  return first.trim() || "İlan"
}
const subline = (l: Load) => [(l.cities ?? []).slice(0, 3).join(" · "), l.vehicle, l.time].filter(Boolean).join(" • ")

export function OverviewView({ loads, currentUserId, setActiveTab, totalCount, last24h, userName, onSelectCity, onOpenUrgent, onPickFilter }: OverviewProps) {
  const { isPremium } = usePremium()
  // SADECE O ANKİ KULLANICININ İLANLARINI FİLTRELE
  const userLoads = loads.filter(
    (l) => l.source === "user" && l.userId && currentUserId && l.userId === currentUserId
  )
  
  const urgentLoads = loads.filter((l) => l.urgent)
  const total = (totalCount ?? loads.length).toLocaleString("tr-TR")
  const firstName = userName ? userName.split(" ")[0] : ""

  // Elimizdeki ilanlarda en sık geçen şehirler
  const hot = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of loads) for (const c of l.cities ?? []) counts.set(c, (counts.get(c) ?? 0) + 1)
    return { cities: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8) }
  }, [loads])

  const quickActions = [
    { label: "Sefer Hesapla", icon: Calculator, tab: "Sefer Hesapla", tone: "bg-muted text-foreground/80" },
    { label: "Gelir & Gider", icon: WalletCards, tab: "Gelir Gider", tone: "bg-emerald-50 text-emerald-600" },
    { label: "Takograf Sayacı", icon: Timer, tab: "Araçlar", tone: "bg-amber-50 text-amber-600" },
  ]

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      {/* Karşılama + arama */}
      <section className="animate-rise relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#183e68] via-[#122c4a] to-[#0b1d33] p-[18px] text-white shadow-[0_12px_30px_rgba(18,44,74,0.22)] sm:rounded-[28px] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 size-48 rounded-full bg-brand/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-[#315d83]/40 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/65">{firstName ? `Merhaba, ${firstName}` : "Hoş geldiniz"}</p>
          <h1 className="mt-1 text-[23px] font-extrabold leading-[1.13] tracking-tight sm:text-3xl">
            <span className="text-[#ff8a65]">{total}</span> aktif yük<br className="sm:hidden" /> sizi bekliyor
          </h1>
          <p className="mt-1 text-xs text-white/55">
            {typeof last24h === "number" && last24h > 0 ? (
              <><span className="font-bold text-white/85">{last24h.toLocaleString("tr-TR")}</span> ilan son 24 saatte girildi · yolun açık olsun.</>
            ) : "Yükünü taşı, yolun açık olsun."}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("İlanlar")}
            className="mt-4 flex h-[54px] w-full items-center gap-3 rounded-[18px] bg-card px-3.5 text-left shadow-lg shadow-black/20 transition-transform active:scale-[0.99] sm:max-w-lg sm:px-4"
          >
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">Nereden nereye yük arıyorsunuz?</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white"><ArrowRight className="size-4" /></span>
          </button>
        </div>
      </section>

      {/* Araçlar: tek sıra (İlanlar/Favoriler/Seferlerim alt menüde zaten var) */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => setActiveTab(a.tab)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1 py-3.5 shadow-card transition-all hover:shadow-md active:scale-95"
          >
            <span className={cn("grid size-11 place-items-center rounded-2xl", a.tone)}>
              <a.icon className="size-[22px]" />
            </span>
            <span className="text-center text-[11px] font-semibold leading-tight text-foreground/80">{a.label}</span>
          </button>
        ))}
      </section>

      {/* Premium bandı */}
      {!isPremium && (
        <button
          type="button"
          onClick={() => setActiveTab("Premium")}
          className="group flex w-full items-center gap-3 rounded-2xl bg-navy-gradient p-4 text-left text-white shadow-card transition-transform active:scale-[0.99]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gradient shadow-md shadow-[#d64526]/30"><Crown className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Premium ile daha fazlasını açın</span>
            <span className="block text-xs text-white/65">Anlık ilanlar, sınırsız ilan ve gelişmiş araçlar</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* Popüler araçlar */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-foreground">Popüler Araçlar</h2>
          <button onClick={() => setActiveTab("İlanlar")} className="flex items-center gap-1 text-xs font-semibold text-brand">Tümünü Gör <ArrowRight className="size-3.5" /></button>
        </div>
        <div className="-mx-4 sm:mx-0">
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
            {POPULAR.map(([name, kind]) => (
              <button
                key={name}
                onClick={() => (onPickFilter ? onPickFilter(name) : setActiveTab("İlanlar"))}
                className="flex h-[92px] w-[104px] shrink-0 flex-col items-center justify-between gap-1 rounded-2xl border border-border bg-card px-1.5 pb-2 pt-2 text-[11px] font-bold leading-tight text-foreground/80 shadow-card transition-all active:scale-95"
              >
                <span className="flex h-11 w-full items-center justify-center rounded-xl dark:px-1"><VehicleIcon kind={kind} className="h-[84%] w-full" /></span>
                <span className="line-clamp-1 w-full text-center">{name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Acil yükler (yatay kaydırma) */}
      {urgentLoads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-foreground">
              <Zap className="size-4 fill-[#d64526] text-brand" /> Acil Yükler
            </h2>
            <button onClick={() => (onOpenUrgent ? onOpenUrgent() : setActiveTab("İlanlar"))} className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
              Tümü <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="-mx-4 sm:mx-0">
            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:px-0">
              {urgentLoads.slice(0, 8).map((l) => (
                <button
                  key={l.id}
                  onClick={() => (onOpenUrgent ? onOpenUrgent() : setActiveTab("İlanlar"))}
                  className="w-[260px] shrink-0 snap-start rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 to-card p-4 text-left shadow-[0_1px_2px_rgba(214,69,38,0.08)] transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">ACİL</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{l.time}</span>
                  </div>
                  <div className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-foreground">
                    {headline(l)}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{(l.cities ?? []).slice(0, 3).join(" · ") || l.vehicle || "Detay için ilana dokunun"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Yoğun bölgeler */}
      {hot.cities.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-foreground">
            <TrendingUp className="size-4 text-foreground/80" /> İlanı Çok Olan Şehirler
          </h2>
          <div className="flex flex-wrap gap-2">
            {hot.cities.map(([city, n]) => (
              <button
                key={city}
                onClick={() => onSelectCity?.(city)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-muted/50 pl-3 pr-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-input active:scale-95"
              >
                <MapPin className="size-3.5 text-foreground/80" />
                {city}
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">{n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Son seferlerim: yalnızca ilanı olan kullanıcıya */}
      {userLoads.length > 0 && (
        <section className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Son Seferlerim</h2>
            <button onClick={() => setActiveTab("Seferlerim")} className="flex items-center gap-1 text-xs font-semibold text-foreground/80">
              Tümünü Gör <ArrowRight className="size-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {userLoads.slice(0, 3).map((load) => (
              <li key={load.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">{headline(load)}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{subline(load)}</div>
                </div>
                {load.price && load.price !== "₺0" && (
                  <div className="shrink-0 text-sm font-extrabold text-brand">{load.price}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot promoOnly />
    </div>
  )
}
