"use client"

import { Home, PackageSearch, Plus, Heart, Grid2X2 } from "lucide-react"
import { cn } from "@/lib/utils"

type BottomNavProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  onOpenCreate: () => void
  onOpenMenu: () => void
  favoritesCount?: number
}

const tap = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8)
}

/** Mobil uygulamanın beş ana durağı; masaüstünde sol menü kullanılır. */
export function BottomNav({ activeTab, setActiveTab, onOpenCreate, onOpenMenu, favoritesCount = 0 }: BottomNavProps) {
  const isHome = activeTab === "Genel Bakış" || activeTab === "overview"
  const isListings = activeTab === "İlanlar"
  const isFav = activeTab === "Favorilerim"
  const isMore = !isHome && !isListings && !isFav

  return (
    <nav
      aria-label="Ana gezinme"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_32px_rgba(15,35,60,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1424]/92 lg:hidden"
    >
      <div className="mx-auto grid h-[68px] max-w-xl grid-cols-5 items-center px-2">
        <Tab icon={Home} label="Ana Sayfa" active={isHome} onClick={() => setActiveTab("Genel Bakış")} />
        <Tab icon={PackageSearch} label="İlanlar" active={isListings} onClick={() => setActiveTab("İlanlar")} />

        <div className="flex h-full flex-col items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => { tap(); onOpenCreate() }}
            aria-label="Yeni ilan oluştur"
            className="-mt-7 grid size-[54px] place-items-center rounded-[19px] bg-gradient-to-br from-[#ed6845] to-[#cf3e24] text-white shadow-[0_9px_22px_rgba(207,62,36,0.34)] ring-[5px] ring-[#f3f6fb] transition-transform active:scale-95 dark:ring-[#080e1a]"
          >
            <Plus className="size-7" strokeWidth={2.6} />
          </button>
          <span className="-mt-0.5 text-[10px] font-bold text-foreground/75">İlan Ver</span>
        </div>

        <Tab icon={Heart} label="Favoriler" active={isFav} badge={favoritesCount} onClick={() => setActiveTab("Favorilerim")} />
        <Tab icon={Grid2X2} label="Diğer" active={isMore} onClick={onOpenMenu} />
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
      onClick={() => { tap(); onClick() }}
      aria-current={active ? "page" : undefined}
      className="flex h-full min-w-0 flex-col items-center justify-center gap-1 transition-transform active:scale-95"
    >
      <span className={cn(
        "relative grid size-9 place-items-center rounded-[14px] transition-all duration-200",
        active ? "bg-[#eaf0f8] text-[#244d78] dark:bg-[#1c304a] dark:text-[#a9c9ed]" : "text-[#8190a3] dark:text-[#91a0b4]"
      )}>
        <Icon className="size-[21px]" strokeWidth={active ? 2.5 : 2} />
        {badge ? (
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-[#df4d2d] px-1 text-[9px] font-extrabold leading-[17px] text-white ring-2 ring-white dark:ring-[#0b1424]">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className={cn("max-w-full truncate text-[10px] font-semibold", active ? "text-[#244d78] dark:text-[#a9c9ed]" : "text-muted-foreground")}>{label}</span>
    </button>
  )
}
