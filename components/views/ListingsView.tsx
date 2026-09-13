"use client"

import { MapPin, Package, Plus, Truck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadCard, Load } from "@/components/LoadCard"
import { cn } from "@/lib/utils"

const filters = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo"]
const sourceTabs = [
  { value: "all", label: "Tüm İlanlar" }, 
  { value: "user", label: "YükleGel İlanları (Kullanıcı)" }, 
  { value: "bot", label: "Web/Bot İlanları" }
] as const

type ListingsViewProps = {
  loads: Load[];
  stats: {
    activeTotal: number;
    todayUserCount: number;
    pendingTrips: number;
    activeRoutesCount: number;
  };
  loading: boolean;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  sourceFilter: typeof sourceTabs[number]["value"];
  setSourceFilter: (source: typeof sourceTabs[number]["value"]) => void;
  setIsCreateOpen: (open: boolean) => void;
  searchQuery?: string;
}

export function ListingsView({ 
  loads, 
  stats, 
  loading, 
  activeFilter, 
  setActiveFilter, 
  sourceFilter, 
  setSourceFilter, 
  setIsCreateOpen,
  searchQuery = ""
}: ListingsViewProps) { 
  const isKonyaSearch = searchQuery.toLowerCase().includes("konya")

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#d64526]">Canlı Lojistik Paneli</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">İlanlar</h1>
          <p className="mt-2 text-sm text-[#718397]">Size uygun yükleri keşfedin ve yeni fırsatları kaçırmayın.</p>
        </div>
        <Button className="h-11 cursor-pointer gap-2 bg-[#d64526] px-5 text-white hover:bg-[#b93820]" onClick={() => setIsCreateOpen(true)}>
          <Plus /> İlan oluştur
        </Button>
      </div>

      {isKonyaSearch && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-amber-800 shadow-sm animate-pulse">
          <Sparkles className="size-5 shrink-0 text-amber-600 animate-spin" />
          <div className="text-sm font-medium">
            <span className="font-bold">Konya</span> araması için filtrelenen ilanlar listeleniyor. Toplam <span className="font-bold">{loads.length}</span> sonuç bulundu.
          </div>
        </div>
      )}

      <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Package} label="Aktif ilanlar (Tümü)" value={stats.activeTotal.toString()} />
        <Stat icon={Package} label="Bugün eklenen (Kullanıcı)" value={stats.todayUserCount.toString()} />
        <Stat icon={Truck} label="Bekleyen seferler (Kullanıcı)" value={stats.pendingTrips.toString()} />
        <Stat icon={MapPin} label="Aktif rotalar" value={stats.activeRoutesCount.toString()} />
      </section>

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-[#e4e9ef] bg-white p-2">
        {sourceTabs.map((tab) => (
          <button 
            key={tab.value} 
            className={cn("cursor-pointer whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-[#718397] hover:bg-[#f5f7fa]", sourceFilter === tab.value && "bg-[#122c4a] text-white hover:bg-[#122c4a]")} 
            onClick={() => setSourceFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#e4e9ef] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {filters.map((filter) => (
            <button 
              key={filter} 
              className={cn("cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-[#718397] hover:bg-[#f5f7fa]", activeFilter === filter && "bg-[#122c4a] text-white hover:bg-[#122c4a]")} 
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8da0b2]">
          <span className="size-2 rounded-full bg-[#67c587]" /> {loads.length} ilan gösteriliyor
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-12 text-center text-sm text-[#718397]">Yükleniyor...</div>
        ) : loads.length ? (
          loads.map((load) => (
            <div 
              key={load.id} 
              className={cn(
                "transition-all duration-300 rounded-xl",
                isKonyaSearch && "ring-2 ring-amber-400 ring-offset-2 bg-amber-50/20 shadow-md"
              )}
            >
              <LoadCard load={load} />
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-[#ccd6e0] bg-white py-16 text-center text-sm text-[#718397]">
            {isKonyaSearch ? "Konya ile eşleşen herhangi bir ilan bulunamadı." : "Henüz ilan bulunamadı."}
          </div>
        )}
      </div>
    </>
  )
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) { 
  return (
    <div className="rounded-xl border border-[#e4e9ef] bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="grid size-9 place-items-center rounded-lg bg-[#eef4f8] text-[#315d83]"><Icon /></div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[#8da0b2]">{label}</div>
    </div>
  ) 
}
