"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, Menu, Search, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"
import { ListingsView } from "@/components/views/ListingsView"
import { TripsView } from "@/components/views/TripsView"
import { CalculatorView } from "@/components/views/CalculatorView"
import { CompaniesView } from "@/components/views/CompaniesView"
import { CompanyProfileView } from "@/components/views/CompanyProfileView"
import { OverviewView } from "@/components/views/OverviewView"
import { FinanceView } from "@/components/views/FinanceView"
import { CreateListingModal } from "@/components/CreateListingModal"
import { Sidebar } from "@/components/Sidebar"

interface DatabaseListing {
  id: string | number
  company_name?: string
  from_city?: string
  to_city?: string
  cargo_detail?: string
  message?: string
  text?: string
  vehicle_type?: string
  price?: number | string
  urgent?: boolean
  created_at?: string
  phone?: string
}

const cleanText = (text?: string | null) => {
  if (!text) return "-"
  return text
    .replace(/[*_~`]/g, "")
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const extractPhone = (text?: string | null) => {
  if (!text) return "05551234567"
  const match = text.match(/(0?5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/)
  return match ? match[0].replace(/\s+/g, "") : "05551234567"
}

export default function Page() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loads, setLoads] = useState<Load[]>([])
  const [activeFilter, setActiveFilter] = useState("Tümü")
  const [sourceFilter, setSourceFilter] = useState<"all" | "user" | "bot">("all")
  const [query, setQuery] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const [profile, setProfile] = useState({
    company_name: "YükleGel Kullanıcısı",
    authorized_person: "Kullanıcı",
    initials: "MK"
  })

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null;

    const verifySession = async () => {
      try {
        const isGuest = typeof window !== 'undefined' ? localStorage.getItem("is_guest") === "true" : false
        
        if (isGuest) {
          setProfile({
            company_name: "Misafir Şirket",
            authorized_person: "Misafir Kullanıcı",
            initials: "MK"
          })
          setIsCheckingAuth(false)
          return
        }

        if (!supabase) {
          setIsCheckingAuth(false)
          return
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          router.push("/login")
        } else {
          setIsCheckingAuth(false)
        }
      } catch (err) {
        console.error("Oturum doğrulama hatası:", err)
        router.push("/login")
      }
    }

    verifySession()

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const isGuest = typeof window !== 'undefined' ? localStorage.getItem("is_guest") === "true" : false
        if (!session && !isGuest && event === "SIGNED_OUT") {
          router.push("/login")
        }
      })
      authSubscription = data.subscription
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [router])

  const fetchProfile = async () => {
    if (!supabase) return
    
    try {
      const isGuest = localStorage.getItem("is_guest") === "true"
      if (isGuest) {
        setProfile({
          company_name: "Misafir Şirket",
          authorized_person: "Misafir Kullanıcı",
          initials: "MK"
        })
        return
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (data && !error) {
        const cName = data.company_name || "YükleGel Kullanıcısı"
        const aPerson = data.authorized_person || user.email?.split("@")[0] || "Kullanıcı"
        const initials = aPerson.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
        
        setProfile({
          company_name: cName,
          authorized_person: aPerson,
          initials: initials || "UK"
        })
      } else {
        const defaultName = user.email?.split("@")[0] || "Kullanıcı"
        setProfile({
          company_name: "YükleGel Kullanıcısı",
          authorized_person: defaultName,
          initials: defaultName.substring(0, 2).toUpperCase()
        })
      }
    } catch (err) {
      console.error("Profil çekme hatası:", err)
    }
  }

  const fetchListings = async () => {
    setIsLoading(true)
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

      const userReq = supabase 
        ? supabase
            .from("listings")
            .select("*")
            .gte("created_at", twelveHoursAgo)
            .order("created_at", { ascending: false }) 
        : Promise.resolve({ data: [] })

      const botReq = supabase 
        ? supabase
            .from("bot_listings")
            .select("*")
            .gte("created_at", twelveHoursAgo)
            .order("created_at", { ascending: false }) 
        : Promise.resolve({ data: [] })

      const [{ data: userData }, { data: botData }] = await Promise.all([userReq, botReq])

      const formattedUserLoads: Load[] = (userData || []).map((item: DatabaseListing) => ({
        id: `user-${item.id}`,
        company: item.company_name || "İsimsiz Firma",
        initials: (item.company_name || "İF").substring(0, 2).toUpperCase(),
        from: cleanText(item.from_city),
        to: cleanText(item.to_city),
        cargo: cleanText(item.cargo_detail),
        message: cleanText(item.message), // Özel açıklama metni eklendi
        vehicle: cleanText(item.vehicle_type || "13.60 Tenteli"),
        distance: "450 km",
        price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
        urgent: Boolean(item.urgent),
        time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
        color: "bg-[#d64526]",
        source: "user",
        phone: item.phone || "05551234567"
      }))

      const formattedBotLoads: Load[] = (botData || []).map((item: DatabaseListing) => {
        const rawDetail = cleanText(item.cargo_detail || item.message || item.text || "WhatsApp İlanı")
        const rawCompany = cleanText(item.company_name || "WhatsApp Lojistik Akışı")
        const rawVehicle = cleanText(item.vehicle_type || "TIR / Kamyon")
        const extractedPhone = extractPhone(rawDetail)

        return {
          id: `bot-${item.id}`,
          company: rawCompany,
          initials: "WA",
          from: cleanText(item.from_city),
          to: cleanText(item.to_city),
          cargo: rawDetail,
          message: cleanText(item.message),
          vehicle: rawVehicle,
          distance: "Belirtilmemiş",
          price: "",
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

  useEffect(() => {
    if (isCheckingAuth) return
    
    fetchListings()
    fetchProfile()

    if (!supabase) return
    
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => fetchListings())
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_listings" }, () => fetchListings())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfile())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isCheckingAuth])

  const filteredLoads = useMemo(() => loads.filter((load) => {
    const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : load.vehicle.toLowerCase().includes(activeFilter.toLowerCase()))
    const sourceMatch = sourceFilter === "all" || load.source === sourceFilter
    const searchMatch = `${load.company} ${load.from} ${load.to} ${load.cargo} ${load.message || ''}`.toLowerCase().includes(query.toLowerCase())
    return filterMatch && sourceMatch && searchMatch
  }), [loads, activeFilter, sourceFilter, query])

  const stats = useMemo(() => {
    const userLoads = loads.filter(l => l.source === "user")
    const uniqueRoutes = new Set(loads.filter(l => l.from && l.to && l.from !== "-" && l.to !== "-").map(l => `${l.from}-${l.to}`)).size

    return {
      activeTotal: loads.length,
      todayUserCount: userLoads.length,
      pendingTrips: userLoads.length,
      activeRoutesCount: uniqueRoutes > 0 ? uniqueRoutes : 12
    }
  }, [loads])

  const handleLogout = async () => {
    try {
      localStorage.removeItem("is_guest")
      if (supabase) {
        await supabase.auth.signOut()
      }
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fa] text-[#122c4a] font-medium text-sm">
        Oturum kontrol ediliyor...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#122c4a]">
      {isSidebarOpen && (
        <button 
          aria-label="Menüyü kapat" 
          className="fixed inset-0 z-30 cursor-pointer bg-[#122c4a]/35 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        loadsCount={loads.length} 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />

      <div className={cn("min-h-screen transition-[padding] duration-200 lg:pl-[260px]", isCollapsed && "lg:pl-[76px]")}>
        <header className="sticky top-0 z-25 flex flex-col gap-3 border-b border-[#e4e9ef] bg-[#f5f7fa]/95 px-4 py-3 backdrop-blur-md sm:flex-row sm:h-[82px] sm:items-center sm:justify-between sm:py-0 sm:px-8">
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button 
              aria-label="Menüyü aç" 
              className="cursor-pointer rounded-lg p-2 hover:bg-white lg:hidden shrink-0" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu />
            </button>
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8da0b2]" />
              <Input 
                value={query} 
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value.trim().length > 0) {
                    setActiveTab("İlanlar")
                  }
                }} 
                placeholder="İlan, firma veya şehir ara..." 
                className="h-10 border-[#e0e6ed] bg-white pl-10 text-sm shadow-none w-full" 
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 sm:gap-5">
            <button aria-label="Bildirimler" className="relative cursor-pointer rounded-lg p-2 text-[#6d8194] hover:bg-white">
              <Bell />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-[#f5f7fa] bg-[#d64526]" />
            </button>
            <Separator orientation="vertical" className="hidden h-8 sm:block" />
            
            <button onClick={() => setActiveTab("Şirket Profili")} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-white">
              <div className="grid size-9 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83]">{profile.initials}</div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-semibold">{profile.authorized_person}</div>
                <div className="text-xs text-[#8da0b2]">{profile.company_name}</div>
              </div>
              <ChevronDown className="hidden text-[#8da0b2] sm:block" />
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] px-4 py-7 sm:px-8 sm:py-9">
          {activeTab === "overview" && (
            <OverviewView 
              loads={loads} 
              onOpenCreate={() => setIsCreateOpen(true)} 
              setActiveTab={setActiveTab} 
            />
          )}
          {activeTab === "İlanlar" && (
            <ListingsView 
              loads={filteredLoads} 
              stats={stats} 
              loading={isLoading} 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter} 
              sourceFilter={sourceFilter} 
              setSourceFilter={setSourceFilter} 
              setIsCreateOpen={setIsCreateOpen} 
              searchQuery={query}
            />
          )}
          {activeTab === "Seferlerim" && <TripsView loads={loads} />}
          {activeTab === "Gelir Gider" && <FinanceView />}
          {activeTab === "Firmalar" && <CompaniesView loads={loads} />}
          {activeTab === "Şirket Profili" && <CompanyProfileView onProfileUpdated={fetchProfile} />}
          {activeTab === "Sefer Hesapla" && <CalculatorView />}
        </main>
      </div>
      <CreateListingModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => {
          setIsCreateOpen(false)
          fetchListings()
        }} 
      />
    </div>
  )
}
