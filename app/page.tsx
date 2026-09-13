"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Building2, Calculator, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileText, LayoutDashboard, MapPin, Menu, MessageCircle, MoreHorizontal, Package, Phone, Plus, Search, Settings, Truck, Users, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Load = { 
  id: number | string; 
  company: string; 
  initials: string; 
  from: string; 
  to: string; 
  cargo: string; 
  vehicle: string; 
  distance: string; 
  price: string; 
  urgent?: boolean; 
  time: string; 
  color: string; 
  source: "user" | "bot";
  phone?: string;
}

const filters = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo"]
const sourceTabs = [{ value: "all", label: "Tüm İlanlar" }, { value: "user", label: "YükleGel İlanları (Kullanıcı)" }, { value: "bot", label: "Web/Bot İlanları" }] as const

const cleanText = (text: string) => {
  if (!text) return "-"
  return text
    .replace(/[*_~`]/g, "")
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Mesaj metninden telefon numarasını otomatik ayıklama fonksiyonu
const extractPhone = (text: string) => {
  if (!text) return "05551234567"
  const match = text.match(/(0?5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/);
  return match ? match[0].replace(/\s+/g, "") : "05551234567";
}

export default function Page() {
  const [loads, setLoads] = useState<Load[]>([])
  const [activeFilter, setActiveFilter] = useState("Tümü")
  const [sourceFilter, setSourceFilter] = useState<typeof sourceTabs[number]["value"]>("all")
  const [query, setQuery] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchListings = async () => {
    setIsLoading(true)
    try {
      const userReq = supabase.from("listings").select("*").order("created_at", { ascending: false })
      const botReq = supabase.from("bot_listings").select("*").order("created_at", { ascending: false })

      const [{ data: userData, error: userErr }, { data: botData, error: botErr }] = await Promise.all([userReq, botReq])

      if (userErr) console.error("Listings hatası:", userErr)
      if (botErr) console.error("Bot listings hatası:", botErr)

      const formattedUserLoads: Load[] = (userData || []).map((item: any) => ({
        id: `user-${item.id}`,
        company: item.company_name || "İsimsiz Firma",
        initials: (item.company_name || "İF").substring(0, 2).toUpperCase(),
        from: cleanText(item.from_city),
        to: cleanText(item.to_city),
        cargo: cleanText(item.cargo_detail),
        vehicle: cleanText(item.vehicle_type || "13.60 Tenteli"),
        distance: "450 km",
        price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
        urgent: Boolean(item.urgent),
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        color: "bg-[#d64526]",
        source: "user",
        phone: item.phone || "05551234567"
      }))

      const formattedBotLoads: Load[] = (botData || []).map((item: any) => {
        const rawDetail = cleanText(item.cargo_detail || item.message || item.text || "WhatsApp İlanı")
        const rawCompany = cleanText(item.company_name || "WhatsApp Lojistik Akışı")
        const rawVehicle = cleanText(item.vehicle_type || "TIR / Kamyon")
        const extractedPhone = extractPhone(rawDetail)

        return {
          id: `bot-${item.id}`,
          company: rawCompany,
          initials: "WA",
          from: cleanText(item.from_city || ""),
          to: cleanText(item.to_city || ""),
          cargo: rawDetail,
          vehicle: rawVehicle,
          distance: "Belirtilmemiş",
          price: "", // Bot ilanlarında fiyat gizlendi
          urgent: Boolean(item.urgent),
          time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
          color: "bg-[#315d83]",
          source: "bot",
          phone: extractedPhone
        }
      })

      setLoads([...formattedUserLoads, ...formattedBotLoads])
    } catch (err) {
      console.error("Veri çekme hatası:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Supabase Realtime (Canlı Anlık Dinleme - Sayfayı yenilemeye gerek kalmaz)
  useEffect(() => {
    fetchListings()

    const channelListings = supabase
      .channel("realtime-listings")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        fetchListings()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_listings" }, () => {
        fetchListings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channelListings)
    }
  }, [])

  const handleCreateListing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const company_name = formData.get("company") as string
    const from_city = formData.get("from") as string
    const to_city = formData.get("to") as string
    const cargo_detail = formData.get("cargo") as string
    const vehicle_type = (formData.get("vehicle") as string) || "13.60 Tenteli"
    const price = Number(formData.get("price")) || 0
    const phone = (formData.get("phone") as string) || "05551234567"

    const { error } = await supabase.from("listings").insert([
      { company_name, from_city, to_city, cargo_detail, vehicle_type, price, phone, is_bot: false }
    ])

    setIsSubmitting(false)
    if (error) {
      alert("İlan eklenirken hata oluştu: " + error.message)
    } else {
      setIsCreateOpen(false)
      // Realtime sayesinde otomatik güncellenir ama ek garanti için tetikleyebiliriz
      fetchListings()
    }
  }

  const filteredLoads = useMemo(() => loads.filter((load) => {
    const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : load.vehicle.toLowerCase().includes(activeFilter.toLowerCase()))
    const sourceMatch = sourceFilter === "all" || load.source === sourceFilter
    const searchMatch = `${load.company} ${load.from} ${load.to} ${load.cargo}`.toLowerCase().includes(query.toLowerCase())
    return filterMatch && sourceMatch && searchMatch
  }), [loads, activeFilter, sourceFilter, query])

  // İstatistik Hesaplamaları
  const stats = useMemo(() => {
    const userLoads = loads.filter(l => l.source === "user");
    
    // Bugün eklenenler: Sadece kullanıcıların eklediği veriler
    const todayCount = userLoads.length; 

    // Bekleyen seferler: Kullanıcıların eklediği ilanlar
    const pendingTripsCount = userLoads.length;

    // Aktif rota: Benzersiz kalkış-varış rotalarının sayısı
    const uniqueRoutes = new Set(loads.filter(l => l.from && l.to && l.from !== "-" && l.to !== "-").map(l => `${l.from}-${l.to}`)).size;

    return {
      activeTotal: loads.length,
      todayUserCount: todayCount,
      pendingTrips: pendingTripsCount,
      activeRoutesCount: uniqueRoutes > 0 ? uniqueRoutes : 12
    }
  }, [loads])

  const go = (tab: string) => { setActiveTab(tab); setIsSidebarOpen(false) }

  return <div className="min-h-screen bg-[#f5f7fa] text-[#122c4a]">
    {isSidebarOpen && <button aria-label="Menüyü kapat" className="fixed inset-0 z-30 cursor-pointer bg-[#122c4a]/35 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#122c4a] text-white transition-transform duration-200 lg:translate-x-0", isSidebarOpen ? "translate-x-0" : "-translate-x-full", isCollapsed && "lg:w-[76px]")}>
      <div className="flex h-[82px] items-center gap-3 px-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d64526] text-xl font-bold">Y</div>{!isCollapsed && <div><div className="text-[19px] font-bold tracking-tight">YükleGel</div><div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Lojistik ağı</div></div>}<button aria-label="Menüyü kapat" className="ml-auto cursor-pointer rounded-md p-1 text-white/60 hover:bg-white/10 lg:hidden" onClick={() => setIsSidebarOpen(false)}><X /></button></div>
      <Separator className="bg-white/10" /><nav className="flex flex-1 flex-col gap-1 px-3 py-6"><NavItem icon={LayoutDashboard} label="Genel Bakış" active={activeTab === "overview"} collapsed={isCollapsed} onClick={() => go("overview")} /><NavItem icon={FileText} label="İlanlar" active={activeTab === "İlanlar"} collapsed={isCollapsed} badge={loads.length.toString()} onClick={() => go("İlanlar")} /><NavItem icon={Truck} label="Seferlerim" active={activeTab === "Seferlerim"} collapsed={isCollapsed} onClick={() => go("Seferlerim")} /><NavItem icon={Calculator} label="Sefer Hesapla" active={activeTab === "Sefer Hesapla"} collapsed={isCollapsed} onClick={() => go("Sefer Hesapla")} /><NavItem icon={Users} label="Firmalar" active={activeTab === "Firmalar"} collapsed={isCollapsed} onClick={() => go("Firmalar")} /><div className="my-5 h-px bg-white/10" /><p className={cn("px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35", isCollapsed && "sr-only")}>Yönetim</p><NavItem icon={Building2} label="Şirket Profili" active={activeTab === "Şirket Profili"} collapsed={isCollapsed} onClick={() => go("Şirket Profili")} /><NavItem icon={Settings} label="Ayarlar" collapsed={isCollapsed} onClick={() => go("Ayarlar")} /><NavItem icon={CircleHelp} label="Yardım Merkezi" collapsed={isCollapsed} /></nav><button aria-label="Menüyü daralt" className="m-3 hidden cursor-pointer items-center justify-center rounded-lg p-2 text-white/50 hover:bg-white/10 lg:flex" onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? <ChevronRight /> : <ChevronLeft />}</button>
    </aside>
    <div className={cn("min-h-screen transition-[padding] duration-200 lg:pl-[260px]", isCollapsed && "lg:pl-[76px]")}><header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-[#e4e9ef] bg-[#f5f7fa]/95 px-4 backdrop-blur-md sm:px-8"><div className="flex min-w-0 items-center gap-3"><button aria-label="Menüyü aç" className="cursor-pointer rounded-lg p-2 hover:bg-white lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu /></button><div className="relative hidden w-[320px] sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8da0b2]" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İlan, firma veya şehir ara..." className="h-10 border-[#e0e6ed] bg-white pl-10 text-sm shadow-none" /></div></div><div className="flex items-center gap-3 sm:gap-5"><button aria-label="Bildirimler" className="relative cursor-pointer rounded-lg p-2 text-[#6d8194] hover:bg-white"><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f5f7fa] bg-[#d64526]" /></button><Separator orientation="vertical" className="hidden h-8 sm:block" /><button className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-white"><div className="grid size-9 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83]">MK</div><div className="hidden text-left sm:block"><div className="text-sm font-semibold">Mehmet Kaya</div><div className="text-xs text-[#8da0b2]">Aksoy Lojistik</div></div><ChevronDown className="hidden text-[#8da0b2] sm:block" /></button></div></header>
      <main className="mx-auto max-w-[1450px] px-4 py-7 sm:px-8 sm:py-9">{(activeTab === "overview" || activeTab === "İlanlar") && <ListingsView loads={filteredLoads} totalLoadsCount={loads.length} stats={stats} loading={isLoading} activeFilter={activeFilter} setActiveFilter={setActiveFilter} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} setIsCreateOpen={setIsCreateOpen} />} {activeTab === "Seferlerim" && <TripsView />} {activeTab === "Firmalar" && <CompaniesView />} {activeTab === "Şirket Profili" && <CompanyProfileView />} {activeTab === "Sefer Hesapla" && <CalculatorView />}</main></div>
    
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#122c4a]">Yeni ilan oluştur</DialogTitle>
          <DialogDescription>Yük bilgilerini girerek doğrudan veritabanına yayınlayın.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleCreateListing}>
          <div className="grid gap-2"><Label htmlFor="company">Firma adı</Label><Input id="company" name="company" placeholder="Örn. Aksoy Lojistik" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="from">Nereden</Label><Input id="from" name="from" placeholder="İstanbul" required /></div>
            <div className="grid gap-2"><Label htmlFor="to">Nereye</Label><Input id="to" name="to" placeholder="Ankara" required /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="cargo">Yük detayı</Label><Input id="cargo" name="cargo" placeholder="Paletli gıda ürünleri · 18 ton" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label htmlFor="vehicle">Araç Tipi</Label><Input id="vehicle" name="vehicle" placeholder="13.60 Tenteli, Frigo vb." defaultValue="13.60 Tenteli" required /></div>
            <div className="grid gap-2"><Label htmlFor="price">Teklif Fiyatı (TL)</Label><Input id="price" name="price" type="number" placeholder="28500" required /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="phone">İletişim Telefonu</Label><Input id="phone" name="phone" placeholder="05551234567" defaultValue="05551234567" required /></div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer bg-[#d64526] text-white hover:bg-[#b93820]">{isSubmitting ? "Kaydediliyor..." : "İlanı yayınla"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
}

function ListingsView({ loads, totalLoadsCount, stats, loading, activeFilter, setActiveFilter, sourceFilter, setSourceFilter, setIsCreateOpen }: { loads: Load[]; totalLoadsCount: number; stats: { activeTotal: number; todayUserCount: number; pendingTrips: number; activeRoutesCount: number }; loading: boolean; activeFilter: string; setActiveFilter: (v: string) => void; sourceFilter: "all" | "user" | "bot"; setSourceFilter: (v: "all" | "user" | "bot") => void; setIsCreateOpen: (v: boolean) => void }) { 
  return <>
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
    <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={Package} label="Aktif ilanlar (Tümü)" value={stats.activeTotal.toString()} />
      <Stat icon={Clock3} label="Bugün eklenen (Kullanıcı)" value={stats.todayUserCount.toString()} />
      <Stat icon={Truck} label="Bekleyen seferler (Kullanıcı)" value={stats.pendingTrips.toString()} />
      <Stat icon={MapPin} label="Aktif rotalar" value={stats.activeRoutesCount.toString()} />
    </section>
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-[#e4e9ef] bg-white p-2">
      {sourceTabs.map((tab) => <button key={tab.value} className={cn("cursor-pointer whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-[#718397] hover:bg-[#f5f7fa]", sourceFilter === tab.value && "bg-[#122c4a] text-white hover:bg-[#122c4a]")} onClick={() => setSourceFilter(tab.value)}>{tab.label}</button>)}
    </div>
    <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#e4e9ef] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 overflow-x-auto">
        {filters.map((filter) => <button key={filter} className={cn("cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-[#718397] hover:bg-[#f5f7fa]", activeFilter === filter && "bg-[#122c4a] text-white hover:bg-[#122c4a]")} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
      </div>
      <div className="flex items-center gap-2 text-xs text-[#8da0b2]"><span className="size-2 rounded-full bg-[#67c587]" /> {loads.length} ilan gösteriliyor</div>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      {loading ? <div className="col-span-full py-12 text-center text-sm text-[#718397]">Yükleniyor...</div> : loads.length ? loads.map((load) => <LoadCard key={load.id} load={load} />) : <div className="col-span-full rounded-xl border border-dashed border-[#ccd6e0] bg-white py-16 text-center text-sm text-[#718397]">Henüz ilan bulunamadı.</div>}
    </div>
  </> 
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) { return <div className="rounded-xl border border-[#e4e9ef] bg-white p-4"><div className="mb-3 flex items-start justify-between"><div className="grid size-9 place-items-center rounded-lg bg-[#eef4f8] text-[#315d83]"><Icon /></div></div><div className="text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-[#8da0b2]">{label}</div></div> }

function LoadCard({ load }: { load: Load }) { 
  const [saved, setSaved] = useState(false); 
  const phoneNum = load.phone || "05551234567";

  return <article className="rounded-xl border border-[#e4e9ef] bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(18,44,74,0.07)]">
    <div className="mb-4 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("grid size-10 place-items-center rounded-lg text-xs font-bold text-white", load.color)}>{load.initials}</div>
        <div>
          <div className="text-sm font-bold">{load.company}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#8da0b2]"><Clock3 /> {load.time}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {load.source === "bot" && <Badge className="bg-[#eef4f8] text-[10px] font-semibold text-[#315d83] hover:bg-[#eef4f8]">WhatsApp / Bot</Badge>}
        {load.urgent && <Badge className="bg-[#fff0ec] text-[10px] font-semibold text-[#d64526] hover:bg-[#fff0ec]">Acil</Badge>}
        <button aria-label="Seçenekler" className="cursor-pointer rounded-md p-1 text-[#8da0b2] hover:bg-[#f5f7fa]"><MoreHorizontal /></button>
      </div>
    </div>

    {load.source === "user" ? (
      <div className="mb-4 flex items-center gap-3 rounded-lg bg-[#f7f9fb] px-4 py-3">
        <div><div className="text-sm font-bold">{load.from}</div><div className="text-[10px] text-[#8da0b2]">Çıkış</div></div>
        <div className="flex flex-1 items-center gap-2"><div className="h-px flex-1 bg-[#cad5df]" /><div className="text-[#d64526]">→</div><div className="h-px flex-1 bg-[#cad5df]" /></div>
        <div className="text-right"><div className="text-sm font-bold">{load.to}</div><div className="text-[10px] text-[#8da0b2]">Varış</div></div>
      </div>
    ) : (
      <div className="mb-4 rounded-lg bg-[#f7f9fb] p-3 text-sm text-[#243c5a] leading-relaxed border border-[#edf0f3]">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8da0b2]">WhatsApp Mesaj İçeriği</div>
        <p className="font-normal whitespace-pre-wrap">{load.cargo}</p>
      </div>
    )}

    {load.source === "user" && (
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Yük detayı</div><div className="font-medium">{load.cargo}</div></div>
        <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Araç tipi</div><div className="font-medium">{load.vehicle}</div></div>
      </div>
    )}

    <div className="flex items-end justify-between border-t border-[#edf0f3] pt-4">
      {load.source === "user" ? (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9aaaba]">Fiyat / Bilgi</div>
          <div className="mt-1 text-xl font-bold text-[#d64526]">{load.price}</div>
        </div>
      ) : (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#9aaaba]">İletişim Hattı</div>
          <div className="mt-1 text-sm font-bold text-[#315d83]">{phoneNum}</div>
        </div>
      )}
      
      <div className="flex gap-2">
        {/* WhatsApp Butonu: Doğrudan ilandaki numaraya yönlendirir */}
        <a href={`https://wa.me/${phoneNum.replace(/\D/g, "")}?text=İlanınızla%2520ilgileniyorum`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#3b8068] hover:bg-[#e7f5ed]">
          <MessageCircle />
        </a>
        {/* Telefon Arama Butonu: Doğrudan ilandaki numarayı arar */}
        <a href={`tel:${phoneNum}`} aria-label="Ara" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#315d83] hover:bg-[#eef4f8]">
          <Phone />
        </a>
        <button type="button" aria-label="Kaydet" className={cn("cursor-pointer rounded-lg border p-2 hover:bg-[#fff8e8]", saved ? "border-[#806c41] bg-[#fff8e8] text-[#806c41]" : "border-[#dbe3ea] text-[#806c41]")} onClick={() => setSaved(!saved)}>☆</button>
      </div>
    </div>
  </article> 
}

function CalculatorView() { return <TabView title="Sefer Hesapla" description="Maliyetlerinizi görün, teklifinizi kârlı oluşturun."><div className="text-sm text-[#718397]">Hesaplama aracı aktif.</div></TabView> }
function TripsView() { return <TabView title="Seferlerim" description="Seferlerinizi takip edin."><div className="text-sm text-[#718397]">Sefer bulunmuyor.</div></TabView> }
function CompaniesView() { return <TabView title="Firmalar" description="Firmaları keşfedin."><div className="text-sm text-[#718397]">Firma listesi yakında.</div></TabView> }
function CompanyProfileView() { return <TabView title="Şirket Profili" description="Şirket bilgilerinizi yönetin."><div className="text-sm text-[#718397]">Profil ayarları.</div></TabView> }
function TabView({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div><div className="mb-8"><p className="mb-2 text-sm font-medium text-[#d64526]">YükleGel çalışma alanı</p><h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">{title}</h1><p className="mt-2 text-sm text-[#718397]">{description}</p></div>{children}</div> }
function NavItem({ icon: Icon, label, active, collapsed, badge, onClick }: { icon: typeof LayoutDashboard; label: string; active?: boolean; collapsed: boolean; badge?: string; onClick?: () => void }) { return <button type="button" onClick={onClick} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white", active && "bg-white/12 text-white", collapsed && "justify-center")} title={collapsed ? label : undefined}><Icon />{!collapsed && <><span>{label}</span>{badge && <span className="ml-auto rounded-full bg-[#d64526] px-2 py-0.5 text-[10px] text-white">{badge}</span>}</>}</button> }
