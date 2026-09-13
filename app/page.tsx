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
  source: "user" | "bot" 
}

const fallbackLoads: Load[] = [
  { id: 1, company: "Aksoy Lojistik", initials: "AL", from: "İstanbul", to: "Ankara", cargo: "Paletli gıda ürünleri · 18 ton", vehicle: "13.60 Tenteli", distance: "453 km", price: "₺28.500", urgent: true, time: "12 dk önce", color: "bg-[#d64526]", source: "user" },
  { id: 2, company: "Marmara Nakliyat", initials: "MN", from: "Bursa", to: "İzmir", cargo: "Otomotiv yedek parça · 12 ton", vehicle: "Kamyon", distance: "326 km", price: "₺19.750", time: "28 dk önce", color: "bg-[#315d83]", source: "bot" },
  { id: 3, company: "Soğuk Zincir A.Ş.", initials: "SZ", from: "Antalya", to: "İstanbul", cargo: "Taze sebze & meyve · 20 ton", vehicle: "Frigo", distance: "715 km", price: "₺42.000", urgent: true, time: "41 dk önce", color: "bg-[#3b8068]", source: "user" },
  { id: 4, company: "Ege Taşımacılık", initials: "ET", from: "Manisa", to: "Konya", cargo: "Tekstil hammaddesi · 16 ton", vehicle: "13.60 Tenteli", distance: "533 km", price: "₺31.250", time: "1 sa önce", color: "bg-[#806c41]", source: "bot" },
  { id: 5, company: "Anadolu Lojistik", initials: "AN", from: "Gaziantep", to: "Adana", cargo: "Koli yükü · 8 ton", vehicle: "Kamyonet", distance: "225 km", price: "₺12.500", time: "1 sa önce", color: "bg-[#745b8c]", source: "user" },
]

const filters = ["Tümü", "Acil", "Tır", "Kamyon", "Frigo"]
const sourceTabs = [{ value: "all", label: "Tüm İlanlar" }, { value: "user", label: "YükleGel İlanları (Kullanıcı)" }, { value: "bot", label: "Web/Bot İlanları" }] as const

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

  // Supabase'den İlanları Çekme Fonksiyonu (Hem Kullanıcı Hem Bot İlanları)
  const fetchListings = async () => {
    setIsLoading(true)
    try {
      // 1. Kullanıcı İlanlarını Çek
      const userReq = supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })

      // 2. Bot İlanlarını Çek
      const botReq = supabase
        .from("bot_listings")
        .select("*")
        .order("created_at", { ascending: false })

      const [{ data: userData, error: userErr }, { data: botData, error: botErr }] = await Promise.all([userReq, botReq])

      if (userErr) console.error("Listings hatası:", userErr)
      if (botErr) console.error("Bot listings hatası:", botErr)

      const formattedUserLoads: Load[] = (userData || []).map((item: any) => ({
        id: `user-${item.id}`,
        company: item.company_name || "İsimsiz Firma",
        initials: (item.company_name || "İF").substring(0, 2).toUpperCase(),
        from: item.from_city || "-",
        to: item.to_city || "-",
        cargo: item.cargo_detail || "-",
        vehicle: item.vehicle_type || "13.60 Tenteli",
        distance: "450 km",
        price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
        urgent: Boolean(item.urgent),
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        color: "bg-[#d64526]",
        source: "user"
      }))

      const formattedBotLoads: Load[] = (botData || []).map((item: any) => ({
        id: `bot-${item.id}`,
        company: item.company_name || "WhatsApp Lojistik Akışı",
        initials: (item.company_name || "WA").substring(0, 2).toUpperCase(),
        from: item.from_city || "-",
        to: item.to_city || "-",
        cargo: item.cargo_detail || "-",
        vehicle: item.vehicle_type || "13.60 Tenteli",
        distance: "450 km",
        price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
        urgent: Boolean(item.urgent),
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        color: "bg-[#315d83]",
        source: "bot"
      }))

      const allLoads = [...formattedUserLoads, ...formattedBotLoads]

      if (allLoads.length > 0) {
        setLoads(allLoads)
      } else {
        setLoads([])
      }
    } catch (err) {
      console.error("Veri çekme hatası:", err)
      setLoads(fallbackLoads)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  // Yeni İlan Oluşturma ve Supabase'e Kaydetme
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
      {
        company_name,
        from_city,
        to_city,
        cargo_detail,
        vehicle_type,
        price,
        phone,
        is_bot: false
      }
    ])

    setIsSubmitting(false)

    if (error) {
      alert("İlan eklenirken hata oluştu: " + error.message)
    } else {
      setIsCreateOpen(false)
      fetchListings()
    }
  }

  const filteredLoads = useMemo(() => loads.filter((load) => {
    const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : load.vehicle.toLowerCase().includes(activeFilter.toLowerCase()));
    const sourceMatch = sourceFilter === "all" || load.source === sourceFilter;
    const searchMatch = `${load.company} ${load.from} ${load.to} ${load.cargo}`.toLowerCase().includes(query.toLowerCase());
    return filterMatch && sourceMatch && searchMatch
  }), [loads, activeFilter, sourceFilter, query])

  const go = (tab: string) => { setActiveTab(tab); setIsSidebarOpen(false) }

  return <div className="min-h-screen bg-[#f5f7fa] text-[#122c4a]">
    {isSidebarOpen && <button aria-label="Menüyü kapat" className="fixed inset-0 z-30 cursor-pointer bg-[#122c4a]/35 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#122c4a] text-white transition-transform duration-200 lg:translate-x-0", isSidebarOpen ? "translate-x-0" : "-translate-x-full", isCollapsed && "lg:w-[76px]")}>
      <div className="flex h-[82px] items-center gap-3 px-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d64526] text-xl font-bold">Y</div>{!isCollapsed && <div><div className="text-[19px] font-bold tracking-tight">YükleGel</div><div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Lojistik ağı</div></div>}<button aria-label="Menüyü kapat" className="ml-auto cursor-pointer rounded-md p-1 text-white/60 hover:bg-white/10 lg:hidden" onClick={() => setIsSidebarOpen(false)}><X /></button></div>
      <Separator className="bg-white/10" /><nav className="flex flex-1 flex-col gap-1 px-3 py-6"><NavItem icon={LayoutDashboard} label="Genel Bakış" active={activeTab === "overview"} collapsed={isCollapsed} onClick={() => go("overview")} /><NavItem icon={FileText} label="İlanlar" active={activeTab === "İlanlar"} collapsed={isCollapsed} badge={loads.length.toString()} onClick={() => go("İlanlar")} /><NavItem icon={Truck} label="Seferlerim" active={activeTab === "Seferlerim"} collapsed={isCollapsed} onClick={() => go("Seferlerim")} /><NavItem icon={Calculator} label="Sefer Hesapla" active={activeTab === "Sefer Hesapla"} collapsed={isCollapsed} onClick={() => go("Sefer Hesapla")} /><NavItem icon={Users} label="Firmalar" active={activeTab === "Firmalar"} collapsed={isCollapsed} onClick={() => go("Firmalar")} /><div className="my-5 h-px bg-white/10" /><p className={cn("px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35", isCollapsed && "sr-only")}>Yönetim</p><NavItem icon={Building2} label="Şirket Profili" active={activeTab === "Şirket Profili"} collapsed={isCollapsed} onClick={() => go("Şirket Profili")} /><NavItem icon={Settings} label="Ayarlar" collapsed={isCollapsed} onClick={() => go("Ayarlar")} /><NavItem icon={CircleHelp} label="Yardım Merkezi" collapsed={isCollapsed} /></nav><div className={cn("m-3 rounded-xl bg-white/8 p-3", isCollapsed && "hidden")}><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><span className="size-2 rounded-full bg-[#67c587]" /> Sistemler aktif</div><p className="text-[11px] leading-relaxed text-white/45">Tüm ilan ve sefer verileriniz güvende.</p></div><button aria-label="Menüyü daralt" className="m-3 hidden cursor-pointer items-center justify-center rounded-lg p-2 text-white/50 hover:bg-white/10 lg:flex" onClick={() => setIsCollapsed(!isCollapsed)}>{isCollapsed ? <ChevronRight /> : <ChevronLeft />}</button>
    </aside>
    <div className={cn("min-h-screen transition-[padding] duration-200 lg:pl-[260px]", isCollapsed && "lg:pl-[76px]")}><header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-[#e4e9ef] bg-[#f5f7fa]/95 px-4 backdrop-blur-md sm:px-8"><div className="flex min-w-0 items-center gap-3"><button aria-label="Menüyü aç" className="cursor-pointer rounded-lg p-2 hover:bg-white lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu /></button><div className="relative hidden w-[320px] sm:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8da0b2]" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İlan, firma veya şehir ara..." className="h-10 border-[#e0e6ed] bg-white pl-10 text-sm shadow-none" /></div></div><div className="flex items-center gap-3 sm:gap-5"><button aria-label="Bildirimler" className="relative cursor-pointer rounded-lg p-2 text-[#6d8194] hover:bg-white"><Bell /><span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f5f7fa] bg-[#d64526]" /></button><Separator orientation="vertical" className="hidden h-8 sm:block" /><button className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-white"><div className="grid size-9 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83]">MK</div><div className="hidden text-left sm:block"><div className="text-sm font-semibold">Mehmet Kaya</div><div className="text-xs text-[#8da0b2]">Aksoy Lojistik</div></div><ChevronDown className="hidden text-[#8da0b2] sm:block" /></button></div></header>
      <main className="mx-auto max-w-[1450px] px-4 py-7 sm:px-8 sm:py-9">{(activeTab === "overview" || activeTab === "İlanlar") && <ListingsView loads={filteredLoads} loading={isLoading} activeFilter={activeFilter} setActiveFilter={setActiveFilter} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} setIsCreateOpen={setIsCreateOpen} />} {activeTab === "Seferlerim" && <TripsView />} {activeTab === "Firmalar" && <CompaniesView />} {activeTab === "Şirket Profili" && <CompanyProfileView />} {activeTab === "Sefer Hesapla" && <CalculatorView />}</main></div>
    
    {/* İlan Oluşturma Modalı */}
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#122c4a]">Yeni ilan oluştur</DialogTitle>
          <DialogDescription>Yük bilgilerini girerek doğrudan veritabanına yayınlayın.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleCreateListing}>
          <div className="grid gap-2">
            <Label htmlFor="company">Firma adı</Label>
            <Input id="company" name="company" placeholder="Örn. Aksoy Lojistik" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="from">Nereden</Label>
              <Input id="from" name="from" placeholder="İstanbul" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to">Nereye</Label>
              <Input id="to" name="to" placeholder="Ankara" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cargo">Yük detayı</Label>
            <Input id="cargo" name="cargo" placeholder="Paletli gıda ürünleri · 18 ton" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="vehicle">Araç Tipi</Label>
              <Input id="vehicle" name="vehicle" placeholder="13.60 Tenteli, Frigo vb." defaultValue="13.60 Tenteli" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Teklif Fiyatı (TL)</Label>
              <Input id="price" name="price" type="number" placeholder="28500" required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">İletişim Telefonu</Label>
            <Input id="phone" name="phone" placeholder="05551234567" defaultValue="05551234567" required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => setIsCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer bg-[#d64526] text-white hover:bg-[#b93820]">
              {isSubmitting ? "Kaydediliyor..." : "İlanı yayınla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
}

function ListingsView({ loads, loading, activeFilter, setActiveFilter, sourceFilter, setSourceFilter, setIsCreateOpen }: { loads: Load[]; loading: boolean; activeFilter: string; setActiveFilter: (v: string) => void; sourceFilter: "all" | "user" | "bot"; setSourceFilter: (v: "all" | "user" | "bot") => void; setIsCreateOpen: (v: boolean) => void }) { 
  return <>
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-sm font-medium text-[#d64526]">Canlı Lojistik Paneli</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">İlanlar</h1>
        <p className="mt-2 text-sm text-[#718397]">Size uygun yükleri keşfedin ve yeni fırsatları kaçırmayın.</p>
      </div>
      <Button className="h-11 cursor-pointer gap-2 bg-[#d64526] px-5 text-white hover:bg-[#b93820]" onClick={() => setIsCreateOpen(true)}>
        <Plus data-icon="inline-start" /> İlan oluştur
      </Button>
    </div>
    <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={Package} label="Aktif ilanlar" value={loads.length.toString()} />
      <Stat icon={Clock3} label="Bugün eklenen" value="12" />
      <Stat icon={Truck} label="Bekleyen seferler" value="32" />
      <Stat icon={MapPin} label="Aktif rotalar" value="174" />
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
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold">Size uygun ilanlar</h2>
      <button className="cursor-pointer text-sm font-semibold text-[#d64526] hover:underline">Tümünü gör</button>
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      {loading ? fallbackLoads.slice(0, 4).map((load) => <LoadCard key={load.id} load={load} loading />) : loads.length ? loads.map((load) => <LoadCard key={load.id} load={load} />) : <div className="col-span-full rounded-xl border border-dashed border-[#ccd6e0] bg-white py-16 text-center text-sm text-[#718397]">Henüz ilan eklenmemiş. İlan oluştur butonunu kullanarak ilk ilanı ekleyebilirsiniz.</div>}
    </div>
  </> 
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) { return <div className="rounded-xl border border-[#e4e9ef] bg-white p-4"><div className="mb-3 flex items-start justify-between"><div className="grid size-9 place-items-center rounded-lg bg-[#eef4f8] text-[#315d83]"><Icon /></div></div><div className="text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-[#8da0b2]">{label}</div></div> }

function LoadCard({ load, loading = false }: { load: Load; loading?: boolean }) { 
  const [saved, setSaved] = useState(false); 
  return <article className={cn("rounded-xl border border-[#e4e9ef] bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(18,44,74,0.07)]", loading && "animate-pulse")}>
    <div className="mb-5 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("grid size-10 place-items-center rounded-lg text-xs font-bold text-white", load.color)}>{load.initials}</div>
        <div>
          <div className="text-sm font-bold">{load.company}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#8da0b2]"><Clock3 /> {load.time}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {load.source === "bot" && <Badge className="bg-[#eef4f8] text-[10px] font-semibold text-[#315d83] hover:bg-[#eef4f8]">Bot / Otomatik</Badge>}
        {load.urgent && <Badge className="bg-[#fff0ec] text-[10px] font-semibold text-[#d64526] hover:bg-[#fff0ec]">Acil</Badge>}
        <button aria-label="İlan seçenekleri" className="cursor-pointer rounded-md p-1 text-[#8da0b2] hover:bg-[#f5f7fa]"><MoreHorizontal /></button>
      </div>
    </div>
    {load.source === "bot" && <p className="mb-4 text-xs text-[#8da0b2]">Kaynak: Web taraması ve otomatik eşleştirme</p>}
    <div className="mb-5 flex items-center gap-3 rounded-lg bg-[#f7f9fb] px-4 py-3">
      <div><div className="text-sm font-bold">{load.from}</div><div className="text-[10px] text-[#8da0b2]">Çıkış</div></div>
      <div className="flex flex-1 items-center gap-2"><div className="h-px flex-1 bg-[#cad5df]" /><div className="text-[#d64526]">→</div><div className="h-px flex-1 bg-[#cad5df]" /></div>
      <div className="text-right"><div className="text-sm font-bold">{load.to}</div><div className="text-[10px] text-[#8da0b2]">Varış</div></div>
    </div>
    <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
      <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Yük detayı</div><div className="font-medium">{load.cargo}</div></div>
      <div><div className="mb-1 text-[10px] uppercase tracking-wide text-[#9aaaba]">Araç tipi</div><div className="font-medium">{load.vehicle}</div></div>
    </div>
    <div className="flex items-end justify-between border-t border-[#edf0f3] pt-4">
      <div><div className="text-[10px] uppercase tracking-wide text-[#9aaaba]">Teklif fiyatı</div><div className="mt-1 text-xl font-bold text-[#d64526]">{load.price}</div><div className="text-xs text-[#8da0b2]">{load.distance}</div></div>
      <div className="flex gap-2">
        <button type="button" aria-label="WhatsApp ile iletişim" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#3b8068] hover:bg-[#e7f5ed]"><MessageCircle /></button>
        <button type="button" aria-label="Firmayı ara" className="cursor-pointer rounded-lg border border-[#dbe3ea] p-2 text-[#315d83] hover:bg-[#eef4f8]"><Phone /></button>
        <button type="button" aria-label={saved ? "İlan kaydedildi" : "İlanı kaydet"} className={cn("cursor-pointer rounded-lg border p-2 hover:bg-[#fff8e8]", saved ? "border-[#806c41] bg-[#fff8e8] text-[#806c41]" : "border-[#dbe3ea] text-[#806c41]")} onClick={() => setSaved(!saved)}>☆</button>
      </div>
    </div>
  </article> 
}

function CalculatorView() { const [distance, setDistance] = useState(453), [consumption, setConsumption] = useState(28), [fuel, setFuel] = useState(46), [toll, setToll] = useState(1250), [extra, setExtra] = useState(3500), [freight, setFreight] = useState(28500); const fuelCost = distance * consumption / 100 * fuel; const total = fuelCost + toll + extra; const profit = freight - total; const margin = freight ? profit / freight * 100 : 0; const money = (n: number) => `₺${Math.round(n).toLocaleString("tr-TR")}`; return <TabView title="Sefer Hesapla" description="Maliyetlerinizi görün, teklifinizi kârlı ve güvenli şekilde oluşturun."><div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div className="rounded-xl border border-[#e4e9ef] bg-white p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-[#eef4f8] text-[#315d83]"><Calculator /></div><div><h2 className="font-bold">Sefer bilgileri</h2><p className="text-xs text-[#8da0b2]">Değerleri değiştirdikçe sonuçlar güncellenir.</p></div></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Nereden" placeholder="İstanbul" /><Field label="Nereye" placeholder="Ankara" /><NumberField label="Mesafe (km)" value={distance} setValue={setDistance} /><NumberField label="Araç tüketimi (Lt/100 km)" value={consumption} setValue={setConsumption} /><NumberField label="Yakıt litre fiyatı (TL)" value={fuel} setValue={setFuel} /><NumberField label="Otoyol & köprü gideri (TL)" value={toll} setValue={setToll} /><NumberField label="Şoför & ekstra giderler (TL)" value={extra} setValue={setExtra} /><NumberField label="Alınan / teklif edilen navlun (TL)" value={freight} setValue={setFreight} /></div></div><div className="rounded-xl bg-[#122c4a] p-6 text-white sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Anlık hesaplama</p><h2 className="mt-2 text-xl font-bold">Sefer özeti</h2><div className="mt-7 grid gap-5"><Result label="Toplam maliyet" value={money(total)} /><Result label="Km başına maliyet" value={money(distance ? total / distance : 0)} /><div className="border-t border-white/15 pt-5"><div className="flex items-end justify-between"><div><p className="text-xs text-white/55">Net kâr</p><p className={cn("mt-1 text-3xl font-bold", profit >= 0 ? "text-[#8bd3a5]" : "text-[#ffab97]")}>{money(profit)}</p></div><Badge className={cn("text-xs", profit >= 0 ? "bg-[#285a4b] text-[#b8f0cb]" : "bg-[#6c312a] text-[#ffd0c7]")}>{margin.toFixed(1)}% marj</Badge></div></div></div></div></div></TabView> }
function NumberField({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) { return <label className="grid gap-2 text-sm font-medium">{label}<Input type="number" min="0" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} className="h-10" /></label> }
function Field({ label, placeholder }: { label: string; placeholder: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<Input placeholder={placeholder} className="h-10" /></label> }
function Result({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-sm text-white/65">{label}</span><span className="text-lg font-bold">{value}</span></div> }

const trips = [{ id: "YG-4821", route: "İstanbul → Ankara", vehicle: "13.60 Tenteli", status: "Yolda", date: "13 Eyl 2026", company: "Aksoy Lojistik" }, { id: "YG-4817", route: "Bursa → İzmir", vehicle: "Kamyon", status: "Bekliyor", date: "12 Eyl 2026", company: "Marmara Nakliyat" }, { id: "YG-4798", route: "Antalya → İstanbul", vehicle: "Frigo", status: "Tamamlandı", date: "10 Eyl 2026", company: "Soğuk Zincir A.Ş." }]
const companies = [{ initials: "AL", name: "Aksoy Lojistik", detail: "İstanbul · 48 araç", color: "bg-[#d64526]", rating: "4.9" }, { initials: "MN", name: "Marmara Nakliyat", detail: "Bursa · 32 araç", color: "bg-[#315d83]", rating: "4.8" }, { initials: "SZ", name: "Soğuk Zincir A.Ş.", detail: "Antalya · 27 araç", color: "bg-[#3b8068]", rating: "4.9" }, { initials: "ET", name: "Ege Taşımacılık", detail: "Manisa · 19 araç", color: "bg-[#806c41]", rating: "4.7" }]
function TripsView() { return <TabView title="Seferlerim" description="Aktif ve geçmiş taşıma seferlerinizi tek yerden takip edin."><div className="grid gap-0 overflow-hidden rounded-xl border border-[#e4e9ef] bg-white md:grid-cols-3">{trips.map((trip) => <div key={trip.id} className="border-b border-[#edf0f3] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold text-[#8da0b2]">{trip.id}</span><Badge>{trip.status}</Badge></div><div className="mb-4 text-base font-bold">{trip.route}</div><div className="flex items-center justify-between text-xs text-[#718397]"><span>{trip.vehicle}</span><span>{trip.date}</span></div><div className="mt-4 border-t border-[#edf0f3] pt-3 text-xs font-medium">{trip.company}</div></div>)}</div></TabView> }
function CompaniesView() { return <TabView title="Firmalar" description="Yük ağı içindeki güvenilir nakliye ve lojistik firmalarını keşfedin."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{companies.map((company) => <article key={company.name} className="rounded-xl border border-[#e4e9ef] bg-white p-5"><div className="mb-5 flex items-start justify-between"><div className={cn("grid size-11 place-items-center rounded-xl text-sm font-bold text-white", company.color)}>{company.initials}</div><span className="text-sm font-semibold text-[#806c41]">★ {company.rating}</span></div><h2 className="font-bold">{company.name}</h2><p className="mt-1 text-xs text-[#8da0b2]">{company.detail}</p><button type="button" className="mt-5 w-full cursor-pointer rounded-lg border border-[#dbe3ea] py-2 text-sm font-semibold text-[#315d83] hover:bg-[#f5f7fa]">Profili görüntüle</button></article>)}</div></TabView> }
function CompanyProfileView() { return <TabView title="Şirket Profili" description="Şirket bilgilerinizi ve hesap ayarlarınızı yönetin."><div className="max-w-3xl rounded-xl border border-[#e4e9ef] bg-white p-5 sm:p-7"><div className="mb-6 flex items-center gap-4"><div className="grid size-14 place-items-center rounded-xl bg-[#d64526] text-lg font-bold text-white">AL</div><div><h2 className="font-bold">Aksoy Lojistik</h2><p className="text-sm text-[#8da0b2]">Kurumsal hesap</p></div></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Şirket adı" placeholder="Aksoy Lojistik" /><Field label="Vergi numarası" placeholder="1234567890" /><Field label="E-posta" placeholder="iletisim@aksoylojistik.com" /><Field label="Telefon" placeholder="+90 212 555 01 24" /></div><div className="mt-6 flex justify-end"><button type="button" className="cursor-pointer rounded-lg bg-[#d64526] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b93820]">Değişiklikleri kaydet</button></div></div></TabView> }
function TabView({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <div><div className="mb-8"><p className="mb-2 text-sm font-medium text-[#d64526]">YükleGel çalışma alanı</p><h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">{title}</h1><p className="mt-2 text-sm text-[#718397]">{description}</p></div>{children}</div> }
function NavItem({ icon: Icon, label, active, collapsed, badge, onClick }: { icon: typeof LayoutDashboard; label: string; active?: boolean; collapsed: boolean; badge?: string; onClick?: () => void }) { return <button type="button" onClick={onClick} className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white", active && "bg-white/12 text-white", collapsed && "justify-center")} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined}><Icon />{!collapsed && <><span>{label}</span>{badge && <span className="ml-auto rounded-full bg-[#d64526] px-2 py-0.5 text-[10px] text-white">{badge}</span>}</>}</button> }
