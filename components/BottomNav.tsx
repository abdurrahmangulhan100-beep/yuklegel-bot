"use client"

import { LayoutDashboard, FileText, Plus, Star, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

type BottomNavProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  onOpenCreate: () => void
  onOpenMenu: () => void
  favoritesCount?: number
}

/** Yalnızca mobilde (lg altı) görünen alt sekme çubuğu */
export function BottomNav({ activeTab, setActiveTab, onOpenCreate, onOpenMenu, favoritesCount = 0 }: BottomNavProps) {
  const isHome = activeTab === "Genel Bakış" || activeTab === "overview"
  const isListings = activeTab === "İlanlar"
  const isFav = activeTab === "Favorilerim"
  const isMore = !isHome && !isListings && !isFav

  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4e9ef] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(18,44,74,0.06)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5 items-stretch px-1">
        <Tab icon={LayoutDashboard} label="Ana Sayfa" active={isHome} onClick={() => setActiveTab("Genel Bakış")} />
        <Tab icon={FileText} label="İlanlar" active={isListings} onClick={() => setActiveTab("İlanlar")} />

        <div className="relative flex flex-col items-center justify-end pb-1.5">
          <button
            type="button"
            onClick={onOpenCreate}
            aria-label="Yeni ilan oluştur"
            className="absolute -top-5 grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#e5522f] to-[#c13a1c] text-white shadow-[0_8px_20px_rgba(214,69,38,0.45)] ring-4 ring-white transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] font-semibold text-[#627d98]">İlan Ver</span>
        </div>

        <Tab icon={Star} label="Favoriler" active={isFav} badge={favoritesCount} onClick={() => setActiveTab("Favorilerim")} />
        <Tab icon={Menu} label="Menü" active={isMore} onClick={onOpenMenu} />
      </div>
    </nav>
  )
}

function Tab({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center justify-center gap-1 transition-colors active:scale-95"
    >
      <span
        className={cn(
          "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
          active ? "bg-[#122c4a]/10 text-[#122c4a]" : "text-[#8da0b2]"
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
        {badge ? (
          <span className="absolute -right-0.5 -top-1 grid min-w-4 place-items-center rounded-full bg-[#d64526] px-1 text-[9px] font-bold leading-4 text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className={cn("text-[10px] font-semibold", active ? "text-[#122c4a]" : "text-[#8da0b2]")}>{label}</span>
    </button>
  )
}
