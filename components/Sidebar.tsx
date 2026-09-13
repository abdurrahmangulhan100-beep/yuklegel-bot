"use client"

import { Building2, Calculator, ChevronLeft, ChevronRight, CircleHelp, FileText, LayoutDashboard, Settings, Truck, Users, WalletCards, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  loadsCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  loadsCount, 
  isCollapsed, 
  setIsCollapsed, 
  isSidebarOpen, 
  setIsSidebarOpen 
}: SidebarProps) {
  const go = (tab: string) => { 
    setActiveTab(tab); 
    setIsSidebarOpen(false); 
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#122c4a] text-white transition-transform duration-200 lg:translate-x-0", 
      isSidebarOpen ? "translate-x-0" : "-translate-x-full", 
      isCollapsed && "lg:w-[76px]"
    )}>
      <div className="flex h-[82px] items-center gap-3 px-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d64526] text-xl font-bold">Y</div>
        {!isCollapsed && (
          <div>
            <div className="text-[19px] font-bold tracking-tight">YükleGel</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Lojistik ağı</div>
          </div>
        )}
        <button aria-label="Menüyü kapat" className="ml-auto cursor-pointer rounded-md p-1 text-white/60 hover:bg-white/10 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
          <X />
        </button>
      </div>

      <Separator className="bg-white/10" />

      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        <NavItem icon={LayoutDashboard} label="Genel Bakış" active={activeTab === "overview"} collapsed={isCollapsed} onClick={() => go("overview")} />
        <NavItem icon={FileText} label="İlanlar" active={activeTab === "İlanlar"} collapsed={isCollapsed} badge={loadsCount.toString()} onClick={() => go("İlanlar")} />
        <NavItem icon={Truck} label="Seferlerim" active={activeTab === "Seferlerim"} collapsed={isCollapsed} onClick={() => go("Seferlerim")} />
        <NavItem icon={WalletCards} label="Gelir & Gider" active={activeTab === "Gelir Gider"} collapsed={isCollapsed} onClick={() => go("Gelir Gider")} />
        <NavItem icon={Calculator} label="Sefer Hesapla" active={activeTab === "Sefer Hesapla"} collapsed={isCollapsed} onClick={() => go("Sefer Hesapla")} />
        <NavItem icon={Users} label="Firmalar" active={activeTab === "Firmalar"} collapsed={isCollapsed} onClick={() => go("Firmalar")} />

        <div className="my-5 h-px bg-white/10" />
        <p className={cn("px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35", isCollapsed && "sr-only")}>Yönetim</p>
        
        <NavItem icon={Building2} label="Şirket Profili" active={activeTab === "Şirket Profili"} collapsed={isCollapsed} onClick={() => go("Şirket Profili")} />
        <NavItem icon={Settings} label="Ayarlar" active={activeTab === "Ayarlar"} collapsed={isCollapsed} onClick={() => go("Ayarlar")} />
        <NavItem icon={CircleHelp} label="Yardım Merkezi" active={activeTab === "Yardım Merkezi"} collapsed={isCollapsed} onClick={() => go("Yardım Merkezi")} />
      </nav>

      <button aria-label="Menüyü daralt" className="m-3 hidden cursor-pointer items-center justify-center rounded-lg p-2 text-white/50 hover:bg-white/10 lg:flex" onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </aside>
  )
}

function NavItem({ icon: Icon, label, active, collapsed, badge, onClick }: { icon: any; label: string; active?: boolean; collapsed: boolean; badge?: string; onClick?: () => void }) { 
  return (
    <button 
      type="button" 
      onClick={onClick} 
      className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white", active && "bg-white/12 text-white", collapsed && "justify-center")} 
      title={collapsed ? label : undefined}
    >
      <Icon />
      {!collapsed && (
        <>
          <span>{label}</span>
          {badge && <span className="ml-auto rounded-full bg-[#d64526] px-2 py-0.5 text-[10px] text-white">{badge}</span>}
        </>
      )}
    </button>
  ) 
}
