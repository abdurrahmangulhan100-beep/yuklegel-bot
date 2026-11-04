"use client"

import Link from "next/link"
import { Calculator, CircleHelp, Crown, FileText, LayoutDashboard, LogIn, LogOut, Package, ShieldCheck, Star, Truck, User, WalletCards, Wrench } from "lucide-react"
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

type Tile = { tab: string; label: string; hint: string; icon: React.ComponentType<{ className?: string }>; tone: string; badge?: string }

/** Yan menünün yerini alan uygulama menüsü: mobilde alttan açılır, masaüstünde ortada pencere olur. */
export function AppLauncher({ open, onClose, activeTab, setActiveTab, loadsCount, favoritesCount = 0, isGuest = false, isPremium = false, profile, onLogout }: Props) {
  const go = (tab: string) => { setActiveTab(tab); onClose() }
  const isHome = activeTab === "Genel Bakış" || activeTab === "overview"

  const tiles: Tile[] = [
    { tab: "Genel Bakış", label: "Ana Sayfa", hint: "Özet ve kısayollar", icon: LayoutDashboard, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300" },
    { tab: "İlanlar", label: "İlanlar", hint: "Güncel yükler", icon: Package, tone: "bg-brand/15 text-brand", badge: loadsCount > 0 ? loadsCount.toLocaleString("tr-TR") : undefined },
    { tab: "Favorilerim", label: "Favoriler", hint: "Kaydettiklerim", icon: Star, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300", badge: favoritesCount > 0 ? String(favoritesCount) : undefined },
    { tab: "Seferlerim", label: "Seferlerim", hint: "İlanlarım", icon: Truck, tone: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" },
    { tab: "Gelir Gider", label: "Gelir & Gider", hint: "Kazanç takibi", icon: WalletCards, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
    { tab: "Sefer Hesapla", label: "Sefer Hesapla", hint: "Maliyet ve kâr", icon: Calculator, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
    { tab: "Araçlar", label: "Şoför Araçları", hint: "Takograf, yakıt…", icon: Wrench, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-300", badge: "YENİ" },
    { tab: "Premium", label: "Premium", hint: isPremium ? "Aktif" : "Tüm özellikler", icon: Crown, tone: "bg-orange-500/15 text-orange-600 dark:text-orange-300", badge: isPremium ? "AKTİF" : "PRO" },
    { tab: "Şirket Profili", label: "Profilim", hint: "Hesap ayarları", icon: User, tone: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
    { tab: "Yardım Merkezi", label: "Yardım", hint: "Sık sorulanlar", icon: CircleHelp, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
  ]

  return (
    <Sheet open={open} onClose={onClose} title="Menü" subtitle={profile && !isGuest ? `${profile.authorized_person} · ${profile.company_name}` : "Tüm bölümler"} className="sm:max-w-2xl">
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {tiles.map((t) => {
          const active = t.tab === "Genel Bakış" ? isHome : activeTab === t.tab
          const Icon = t.icon
          return (
            <button
              key={t.tab}
              type="button"
              onClick={() => go(t.tab)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-2xl border p-3 pb-3.5 text-center transition-all active:scale-[0.97] sm:p-4",
                active ? "border-brand/40 bg-brand/5 shadow-card" : "border-border bg-card hover:border-brand/30 hover:shadow-card"
              )}
            >
              {t.badge && (
                <span className={cn("absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none", t.badge === "AKTİF" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : t.badge === "PRO" || t.badge === "YENİ" ? "bg-brand-gradient text-white" : "bg-muted text-foreground/80")}>
                  {t.badge}
                </span>
              )}
              <span className={cn("grid size-12 place-items-center rounded-2xl sm:size-14", t.tone)}>
                <Icon className="size-6 sm:size-7" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-foreground sm:text-sm">{t.label}</span>
              <span className="hidden text-[11px] leading-tight text-muted-foreground sm:block">{t.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-muted-foreground">
        <Link href="/privacy" onClick={onClose} className="inline-flex items-center gap-1 hover:text-foreground"><ShieldCheck className="size-3.5" /> Gizlilik</Link>
        <Link href="/kullanim-kosullari" onClick={onClose} className="inline-flex items-center gap-1 hover:text-foreground"><FileText className="size-3.5" /> Kullanım Koşulları</Link>
        {!isGuest && <button type="button" onClick={() => go("Şirket Profili")} className="hover:text-foreground">Hesabımı Sil</button>}
      </div>

      <button
        type="button"
        onClick={() => { onClose(); onLogout() }}
        className={cn(
          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
          isGuest ? "bg-brand-gradient text-white shadow-md shadow-[#d64526]/25" : "bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300"
        )}
      >
        {isGuest ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
        {isGuest ? "Giriş Yap" : "Çıkış Yap"}
      </button>
    </Sheet>
  )
}
