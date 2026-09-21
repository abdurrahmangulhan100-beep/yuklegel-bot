"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
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
import FavoritesView from "@/components/views/FavoritesView"
import { CompanyProfileView } from "@/components/views/CompanyProfileView"
import { OverviewView } from "@/components/views/OverviewView"
import { FinanceView } from "@/components/views/FinanceView"
import { HelpCenterView } from "@/components/views/HelpCenterView"
import { CreateListingModal } from "@/components/CreateListingModal"
import { Sidebar } from "@/components/Sidebar"

interface DatabaseListing {
  id: string | number
  user_id?: string
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
  is_bot?: boolean
  profiles?: {
    company_name?: string
    phone?: string
    authorized_person?: string
  } | {
    company_name?: string
    phone?: string
    authorized_person?: string
  }[] | null
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
  if (!text) return ""
  const match = text.match(/(0?5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/)
  return match ? match[0].replace(/\s+/g, "") : ""
}

export default function Page() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loads, setLoads] = useState<Load[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState("Tümü")
  const [sourceFilter, setSourceFilter] = useState<"all" | "user" | "bot">("all")
  
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const queryRef = useRef("")

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Genel Bakış")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [profile, setProfile] = useState({
    company_name: "Nakliye Cepte Kullanıcısı",
    authorized_person: "Kullanıcı",
    initials: "NK"
  })

  // Arama için 500ms gecikme (Veritabanını yormamak için)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      queryRef.current = query
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const fetchUserFavorites = async (userId: string) => {
    if (!supabase || !userId) return
    try {
      const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", userId)
      if (!error && data) setFavoriteIds(data.map((f) => String(f.listing_id)))
    } catch (e) {
      console.error("Favoriler yüklenirken hata:", e)
    }
  }

  useEffect(() => {
    if (currentUserId) fetchUserFavorites(currentUserId)
    else setFavoriteIds([])
  }, [currentUserId])

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
    if (currentUserId) fetchUserFavorites(currentUserId)
  }

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null

    const verifySession = async () => {
      try {
        const isGuest = typeof window !== 'undefined' ? localStorage.getItem("is_guest") === "true" : false
        if (isGuest) {
          setProfile({ company_name: "Misafir Şirket", authorized_person: "Misafir Kullanıcı", initials: "MK" })
          setIsCheckingAuth(false)
          return
        }
        if (!supabase) { setIsCheckingAuth(false); return }
        
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) router.push("/login")
        else { setCurrentUserId(session.user.id); setIsCheckingAuth(false) }
      } catch (err) {
        console.error("Oturum doğrulama hatası:", err)
        router.push("/login")
      }
    }

    verifySession()

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const isGuest = typeof window !== 'undefined' ? localStorage.getItem("is_guest") === "true" : false
        if (session) setCurrentUserId(session.user.id)
        else setCurrentUserId(null)
        if (!session && !isGuest && event === "SIGNED_OUT") router.push("/login")
      })
      authSubscription = data.subscription
    }
    return () => { if (authSubscription) authSubscription.unsubscribe() }
  }, [router])

  const fetchProfile = async () => {
    if (!supabase) return
    try {
      const isGuest = localStorage.getItem("is_guest") === "true"
      if (isGuest) return
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return
      
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (data && !error) {
        const cName = data.company_name || "Nakliye Cepte Kullanıcısı"
        const aPerson = data.authorized_person || user.email?.split("@")[0] || "Kullanıcı"
        const initials = aPerson.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
        setProfile({ company_name: cName, authorized_person: aPerson, initials: initials || "NK" })
      }
    } catch (err) {
      console.error("Profil çekme hatası:", err)
    }
  }

  // TÜM SUPABASE'DE TÜRKÇE DUYARLI SERVER-SIDE ARAMA
  const fetchListings = useCallback(async (searchStr = "") => {
    setIsLoading(true)
    try {
      if (!supabase) return

      let userReq = supabase.from("listings").select("*")
      let botReq = supabase.from("bot_listings").select("*")

      // Eğer arama kelimesi varsa, veritabanına tüm varyasyonları gönderiyoruz
      if (searchStr.trim()) {
        const s = searchStr.trim()
        // Türkçe karakter sorununu aşmak için kelimenin farklı varyasyonlarını üretiyoruz
        const sLower = s.toLocaleLowerCase('tr-TR')
        const sUpper = s.toLocaleUpperCase('tr-TR')
        const sCap = s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR')

        const qOrig = `%${s}%`
        const qLow = `%${sLower}%`
        const qUp = `%${sUpper}%`
        const qCap = `%${sCap}%`

        const uFields = ['from_city', 'to_city', 'cargo_detail', 'company_name', 'message']
        const bFields = ['from_city', 'to_city', 'cargo_detail', 'company_name']

        // Her bir sütun için ILGIN, ılgın, Ilgın aramalarını Supabase'e .or() ile yaptırıyoruz
        const buildOr = (fields: string[]) => {
          return fields.map(f => `${f}.ilike.${qOrig},${f}.ilike.${qLow},${f}.ilike.${qUp},${f}.ilike.${qCap}`).join(',')
        }

        userReq = userReq.or(buildOr(uFields))
        botReq = botReq.or(buildOr(bFields))
      }

      // Arama filtresi uygulandıktan SONRA arayüz kasmaması için limiti 500 olarak belirliyoruz
      // Bu limit veritabanında arama yapılmasını engellemez, sadece eşleşen İLK 500 sonucu getirir.
      const finalUserReq = userReq.order("created_at", { ascending: false }).limit(250)
      const finalBotReq = botReq.order("created_at", { ascending: false }).limit(500)

      const [{ data: userData, error: userErr }, { data: botData, error: botErr }] = await Promise.all([finalUserReq, finalBotReq])

      if (userErr) console.error("User listings hatası:", userErr)
      if (botErr) console.error("Bot listings hatası:", botErr)

      const formattedUserLoads: Load[] = (userData || []).map((item: DatabaseListing) => {
        const profileObj = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        const companyName = cleanText(item.company_name || profileObj?.company_name || profileObj?.authorized_person || "Nakliye Cepte Kullanıcısı")
        const initials = companyName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "NK"

        return {
          id: `user-${item.id}`,
          userId: item.user_id,
          company: companyName,
          initials: initials,
          from: cleanText(item.from_city),
          to: cleanText(item.to_city),
          cargo: cleanText(item.cargo_detail),
          message: cleanText(item.message),
          vehicle: cleanText(item.vehicle_type || "Damperli Tır"),
          distance: "450 km",
          price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
          urgent: Boolean(item.urgent),
          time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
          color: "bg-[#d64526]",
          source: "user",
          phone: item.phone || profileObj?.phone || "Belirtilmedi"
        }
      })

      const formattedBotLoads: Load[] = (botData || []).map((item: DatabaseListing) => {
        const rawDetail = cleanText(item.cargo_detail || "Saha İlanı")
        let rawCompany = cleanText(item.company_name || "Saha Lojistik Ağı")
        if (rawCompany.toLowerCase().includes("whatsapp")) rawCompany = "Saha Lojistik Ağı"
        
        return {
          id: `bot-${item.id}`,
          company: rawCompany,
          initials: "SL",
          from: cleanText(item.from_city),
          to: cleanText(item.to_city),
          cargo: rawDetail,
          message: "",
          vehicle: cleanText(item.vehicle_type || "TIR / Kamyon"),
          distance: "Belirtilmemiş",
          price: "",
          urgent: Boolean(item.urgent),
          time: item.created_at ? new Date(item.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Yeni",
          color: "bg-[#315d83]",
          source: "bot",
          phone: extractPhone(rawDetail) || item.phone || "Belirtilmedi"
        }
      })

      setLoads([...formattedUserLoads, ...formattedBotLoads])
    } catch (err) {
      console.error("Veri çekme hatası:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isCheckingAuth) return
    fetchListings(debouncedQuery)
  }, [isCheckingAuth, currentUserId, debouncedQuery, fetchListings])

  useEffect(() => {
    if (isCheckingAuth) return
    fetchProfile()

    if (!supabase) return
    
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => fetchListings(queryRef.current))
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_listings" }, () => fetchListings(queryRef.current))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        if (currentUserId) fetchUserFavorites(currentUserId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isCheckingAuth, currentUserId, fetchListings])

  // Ön yüzdeki çift filtrelemeyi kaldırdık. Arama tamamen arka planda yapılıyor.
  // Burada sadece "Tümü", "Acil", "Tır", "Kamyon" gibi sekme filtreleri çalışır.
  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : load.vehicle.toLowerCase().includes(activeFilter.toLowerCase()))
      const sourceMatch = sourceFilter === "all" || load.source === sourceFilter
      return filterMatch && sourceMatch
    })
  }, [loads, activeFilter, sourceFilter])

  const stats = useMemo(() => {
    const userLoads = loads.filter(l => l.source === "user")
    const botLoads = loads.filter(l => l.source === "bot")
    const uniqueRoutes = new Set(loads.filter(l => l.from && l.to && l.from !== "-" && l.to !== "-").map(l => `${l.from}-${l.to}`)).size

    return {
      activeTotal: loads.length,
      todayUserCount: userLoads.length,
      botCount: botLoads.length,
      pendingTrips: userLoads.length,
      activeRoutesCount: uniqueRoutes > 0 ? uniqueRoutes : 12
    }
  }, [loads])

  const handleLogout = async () => {
    try {
      localStorage.removeItem("favorite_loads")
      localStorage.removeItem("is_guest")
      if (supabase) await supabase.auth.signOut()
      setCurrentUserId(null)
      setFavoriteIds([])
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
        favoritesCount={favoriteIds.length}
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
                  if (e.target.value.trim().length > 0) setActiveTab("İlanlar")
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
          {(activeTab === "Genel Bakış" || activeTab === "overview") && (
            <OverviewView 
              loads={loads} 
              currentUserId={currentUserId}
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
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />
          )}
          {activeTab === "Favorilerim" && (
            <FavoritesView 
              loads={loads} 
              favoriteIds={favoriteIds} 
              onToggleFavorite={toggleFavorite} 
              searchQuery={query}
            />
          )}
          {activeTab === "Seferlerim" && <TripsView loads={loads} currentUserId={currentUserId} />}
          {activeTab === "Gelir Gider" && <FinanceView />}
          {activeTab === "Şirket Profili" && <CompanyProfileView onProfileUpdated={fetchProfile} />}
          {activeTab === "Sefer Hesapla" && <CalculatorView />}
          {activeTab === "Yardım Merkezi" && <HelpCenterView />}
        </main>
      </div>
      <CreateListingModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => {
          setIsCreateOpen(false)
          fetchListings(debouncedQuery)
        }} 
      />
    </div>
  )
}
