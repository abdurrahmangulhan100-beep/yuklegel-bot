"use client"

import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogIn, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn, timeAgo } from "@/lib/utils"
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
import { BottomNav } from "@/components/BottomNav"

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

const PAGE_SIZE = 60
const GUEST_BLOCKED_TABS = ["Favorilerim", "Seferlerim", "Gelir Gider", "Şirket Profili"]

// Emoji/sembolleri temizler; ₺, tire, üç nokta ve Türkçe karakterlere dokunmaz
const cleanText = (text?: string | null) => {
  if (!text) return "-"
  return text
    .replace(/[*_~`]/g, "")
    .replace(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u231A-\u23FF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uFE0F|\u200D/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// +90 / 0 / boşluk, tire, nokta, parantez içeren cep telefonlarını yakalar; "05xxxxxxxxx" döner
const extractPhone = (text?: string | null) => {
  if (!text) return ""
  const match = text.match(/(?:\+?90[\s.\-]*)?0?[\s.\-]*\(?5\d{2}\)?[\s.\-]*\d{3}[\s.\-]*\d{2}[\s.\-]*\d{2}/)
  if (!match) return ""
  const digits = match[0].replace(/\D/g, "")
  if (digits.length < 10) return ""
  return "0" + digits.slice(-10)
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
  const [isGuest, setIsGuest] = useState(false)
  const [totals, setTotals] = useState<{ user: number; bot: number; urgent: number } | null>(null)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [hasMore, setHasMore] = useState(false)
  const [blockedKeys, setBlockedKeys] = useState<string[]>([])
  const hasLoadedRef = useRef(false)
  const reqIdRef = useRef(0)
  const pageSizeRef = useRef(PAGE_SIZE)
  const currentUserIdRef = useRef<string | null>(null)

  const [profile, setProfile] = useState({
    company_name: "Nakliye Cepte Kullanıcısı",
    authorized_person: "Kullanıcı",
    initials: "NK"
  })

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
          setIsGuest(true)
          setProfile({ company_name: "Giriş yapılmadı", authorized_person: "Misafir", initials: "M" })
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
        const cName = data.company_name || data.authorized_person || "Nakliye Cepte Kullanıcısı"
        const aPerson = data.authorized_person || user.email?.split("@")[0] || "Kullanıcı"
        const initials = aPerson.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
        setProfile({ company_name: cName, authorized_person: aPerson, initials: initials || "NK" })
      }
    } catch (err) {
      console.error("Profil çekme hatası:", err)
    }
  }

  const fetchCounts = useCallback(async () => {
    if (!supabase) return
    try {
      const head = { count: "exact" as const, head: true }
      const [u, b, uu, bu] = await Promise.all([
        supabase.from("listings").select("id", head),
        supabase.from("bot_listings").select("id", head),
        supabase.from("listings").select("id", head).eq("urgent", true),
        supabase.from("bot_listings").select("id", head).eq("urgent", true),
      ])
      setTotals({ user: u.count ?? 0, bot: b.count ?? 0, urgent: (uu.count ?? 0) + (bu.count ?? 0) })
    } catch (e) {
      console.error("Sayaçlar alınamadı:", e)
    }
  }, [])

  const fetchListings = useCallback(async (searchStr = "", size = PAGE_SIZE) => {
    const reqId = ++reqIdRef.current
    if (!hasLoadedRef.current) setIsLoading(true)
    try {
      if (!supabase) return

      let userReq = supabase.from("listings").select("*")
      let botReq = supabase.from("bot_listings").select("*")

      // PostgREST filtre sözdizimini bozan karakterleri temizle
      const s = searchStr.replace(/[,()\\"%_*:]/g, " ").replace(/\s+/g, " ").trim()

      if (s) {
        const sLower = s.toLocaleLowerCase('tr-TR')
        const sUpper = s.toLocaleUpperCase('tr-TR')
        const sCap = s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR')

        const qOrig = `%${s}%`
        const qLow = `%${sLower}%`
        const qUp = `%${sUpper}%`
        const qCap = `%${sCap}%`

        const uFields = ['from_city', 'to_city', 'cargo_detail', 'company_name', 'message']
        const bFields = ['from_city', 'to_city', 'cargo_detail', 'company_name']

        const buildOr = (fields: string[]) => {
          return fields.map(f => `${f}.ilike.${qOrig},${f}.ilike.${qLow},${f}.ilike.${qUp},${f}.ilike.${qCap}`).join(',')
        }

        userReq = userReq.or(buildOr(uFields))
        botReq = botReq.or(buildOr(bFields))
      }

      // Kullanıcının kendi ilanları sayfalamadan bağımsız olarak her zaman gelsin
      const myId = currentUserIdRef.current
      const myReq: PromiseLike<{ data: any[] | null }> = (!s && myId)
        ? supabase.from("listings").select("*").eq("user_id", myId).order("created_at", { ascending: false }).limit(200)
        : Promise.resolve({ data: [] })

      const [userRes, botRes, myRes] = await Promise.all([
        userReq.order("created_at", { ascending: false }).limit(size),
        botReq.order("created_at", { ascending: false }).limit(size),
        myReq,
      ])

      if (reqId !== reqIdRef.current) return // daha yeni bir istek başlamış, bu sonucu at

      if (userRes.error) console.error("User listings hatası:", userRes.error)
      if (botRes.error) console.error("Bot listings hatası:", botRes.error)

      const userRows: DatabaseListing[] = [...(userRes.data || [])]
      const seen = new Set(userRows.map((r) => String(r.id)))
      for (const r of (myRes.data || [])) {
        if (!seen.has(String(r.id))) userRows.push(r)
      }

      const formattedUserLoads: Load[] = userRows.map((item: DatabaseListing) => {
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
          price: typeof item.price === "number" ? `₺${item.price.toLocaleString("tr-TR")}` : (item.price || "₺0"),
          urgent: Boolean(item.urgent),
          time: timeAgo(item.created_at),
          createdAt: item.created_at,
          color: "bg-[#d64526]",
          source: "user",
          phone: item.phone || profileObj?.phone || "Belirtilmedi"
        }
      })

      const formattedBotLoads: Load[] = (botRes.data || []).map((item: DatabaseListing) => {
        const rawDetail = cleanText(item.cargo_detail || "Saha İlanı")
        let rawCompany = cleanText(item.company_name || "Nakliye Ağı")
        if (rawCompany.toLowerCase().includes("whatsapp")) rawCompany = "Nakliye Ağı"

        return {
          id: `bot-${item.id}`,
          company: rawCompany,
          initials: "NA",
          from: cleanText(item.from_city),
          to: cleanText(item.to_city),
          cargo: rawDetail,
          message: "",
          vehicle: cleanText(item.vehicle_type || "TIR / Kamyon"),
          price: "",
          urgent: Boolean(item.urgent),
          time: timeAgo(item.created_at),
          createdAt: item.created_at,
          color: "bg-[#315d83]",
          source: "bot",
          phone: extractPhone(rawDetail) || item.phone || "Belirtilmedi"
        }
      })

      const merged = [...formattedUserLoads, ...formattedBotLoads].sort(
        (a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0)
      )
      setLoads(merged)
      setHasMore((userRes.data?.length ?? 0) >= size || (botRes.data?.length ?? 0) >= size)
    } catch (err) {
      console.error("Veri çekme hatası:", err)
    } finally {
      if (reqId === reqIdRef.current) {
        hasLoadedRef.current = true
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => { setPageSize(PAGE_SIZE) }, [debouncedQuery])
  useEffect(() => { pageSizeRef.current = pageSize }, [pageSize])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])

  useEffect(() => {
    try {
      setBlockedKeys(JSON.parse(localStorage.getItem("blocked_users") || "[]"))
    } catch {
      setBlockedKeys([])
    }
  }, [])

  const handleUserBlocked = useCallback((key: string) => {
    setBlockedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  useEffect(() => {
    if (isCheckingAuth) return
    fetchListings(debouncedQuery, pageSize)
  }, [isCheckingAuth, currentUserId, debouncedQuery, pageSize, fetchListings])

  useEffect(() => {
    if (isCheckingAuth) return
    fetchCounts()
  }, [isCheckingAuth, fetchCounts])

  useEffect(() => {
    if (isCheckingAuth) return
    fetchProfile()

    if (!supabase) return

    // Bot toplu kayıt eklediğinde her satırda yeniden çekmemek için olayları birleştir
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fetchListings(queryRef.current, pageSizeRef.current)
        fetchCounts()
      }, 1500)
    }

    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_listings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        if (currentUserId) fetchUserFavorites(currentUserId)
      })
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [isCheckingAuth, currentUserId, fetchListings, fetchCounts])

  // Engellenen kullanıcı / telefonlara ait ilanları her yerden gizle
  const visibleLoads = useMemo(() => {
    if (blockedKeys.length === 0) return loads
    return loads.filter((l) => {
      if (l.userId && blockedKeys.includes(l.userId)) return false
      if (l.phone && l.phone !== "Belirtilmedi" && blockedKeys.includes(l.phone)) return false
      return true
    })
  }, [loads, blockedKeys])

  const filteredLoads = useMemo(() => {
    return visibleLoads.filter((load) => {
      const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : load.vehicle.toLowerCase().includes(activeFilter.toLowerCase()))
      const sourceMatch = sourceFilter === "all" || load.source === sourceFilter
      return filterMatch && sourceMatch
    })
  }, [visibleLoads, activeFilter, sourceFilter])

  const totalActive = totals ? totals.user + totals.bot : visibleLoads.length

  const stats = useMemo(() => {
    const uniqueRoutes = new Set(visibleLoads.filter(l => l.from && l.to && l.from !== "-" && l.to !== "-").map(l => `${l.from}-${l.to}`)).size
    return {
      activeTotal: totals ? totals.user + totals.bot : visibleLoads.length,
      todayUserCount: totals ? totals.user : visibleLoads.filter(l => l.source === "user").length,
      botCount: totals ? totals.bot : visibleLoads.filter(l => l.source === "bot").length,
      pendingTrips: visibleLoads.filter(l => l.source === "user" && l.userId === currentUserId).length,
      activeRoutesCount: uniqueRoutes
    }
  }, [visibleLoads, totals, currentUserId])

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

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [activeTab])

  const openUrgent = () => {
    setActiveFilter("Acil")
    setSourceFilter("all")
    setActiveTab("İlanlar")
  }

  const effectiveTab = isGuest && GUEST_BLOCKED_TABS.includes(activeTab) ? "__guest" : activeTab

  if (isCheckingAuth) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#122c4a] to-[#0b1d33] text-white">
        <div className="grid size-16 animate-pulse place-items-center rounded-3xl bg-gradient-to-br from-[#e5522f] to-[#c13a1c] text-3xl font-bold shadow-xl">N</div>
        <div className="text-center">
          <div className="text-lg font-bold tracking-tight">Nakliye Cepte</div>
          <div className="mt-1 text-xs text-white/60">Oturum kontrol ediliyor...</div>
        </div>
      </div>
    )
  }

  const urgentTotal = totals ? totals.urgent : 0

  return (
    <div className="min-h-dvh bg-[#f5f7fa] text-[#122c4a]">
      {isSidebarOpen && (
        <button 
          aria-label="Menüyü kapat" 
          className="animate-fade fixed inset-0 z-[45] bg-[#0b1d33]/50 backdrop-blur-[2px] lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        loadsCount={totalActive} 
        favoritesCount={favoriteIds.length}
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        isGuest={isGuest}
        profile={profile}
      />

      <div className={cn("min-h-dvh transition-[padding] duration-200 lg:pl-[272px]", isCollapsed && "lg:pl-[78px]")}>
        <header className="sticky top-0 z-30 border-b border-[#e4e9ef] bg-[#f5f7fa]/90 pt-safe backdrop-blur-xl">
          <div className="flex flex-col gap-2.5 px-4 pb-3 pt-3 sm:px-8 lg:h-[76px] lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
            {/* Mobil: marka + aksiyonlar */}
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <button onClick={() => setActiveTab("Genel Bakış")} className="flex items-center gap-2.5" aria-label="Ana sayfa">
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#e5522f] to-[#c13a1c] text-base font-bold text-white shadow-sm">N</span>
                <span className="text-[17px] font-bold tracking-tight">Nakliye Cepte</span>
              </button>
              <div className="flex items-center gap-1.5">
                <UrgentButton count={urgentTotal} onClick={openUrgent} />
                {isGuest ? (
                  <button
                    onClick={handleLogout}
                    className="flex h-10 items-center gap-1.5 rounded-full bg-[#122c4a] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#1a3d68]"
                  >
                    <LogIn className="size-4" />
                    Giriş
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("Şirket Profili")}
                    aria-label="Profilim"
                    className="grid size-10 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83] transition-colors hover:bg-[#cddfee]"
                  >
                    {profile.initials}
                  </button>
                )}
              </div>
            </div>

            {/* Arama */}
            <div className="relative w-full lg:w-[380px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#8da0b2]" />
              <Input 
                value={query} 
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value.trim().length > 0) setActiveTab("İlanlar")
                }} 
                placeholder="Şehir, firma veya yük ara..." 
                enterKeyHint="search"
                className="h-11 w-full rounded-xl border-[#e0e6ed] bg-white pl-10 pr-10 text-base shadow-[0_1px_2px_rgba(18,44,74,0.04)] md:text-sm" 
              />
              {query && (
                <button
                  type="button"
                  aria-label="Aramayı temizle"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-[#eef2f6] text-[#627d98] hover:bg-[#e2e8ef]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Masaüstü: aksiyonlar */}
            <div className="hidden items-center gap-3 lg:flex">
              <UrgentButton count={urgentTotal} onClick={openUrgent} />
              <button onClick={() => setActiveTab("Şirket Profili")} className="flex items-center gap-2.5 rounded-xl p-1.5 pr-3 transition-colors hover:bg-white">
                <div className="grid size-9 place-items-center rounded-full bg-[#dbe8f2] text-sm font-bold text-[#315d83]">{profile.initials}</div>
                <div className="text-left">
                  <div className="text-sm font-semibold leading-tight">{profile.authorized_person}</div>
                  <div className="text-xs text-[#8da0b2]">{profile.company_name}</div>
                </div>
              </button>
              {isGuest && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-[#122c4a] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a3d68]"
                  title="Giriş Yap / Kayıt Ol"
                >
                  <LogIn className="size-4" />
                  Giriş Yap
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pt-6 lg:pb-10 lg:pt-8">
          {effectiveTab === "__guest" && <GuestGate onLogin={handleLogout} />}
          {(effectiveTab === "Genel Bakış" || effectiveTab === "overview") && (
            <OverviewView 
              loads={visibleLoads} 
              totalCount={totalActive}
              urgentCount={totals ? totals.urgent : undefined}
              currentUserId={currentUserId}
              userName={isGuest ? undefined : profile.authorized_person}
              onOpenCreate={() => setIsCreateOpen(true)} 
              setActiveTab={setActiveTab} 
            />
          )}
          {effectiveTab === "İlanlar" && (
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
              onUserBlocked={handleUserBlocked}
              hasMore={hasMore}
              onLoadMore={() => setPageSize((p) => p + PAGE_SIZE)}
            />
          )}
          {effectiveTab === "Favorilerim" && (
            <FavoritesView 
              loads={visibleLoads} 
              favoriteIds={favoriteIds} 
              onToggleFavorite={toggleFavorite} 
              onUserBlocked={handleUserBlocked}
              searchQuery={query}
            />
          )}
          {effectiveTab === "Seferlerim" && (
            <TripsView
              loads={visibleLoads}
              currentUserId={currentUserId}
              onChanged={() => {
                fetchListings(queryRef.current, pageSizeRef.current)
                fetchCounts()
              }}
            />
          )}
          {effectiveTab === "Gelir Gider" && <FinanceView />}
          {effectiveTab === "Şirket Profili" && <CompanyProfileView onProfileUpdated={fetchProfile} />}
          {effectiveTab === "Sefer Hesapla" && <CalculatorView />}
          {effectiveTab === "Yardım Merkezi" && <HelpCenterView />}
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenMenu={() => setIsSidebarOpen(true)}
        favoritesCount={favoriteIds.length}
      />

      <CreateListingModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => {
          setIsCreateOpen(false)
          setActiveTab("İlanlar")
          fetchListings(queryRef.current, pageSizeRef.current)
          fetchCounts()
        }} 
      />
    </div>
  )
}

function UrgentButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={count > 0 ? `${count} acil yük` : "Acil yükler"}
      title="Acil yükler"
      className="relative grid size-10 place-items-center rounded-full text-[#4a6178] transition-colors hover:bg-white"
    >
      <Bell className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full border-2 border-[#f5f7fa] bg-[#d64526] px-1 text-[9px] font-bold leading-[14px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

function GuestGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="animate-rise mx-auto mt-6 max-w-md rounded-3xl border border-[#e4e9ef] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#eef4f8] text-[#315d83]">
        <LogIn className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-[#122c4a]">Bu bölüm için giriş gerekiyor</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#627d98]">
        Favoriler, seferler, gelir-gider ve profil özellikleri için ücretsiz üye olabilir veya giriş yapabilirsiniz.
      </p>
      <button
        onClick={onLogin}
        className="mt-6 h-12 w-full rounded-xl bg-[#122c4a] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1a3d68]"
      >
        Giriş Yap / Kayıt Ol
      </button>
    </div>
  )
}
