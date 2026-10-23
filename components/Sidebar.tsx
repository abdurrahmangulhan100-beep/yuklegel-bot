"use client"

import { Calculator, ChevronLeft, Crown, ChevronRight, CircleHelp, FileText, LayoutDashboard, LogIn, LogOut, ShieldCheck, Star, Truck, User, UserX, WalletCards, Wrench, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { signOutClean } from "@/lib/push"
import Link from "next/link"
import { LogoMark } from "@/components/Logo"
import { usePremium } from "@/components/PremiumProvider"

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadsCount: number;
  favoritesCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isGuest?: boolean;
  profile?: { company_name: string; authorized_person: string; initials: string };
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  loadsCount, 
  favoritesCount = 0,
  isCollapsed, 
  setIsCollapsed, 
  isSidebarOpen, 
  setIsSidebarOpen,
  isGuest = false,
  profile
}: SidebarProps) {
  const { isPremium } = usePremium()
  const go = (tab: string) => { 
    setActiveTab(tab); 
    setIsSidebarOpen(false); 
  }

  const handleLogout = async () => {
    await signOutClean()
    localStorage.removeItem("is_guest")
    window.location.replace("/")
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex w-[288px] max-w-[86vw] flex-col bg-[#122c4a] text-white shadow-2xl transition-all duration-300 lg:w-[272px] lg:max-w-none lg:translate-x-0 border-r border-white/10",
      isSidebarOpen ? "translate-x-0" : "-translate-x-full",
      isCollapsed && "lg:w-[78px]"
    )}>
      <div className="flex h-[76px] shrink-0 items-center gap-3.5 px-5 pt-safe">
        <LogoMark size={48} className="-ml-1 shrink-0 drop-shadow-md" />
        {!isCollapsed && (
          <div>
            <div className="text-[19px] font-bold tracking-tight">Nakliye Cepte</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">Nakliye Ağı</div>
          </div>
        )}
        <button aria-label="Menüyü kapat" className="ml-auto grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 lg:hidden transition-colors" onClick={() => setIsSidebarOpen(false)}>
          <X className="size-5" />
        </button>
      </div>

      {/* Mobil çekmecede kullanıcı kartı */}
      {profile && !isCollapsed && (
        <button
          type="button"
          onClick={() => go("Şirket Profili")}
          className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 text-left transition-colors hover:bg-white/10 lg:hidden"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83]">{profile.initials}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{profile.authorized_person}</div>
            <div className="truncate text-xs text-white/55">{profile.company_name}</div>
          </div>
        </button>
      )}

      <div className="mx-4 h-px bg-white/10" />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <NavItem icon={LayoutDashboard} label="Genel Bakış" active={activeTab === "Genel Bakış" || activeTab === "overview"} onClick={() => go("Genel Bakış")} collapsed={isCollapsed} />
        <NavItem icon={FileText} label="İlanlar" active={activeTab === "İlanlar"} badge={loadsCount.toString()} onClick={() => go("İlanlar")} collapsed={isCollapsed} />
        <NavItem icon={Star} label="Favorilerim" active={activeTab === "Favorilerim"} badge={favoritesCount > 0 ? favoritesCount.toString() : undefined} onClick={() => go("Favorilerim")} collapsed={isCollapsed} />
        <NavItem icon={Truck} label="Seferlerim" active={activeTab === "Seferlerim"} onClick={() => go("Seferlerim")} collapsed={isCollapsed} />
        <NavItem icon={WalletCards} label="Gelir & Gider" active={activeTab === "Gelir Gider"} onClick={() => go("Gelir Gider")} collapsed={isCollapsed} />
        <NavItem icon={Calculator} label="Sefer Hesapla" active={activeTab === "Sefer Hesapla"} onClick={() => go("Sefer Hesapla")} collapsed={isCollapsed} />
        <NavItem icon={Wrench} label="Şoför Araçları" active={activeTab === "Araçlar"} badge="YENİ" onClick={() => go("Araçlar")} collapsed={isCollapsed} />
        <NavItem icon={Crown} label="Premium" active={activeTab === "Premium"} badge={isPremium ? "AKTİF" : "PRO"} onClick={() => go("Premium")} collapsed={isCollapsed} />

        <div className="my-3 h-px bg-white/10" />
        <p className={cn("px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40", isCollapsed && "sr-only")}>Hesabım</p>
        
        <NavItem icon={User} label="Profilim" active={activeTab === "Şirket Profili" || activeTab === "Profilim"} onClick={() => go("Şirket Profili")} collapsed={isCollapsed} />
        <NavItem icon={CircleHelp} label="Yardım Merkezi" active={activeTab === "Yardım Merkezi"} onClick={() => go("Yardım Merkezi")} collapsed={isCollapsed} />

        <div className="my-3 h-px bg-white/10" />
        <p className={cn("px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40", isCollapsed && "sr-only")}>Yasal & Gizlilik</p>

        <Link href="/privacy" onClick={() => setIsSidebarOpen(false)} className={cn("flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white", isCollapsed && "justify-center px-0")} title={isCollapsed ? "Gizlilik Politikası" : undefined}>
          <ShieldCheck className="size-5 shrink-0 text-emerald-400" />
          {!isCollapsed && <span>Gizlilik Politikası</span>}
        </Link>
        <Link href="/kullanim-kosullari" onClick={() => setIsSidebarOpen(false)} className={cn("flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white", isCollapsed && "justify-center px-0")} title={isCollapsed ? "Kullanım Koşulları" : undefined}>
          <FileText className="size-5 shrink-0 text-sky-300" />
          {!isCollapsed && <span>Kullanım Koşulları</span>}
        </Link>

        {!isGuest && <NavItem icon={UserX} label="Hesabımı Sil" active={false} onClick={() => go("Şirket Profili")} collapsed={isCollapsed} />}

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? (isGuest ? "Giriş Yap" : "Çıkış Yap") : undefined}
            className={cn(
              "flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium text-red-300 transition-all hover:bg-red-500/15 hover:text-red-200",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isGuest ? <LogIn className="size-5 shrink-0" /> : <LogOut className="size-5 shrink-0" />}
            {!isCollapsed && <span>{isGuest ? "Giriş Yap / Kayıt Ol" : "Çıkış Yap"}</span>}
          </button>
        </div>
      </nav>

      <button aria-label={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"} className="m-3.5 hidden items-center justify-center rounded-xl bg-white/5 py-2.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors lg:flex" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight className="size-5" /> : <div className="flex items-center gap-2 text-xs font-medium"><ChevronLeft className="size-4" /><span>Menüyü Daralt</span></div>}
      </button>
      <div className="pb-safe lg:hidden" />
    </aside>
  )
}

function NavItem({ icon: Icon, label, active, collapsed, badge, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; collapsed: boolean; badge?: string; onClick?: () => void }) { 
  return (
    <button 
      type="button" 
      onClick={onClick} 
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white", 
        active && "bg-[#d64526] text-white font-semibold shadow-md hover:bg-[#d64526]", 
        collapsed && "justify-center px-0"
      )} 
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("size-5 shrink-0", active ? "text-white" : "text-white/70")} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge && <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
        </>
      )}
    </button>
  ) 
}
