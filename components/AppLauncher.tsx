"use client"

import Link from "next/link"
import {
  Calculator, CircleHelp, Crown, FileText, LogIn, LogOut,
  ShieldCheck, Truck, User, WalletCards, Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet } from "@/components/Sheet"

type Props = {
  open: boolean
  onClose: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
  loadsCount: number
  favoritesCount?: number
  isGuest?: boolean
  isPremium?: boolean
  profile?: { company_name: string; authorized_person: string; initials: string }
  onLogout: () => void
}

type Tile = {
  tab: string
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  section: "Ana bölümler" | "İş ve araçlar" | "Hesap"
  badge?: string
}

/** Mobil öncelikli uygulama menüsü: kolay dokunulan kartlar ve gruplanmış bölümler. */
export function AppLauncher({
  open, onClose, activeTab, setActiveTab, loadsCount, favoritesCount = 0,
  isGuest = false, isPremium = false, profile, onLogout,
}: Props) {
  const go = (tab: string) => {
    setActiveTab(tab)
    onClose()
  }
  const isHome = activeTab === "Genel Bakış" || activeTab === "overview"

  const tiles: Tile[] = [
    { tab: "Seferlerim", label: "Seferlerim", hint: "İlanlarım", icon: Truck, tone: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300", section: "İş ve araçlar" },
    { tab: "Gelir Gider", label: "Gelir & Gider", hint: "Kazanç takibi", icon: WalletCards, tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", section: "İş ve araçlar" },
    { tab: "Sefer Hesapla", label: "Sefer Hesapla", hint: "Mesafe ve maliyet", icon: Calculator, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300", section: "İş ve araçlar" },
    { tab: "Araçlar", label: "Şoför Araçları", hint: "Takograf, yakıt ve daha fazlası", icon: Wrench, tone: "bg-teal-500/12 text-teal-700 dark:text-teal-300", section: "İş ve araçlar", badge: "YENİ" },
    { tab: "Premium", label: "Premium", hint: isPremium ? "Üyeliğiniz aktif" : "Tüm özellikler", icon: Crown, tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300", section: "İş ve araçlar", badge: isPremium ? "AKTİF" : "PRO" },
    { tab: "Şirket Profili", label: "Profilim", hint: "Hesap ve şirket bilgileri", icon: User, tone: "bg-slate-500/12 text-slate-700 dark:text-slate-300", section: "Hesap" },
    { tab: "Yardım Merkezi", label: "Yardım Merkezi", hint: "Destek ve sık sorulanlar", icon: CircleHelp, tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300", section: "Hesap" },
  ]

  const sections: Tile["section"][] = ["İş ve araçlar", "Hesap"]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Menü"
      subtitle={profile && !isGuest ? `${profile.authorized_person} · ${profile.company_name}` : "Tüm bölümler"}
      className="max-h-[88dvh] sm:max-h-[min(86dvh,760px)] sm:max-w-3xl"
    >
      <div className="space-y-5 pb-1">
        {sections.map((section) => {
          const sectionTiles = tiles.filter((tile) => tile.section === section)
          return (
            <section key={section} aria-label={section}>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{section}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {sectionTiles.map((tile) => {
                  const active = tile.tab === "Genel Bakış" ? isHome : activeTab === tile.tab
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.tab}
                      type="button"
                      onClick={() => go(tile.tab)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-[112px] min-w-0 flex-col items-center justify-center gap-2 rounded-[20px] border px-2.5 py-3 text-center transition-all duration-200 active:scale-[0.98] sm:min-h-[124px] sm:rounded-[22px] sm:px-3",
                        active
                          ? "border-brand/45 bg-brand/[0.07] shadow-[0_5px_18px_rgba(25,55,90,0.07)]"
                          : "border-border/80 bg-card hover:border-brand/35 hover:bg-muted/35"
                      )}
                    >
                      {tile.badge && (
                        <span className={cn(
                          "absolute right-2 top-2 max-w-[68px] truncate rounded-full px-1.5 py-1 text-[8px] font-extrabold leading-none tracking-wide",
                          tile.badge === "AKTİF"
                            ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                            : tile.badge === "PRO" || tile.badge === "YENİ"
                              ? "bg-brand-gradient text-white"
                              : "bg-muted text-foreground/75"
                        )}>
                          {tile.badge}
                        </span>
                      )}
                      <span className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-[16px] transition-transform duration-200 group-active:scale-95 sm:size-12 sm:rounded-[17px]",
                        tile.tone
                      )}>
                        <Icon className="size-[22px] sm:size-6" />
                      </span>
                      <span className="w-full truncate text-[12px] font-bold leading-tight text-foreground sm:text-[13px]">{tile.label}</span>
                      <span className="line-clamp-1 w-full text-[10px] leading-tight text-muted-foreground sm:text-[11px]">{tile.hint}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/70 pt-4 text-[10px] font-medium text-muted-foreground sm:gap-x-6 sm:text-[11px]">
        <Link href="/privacy" target="_blank" rel="noopener" className="inline-flex min-h-8 items-center gap-1.5 hover:text-foreground">
          <ShieldCheck className="size-3.5" /> Gizlilik
        </Link>
        <Link href="/kullanim-kosullari" target="_blank" rel="noopener" className="inline-flex min-h-8 items-center gap-1.5 hover:text-foreground">
          <FileText className="size-3.5" /> Kullanım Koşulları
        </Link>
        {!isGuest && (
          <button type="button" onClick={() => go("Şirket Profili")} className="min-h-8 hover:text-foreground">
            Hesabımı Sil
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => { onClose(); onLogout() }}
        className={cn(
          "mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all active:scale-[0.99]",
          isGuest
            ? "bg-brand-gradient text-white shadow-md shadow-[#d64526]/20"
            : "bg-red-500/[0.08] text-red-600 hover:bg-red-500/[0.13] dark:text-red-300"
        )}
      >
        {isGuest ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
        {isGuest ? "Giriş Yap" : "Çıkış Yap"}
      </button>
    </Sheet>
  )
}
