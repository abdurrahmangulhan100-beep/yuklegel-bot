"use client"

import { useMemo } from "react"
import { Truck, Package, Zap, ArrowRight, Plus, Calculator, WalletCards, CircleHelp, ChevronRight, MapPin, TrendingUp, Timer } from "lucide-react"
import { Load } from "@/components/LoadCard"
import { cn } from "@/lib/utils"
import { AdSlot } from "@/components/AdSlot"

type OverviewProps = {
  loads: Load[];
  currentUserId: string | null;
  onOpenCreate: () => void;
  setActiveTab: (tab: string) => void;
  totalCount?: number;
  urgentCount?: number;
  userName?: string;
  /** Şehir çipine dokununca o şehrin ilanlarını açar */
  onSelectCity?: (city: string) => void;
  /** Acil yük kartına dokununca "Acil" filtresiyle ilanları açar */
  onOpenUrgent?: () => void;
}

/** Kart başlığı: ilanın ilk satırı (saha ilanında ham mesajın ilk satırı) */
const headline = (l: Load) => {
  const first = (l.cargo || "").split("\n").find((x) => x.trim()) ?? ""
  return first.trim() || "İlan"
}
const subline = (l: Load) => [(l.cities ?? []).slice(0, 3).join(" · "), l.vehicle, l.time].filter(Boolean).join(" • ")

export function OverviewView({ loads, currentUserId, onOpenCreate, setActiveTab, totalCount, urgentCount, userName, onSelectCity, onOpenUrgent }: OverviewProps) {
  // SADECE O ANKİ KULLANICININ İLANLARINI FİLTRELE
  const userLoads = loads.filter(
    (l) => l.source === "user" && l.userId && currentUserId && l.userId === currentUserId
  )
  
  const urgentLoads = loads.filter((l) => l.urgent)
  const latestLoads = loads.slice(0, 4)
  const total = (totalCount ?? loads.length).toLocaleString("tr-TR")
  const urgent = (urgentCount ?? urgentLoads.length).toLocaleString("tr-TR")
  const firstName = userName ? userName.split(" ")[0] : ""

  // Elimizdeki ilanlarda en sık geçen şehirler
  const hot = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of loads) for (const c of l.cities ?? []) counts.set(c, (counts.get(c) ?? 0) + 1)
    return { cities: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8) }
  }, [loads])

  const quickActions = [
    { label: "Takograf Sayacı", icon: Timer, tab: "Araçlar", tone: "bg-amber-50 text-amber-600" },
    { label: "Sefer Hesapla", icon: Calculator, tab: "Sefer Hesapla", tone: "bg-[#eef4f8] text-[#315d83]" },
    { label: "Gelir & Gider", icon: WalletCards, tab: "Gelir Gider", tone: "bg-emerald-50 text-emerald-600" },
    { label: "Seferlerim", icon: Truck, tab: "Seferlerim", tone: "bg-[#fff0ec] text-[#d64526]" },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Karşılama kartı */}
      <section className="animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#163a63] via-[#122c4a] to-[#0b1d33] p-5 text-white shadow-[0_12px_32px_rgba(18,44,74,0.25)] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-[#d64526]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-[#315d83]/40 blur-2xl" />

        <div className="relative">
          <p className="text-sm font-medium text-white/65">{firstName ? `Merhaba, ${firstName}` : "Hoş geldiniz"}</p>
          <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight sm:text-3xl">
            Bugün <span className="text-[#ff8a65]">{total}</span> aktif yük<br className="sm:hidden" /> sizi bekliyor
          </h1>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:max-w-md">
            <button
              onClick={onOpenCreate}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#d64526] text-sm font-semibold text-white shadow-lg shadow-black/20 transition-all hover:bg-[#e5522f] active:scale-[0.98] sm:flex-1"
            >
              <Plus className="size-[18px]" /> İlan Ver
            </button>
            <button
              onClick={() => setActiveTab("İlanlar")}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/20 transition-all hover:bg-white/15 active:scale-[0.98] sm:flex-1"
            >
              <Package className="size-[18px]" /> İlanları Gör
            </button>
          </div>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <StatCard icon={Package} label="Aktif İlan" value={total} tone="text-[#315d83] bg-[#eef4f8]" />
        <StatCard icon={Truck} label="Seferlerim" value={String(userLoads.length)} tone="text-[#d64526] bg-[#fff0ec]" />
        <StatCard icon={Zap} label="Acil Yük" value={urgent} tone="text-amber-600 bg-amber-50" />
      </section>

      {/* Yoğun bölgeler */}
      {hot.cities.length > 0 && (
        <section className="rounded-3xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-6">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-[#122c4a]">
            <TrendingUp className="size-4 text-[#315d83]" /> İlanı Çok Olan Şehirler
          </h2>
          <div className="flex flex-wrap gap-2">
            {hot.cities.map(([city, n]) => (
              <button
                key={city}
                onClick={() => onSelectCity?.(city)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e0e6ed] bg-[#f8fafc] pl-3 pr-1.5 text-[13px] font-semibold text-[#122c4a] transition-colors hover:border-[#c4d0dc] active:scale-95"
              >
                <MapPin className="size-3.5 text-[#315d83]" />
                {city}
                <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#122c4a] px-1.5 text-[11px] font-bold tabular-nums text-white">{n}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Hızlı erişim */}
      <section>
        <h2 className="mb-3 px-1 text-base font-bold text-[#122c4a]">Hızlı Erişim</h2>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => setActiveTab(a.tab)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[#e4e9ef] bg-white px-1 py-3.5 shadow-[0_1px_2px_rgba(18,44,74,0.04)] transition-all hover:shadow-md active:scale-95"
            >
              <span className={cn("grid size-11 place-items-center rounded-2xl", a.tone)}>
                <a.icon className="size-[22px]" />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight text-[#334e68]">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Acil yükler (yatay kaydırma) */}
      {urgentLoads.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-[#122c4a]">
              <Zap className="size-4 fill-[#d64526] text-[#d64526]" /> Acil Yükler
            </h2>
            <button onClick={() => (onOpenUrgent ? onOpenUrgent() : setActiveTab("İlanlar"))} className="flex items-center gap-1 text-xs font-semibold text-[#315d83]">
              Tümü <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="-mx-4 sm:mx-0">
            <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:px-0">
              {urgentLoads.slice(0, 8).map((l) => (
                <button
                  key={l.id}
                  onClick={() => (onOpenUrgent ? onOpenUrgent() : setActiveTab("İlanlar"))}
                  className="w-[260px] shrink-0 snap-start rounded-2xl border border-[#f6d6cc] bg-gradient-to-br from-[#fff7f4] to-white p-4 text-left shadow-[0_1px_2px_rgba(214,69,38,0.08)] transition-transform active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#d64526] px-2 py-0.5 text-[10px] font-bold text-white">ACİL</span>
                    <span className="text-[11px] font-medium text-[#8da0b2]">{l.time}</span>
                  </div>
                  <div className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug text-[#122c4a]">
                    {headline(l)}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#627d98]">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{(l.cities ?? []).slice(0, 3).join(" · ") || l.vehicle || "Detay için ilana dokunun"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Son seferlerim */}
      <section className="rounded-3xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#122c4a]">Son Seferlerim</h2>
          <button onClick={() => setActiveTab("Seferlerim")} className="flex items-center gap-1 text-xs font-semibold text-[#315d83]">
            Tümünü Gör <ArrowRight className="size-3.5" />
          </button>
        </div>
        {userLoads.length > 0 ? (
          <ul className="divide-y divide-[#edf0f3]">
            {userLoads.slice(0, 3).map((load) => (
              <li key={load.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#122c4a]">{headline(load)}</div>
                  <div className="mt-0.5 truncate text-xs text-[#718397]">{subline(load)}</div>
                </div>
                {load.price && load.price !== "₺0" && (
                  <div className="shrink-0 text-sm font-extrabold text-[#d64526]">{load.price}</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
              <Truck className="size-7" />
            </div>
            <p className="text-sm text-[#718397]">Henüz size ait bir sefer bulunmuyor.</p>
            <button
              onClick={onOpenCreate}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#d64526] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#b93820]"
            >
              <Plus className="size-4" /> İlk ilanını oluştur
            </button>
          </div>
        )}
      </section>

      {/* Güncel ilanlar */}
      {latestLoads.length > 0 && (
        <section className="rounded-3xl border border-[#e4e9ef] bg-white p-4 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#122c4a]">Güncel İlanlar</h2>
            <button onClick={() => setActiveTab("İlanlar")} className="flex items-center gap-1 text-xs font-semibold text-[#315d83]">
              Tümü <ArrowRight className="size-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-[#edf0f3]">
            {latestLoads.map((l) => (
              <li key={l.id}>
                <button onClick={() => setActiveTab("İlanlar")} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white",
                    l.source === "user" ? "bg-[#d64526]" : "bg-[#315d83]"
                  )}>
                    {l.source === "user" ? (l.initials || "NK") : "SL"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#122c4a]">
                      {headline(l)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#718397]">{subline(l)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#b4c1ce]" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AdSlot />

      <button
        onClick={() => setActiveTab("Yardım Merkezi")}
        className="flex w-full items-center gap-3 rounded-2xl border border-[#e4e9ef] bg-white p-4 text-left shadow-[0_1px_2px_rgba(18,44,74,0.04)] transition-colors hover:bg-[#fafbfd]"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-[#eef4f8] text-[#315d83]"><CircleHelp className="size-5" /></span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-[#122c4a]">Yardıma mı ihtiyacınız var?</span>
          <span className="block text-xs text-[#718397]">Sık sorulan sorular ve destek</span>
        </span>
        <ChevronRight className="size-4 text-[#b4c1ce]" />
      </button>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e9ef] bg-white p-3.5 shadow-[0_1px_2px_rgba(18,44,74,0.04)] sm:p-5">
      <span className={cn("mb-2.5 grid size-9 place-items-center rounded-xl", tone)}>
        <Icon className="size-[18px]" />
      </span>
      <div className="text-2xl font-extrabold leading-none tracking-tight text-[#122c4a] tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold text-[#718397] sm:text-sm">{label}</div>
    </div>
  )
}
