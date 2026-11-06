"use client"

import { toast } from "@/lib/toast"
import { realName } from "@/lib/names"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogIn, X, LayoutGrid } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Input } from "@/components/ui/input"
import { cn, timeAgo } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Load } from "@/components/LoadCard"
import { mapUserListing, mapBotListing, dedupeLoads, reuseLoads, type DatabaseListing } from "@/lib/listings"
import { isMissing, classifyListing } from "@/lib/route"
import { ListingsView } from "@/components/views/ListingsView"
import { TripsView } from "@/components/views/TripsView"
import { CalculatorView } from "@/components/views/CalculatorView"
import FavoritesView from "@/components/views/FavoritesView"
import { CompanyProfileView } from "@/components/views/CompanyProfileView"
import { OverviewView } from "@/components/views/OverviewView"
import { FinanceView } from "@/components/views/FinanceView"
import { HelpCenterView } from "@/components/views/HelpCenterView"
import { ToolsView } from "@/components/views/ToolsView"
import { CreateListingModal } from "@/components/CreateListingModal"
import { AppLauncher } from "@/components/AppLauncher"
import { BottomNav } from "@/components/BottomNav"
import { LogoMark } from "@/components/Logo"
import { PremiumView } from "@/components/views/PremiumView"
import { PremiumLock } from "@/components/PremiumLock"
import { usePremium } from "@/components/PremiumProvider"
import { AdSlot } from "@/components/AdSlot"
import { FREE_DELAY_MINUTES, FREE_LIMITS, OPEN_PREMIUM_EVENT } from "@/lib/premium"

const PAGE_SIZE = 60

// Saha (bot) ilanları bu günden eskiyse listelenmez; eski ilan yığılmasını ve yanlış yük aramasını önler
const BOT_MAX_AGE_DAYS = 14
// Ücretsiz kullanıcı: son FREE_DELAY_MINUTES dakikadaki ilanlar gizlenir. Premium'da null (filtre yok).
const delayCutoff = (premium: boolean) =>
  premium ? null : new Date(Date.now() - FREE_DELAY_MINUTES * 60000).toISOString()
const botCutoff = () => new Date(Date.now() - BOT_MAX_AGE_DAYS * 86400000).toISOString()

// Kategori seçilince filtre sunucuda da uygulanır: yalnızca en yeni 60 ilanın içinden değil, tüm aktif ilanlar arasından seçilsin
const CATEGORY_TERMS: Record<string, string[]> = {
  Acil: ["acil"],
  "Kırkayak": ["kırkayak"],
  Kamyon: ["kamyon", "teker"],
  Kamyonet: ["kamyonet", "panelvan", "panel van", "pikap", "pick up", "pickup"],
  Frigo: ["frigo", "termokin", "soğuk zincir"],
  Damperli: ["damper", "danper", "kısa dorse"],
  "13.60 Açık Dorse": ["açık", "düz"],
  "Kapalı Dorse": ["tır", "tenteli", "kapalı", "perdeli", "dorse"],
}
const trVariants = (t: string) => {
  const ascii = t.replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
  const out = new Set<string>()
  for (const x of [t, ascii]) {
    out.add(x)
    out.add(x.toLocaleLowerCase("tr-TR"))
    out.add(x.toLocaleUpperCase("tr-TR"))
    out.add(x.toUpperCase())
    out.add(x.charAt(0).toLocaleUpperCase("tr-TR") + x.slice(1))
  }
  return Array.from(out)
}
const categoryOr = (cat: string): { bot: string; user: string } | null => {
  const terms = CATEGORY_TERMS[cat]
  if (!terms) return null
  // "urgent" sütunu yalnızca kullanıcı ilanları (listings) tablosunda garanti: bot_listings'te sütun yoksa tüm sorgu hata verip
  // Acil filtresini boş döndürüyordu. Saha ilanlarında yalnızca metindeki "acil" aranır.
  const mk = (fields: string[], withUrgent = false) => [...(withUrgent && cat === "Acil" ? ["urgent.eq.true"] : []), ...fields.flatMap((f) => terms.flatMap((t) => trVariants(t).map((v) => `${f}.ilike.%${v}%`)))].join(",")
  // Kullanıcı ilanında araç tipi formdan seçilir ve metinde geçmeyebilir: vehicle_type sütunu da aranmalı
  return { bot: mk(["cargo_detail"]), user: mk(["cargo_detail", "message", "vehicle_type"], true) }
}

// Güzergâh şehri: şehir alanlarında ve ilan metninde geçen tüm yazım biçimleri, TÜM ilanlar arasında sunucuda aranır
const cityOr = (city: string): { bot: string; user: string } => {
  const mk = (fields: string[]) => fields.flatMap((f) => trVariants(city).map((v) => `${f}.ilike.%${v}%`)).join(",")
  return { bot: mk(["from_city", "to_city", "cargo_detail"]), user: mk(["from_city", "to_city", "cargo_detail", "message"]) }
}

// Araç filtresi: her ilan tek kategoriye girer (lib/route.ts classifyVehicle); kategoriler birbirine karışmaz
const FILTER_TO_CATEGORY: Record<string, string> = {
  "Kırkayak": "Kırkayak", Frigo: "Frigo", Damperli: "Damperli", Kamyon: "Kamyon", Kamyonet: "Kamyonet",
  "13.60 Açık Dorse": "Açık Dorse", "Kapalı Dorse": "Kapalı Dorse",
}
const matchesVehicle = (load: Load, filter: string) => {
  const want = FILTER_TO_CATEGORY[filter]
  if (!want) return true
  // Kullanıcı ilanında formdaki araç tipi esas, saha ilanında metin esas (lib/route.ts classifyListing)
  return classifyListing(load.vehicle, `${load.cargo} ${load.message ?? ""}`, load.source === "user") === want
}
const GUEST_BLOCKED_TABS = ["Favorilerim", "Seferlerim", "Gelir Gider", "Şirket Profili"]

export default function Page() {
  const router = useRouter()
  const { isPremium, loading: premiumLoading } = usePremium()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [loads, setLoads] = useState<Load[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [activeFilter, setActiveFilter] = useState("Tümü")
  const [route, setRoute] = useState({ from: "", to: "" }) // Nereden / Nereye: tüm ilanlar arasında sunucuda filtrelenir
  const [sourceFilter, setSourceFilter] = useState<"all" | "user" | "bot">("all")
  
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const queryRef = useRef("")

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Genel Bakış")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [totals, setTotals] = useState<{ user: number; bot: number; urgent: number } | null>(null)
  const [last24h, setLast24h] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [hasMore, setHasMore] = useState(false)
  const [lockedCount, setLockedCount] = useState(0) // ücretsiz kullanıcının henüz göremediği (son 10 dk) ilan sayısı
  const [blockedKeys, setBlockedKeys] = useState<string[]>([])
  const hasLoadedRef = useRef(false)
  const reqIdRef = useRef(0)
  const pageSizeRef = useRef(PAGE_SIZE)
  const activeFilterRef = useRef("Tümü")
  const routeRef = useRef({ from: "", to: "" })
  const currentUserIdRef = useRef<string | null>(null)
  const isPremiumRef = useRef(false) // premium doğrulanana kadar false: ücretsiz gibi (gecikmeli) davranır

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

  const fetchUserFavorites = useCallback(async (userId: string) => {
    if (!supabase || !userId) return
    try {
      const { data, error } = await supabase.from("favorites").select("listing_id").eq("user_id", userId)
      if (!error && data) setFavoriteIds(data.map((f) => String(f.listing_id)))
    } catch (e) {
      console.error("Favoriler yüklenirken hata:", e)
    }
  }, [])

  useEffect(() => {
    if (currentUserId) fetchUserFavorites(currentUserId)
    else setFavoriteIds([])
  }, [currentUserId, fetchUserFavorites])

  // Kararlı referans: LoadCard (memo) gereksiz yere yeniden çizilmesin
  const toggleFavorite = useCallback((id?: string) => {
    if (!id) return
    setFavoriteIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
    if (currentUserIdRef.current) fetchUserFavorites(currentUserIdRef.current)
  }, [fetchUserFavorites])

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
        if (event === "SIGNED_OUT") {
          try { localStorage.removeItem("blocked_users") } catch {}
          setBlockedKeys([])
        }
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
      
      let { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (!data && !error) {
        // İlk kez Google ile giren kullanıcı: profil satırı yoksa Google hesabındaki adla oluştur
        const meta = (user.user_metadata || {}) as { full_name?: string; name?: string }
        const fullName = meta.full_name || meta.name || ""
        const created = {
          id: user.id,
          email: user.email,
          company_name: fullName || "",
          authorized_person: fullName || user.email?.split("@")[0] || "Kullanıcı",
          updated_at: new Date().toISOString(),
        }
        const { error: upErr } = await supabase.from("profiles").upsert(created)
        if (!upErr) data = created as typeof data
      }
      if (data && !error) {
        const cName = realName(data.company_name) || data.authorized_person || "Nakliye Cepte Kullanıcısı"
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
      const cutoff = botCutoff()
      const dc = delayCutoff(isPremiumRef.current)
      const late = <T extends { lte: (c: string, v: string) => T }>(q: T) => (dc ? q.lte("created_at", dc) : q)
      const [u, b, uu, bu] = await Promise.all([
        // Kullanıcı ilanları tüm hesaplarda anında görünür.
        supabase.from("listings").select("id", head),
        late(supabase.from("bot_listings").select("id", head).gte("created_at", cutoff)),
        supabase.from("listings").select("id", head).eq("urgent", true),
        late(supabase.from("bot_listings").select("id", head).ilike("cargo_detail", "%acil%").gte("created_at", cutoff)),
      ])
      setTotals({ user: u.count ?? 0, bot: b.count ?? 0, urgent: (uu.count ?? 0) + (bu.count ?? 0) })

      // Son 24 saatte sisteme düşen gerçek ilan sayısı (yalnızca sayı döner; recent_listing_count zaten kurulu)
      // Önce silinen ilanları da sayan kalıcı sayaç (008_gunluk_sayac.sql); kurulu değilse eski yönteme düşer
      const { data: c24, error: ec24 } = await supabase.rpc("listings_last_24h")
      if (!ec24 && typeof c24 === "number") setLast24h(c24)
      else {
        const { data: d24, error: e24 } = await supabase.rpc("recent_listing_count", { p_since: new Date(Date.now() - 86400000).toISOString() })
        if (!e24 && typeof d24 === "number") setLast24h(d24)
      }

      // Ücretsiz plan: gecikme penceresindeki (henüz gösterilmeyen) ilan sayısı -> "Premium üyeler şu an görüyor" uyarısı
      if (dc) {
        const { data: n, error: rpcErr } = await supabase.rpc("recent_listing_count", { p_since: dc })
        setLockedCount(!rpcErr && typeof n === "number" ? n : 0)
      } else {
        setLockedCount(0)
      }
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
      let botReq = supabase.from("bot_listings").select("*").gte("created_at", botCutoff())

      // Kullanıcı ilanları tüm hesaplarda anında görünür.
      // Ücretsiz plan gecikmesi yalnızca bot/saha ilanlarına uygulanır.
      const dc = delayCutoff(isPremiumRef.current)
      if (dc) {
        botReq = botReq.lte("created_at", dc)
      }

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

        const uFields = ['from_city', 'to_city', 'cargo_detail', 'company_name', 'message', 'vehicle_type']
        const bFields = ['from_city', 'to_city', 'cargo_detail', 'company_name']

        const buildOr = (fields: string[]) => {
          return fields.map(f => `${f}.ilike.${qOrig},${f}.ilike.${qLow},${f}.ilike.${qUp},${f}.ilike.${qCap}`).join(',')
        }

        userReq = userReq.or(buildOr(uFields))
        botReq = botReq.or(buildOr(bFields))
      }

      // Kategori seçiliyse sunucuda da daralt ve daha geniş bir havuzdan çek
      const cat = activeFilterRef.current
      const catOr = cat !== "Tümü" ? categoryOr(cat) : null
      if (catOr) {
        userReq = userReq.or(catOr.user)
        botReq = botReq.or(catOr.bot)
      }
      // Nereden / Nereye: iki şehir de ilanda geçmeli (art arda .or = VE). Yön ayrımı listede yapılır.
      const { from: rFrom, to: rTo } = routeRef.current
      for (const city of [rFrom, rTo]) {
        if (!city) continue
        const c = cityOr(city)
        userReq = userReq.or(c.user)
        botReq = botReq.or(c.bot)
      }
      const effSize = catOr || rFrom || rTo ? size * 3 : size

      // Kullanıcının kendi ilanları sayfalamadan bağımsız olarak her zaman gelsin
      const myId = currentUserIdRef.current
      const myReq: PromiseLike<{ data: any[] | null }> = (!s && myId)
        ? supabase.from("listings").select("*").eq("user_id", myId).order("created_at", { ascending: false }).limit(200)
        : Promise.resolve({ data: [] })

      const [userRes, botRes, myRes] = await Promise.all([
        userReq.order("created_at", { ascending: false }).limit(effSize),
        botReq.order("created_at", { ascending: false }).limit(effSize),
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

      const formattedUserLoads: Load[] = userRows.map(mapUserListing)
      // Telefon numarası bulunamayan saha ilanı işe yaramaz (aranamaz); listeye hiç alınmaz
      const formattedBotLoads: Load[] = (botRes.data || [])
        .map((item: DatabaseListing) => mapBotListing(item))
        .filter((l: Load) => !isMissing(l.phone))

      // Acil ilanlar ilk 24 saat boyunca en üstte durur, sonrasında normal tarih sırasına döner
      const nowMs = Date.now()
      const isFreshUrgent = (l: Load) =>
        Boolean(l.urgent) && !!l.createdAt && nowMs - Date.parse(l.createdAt) < 24 * 60 * 60 * 1000
      const sorted = [...formattedUserLoads, ...formattedBotLoads].sort((a, b) => {
        const ua = isFreshUrgent(a) ? 1 : 0
        const ub = isFreshUrgent(b) ? 1 : 0
        if (ua !== ub) return ub - ua
        return (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0)
      })
      // Aynı saha ilanı tekrar tekrar paylaşıldıysa tek karta indir
      const merged = dedupeLoads(sorted)
      setLoads((prev) => reuseLoads(prev, merged))
      setHasMore((userRes.data?.length ?? 0) >= effSize || (botRes.data?.length ?? 0) >= effSize)
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
  const lastFilterRef = useRef("Tümü")
  useEffect(() => {
    activeFilterRef.current = activeFilter
    if (lastFilterRef.current === activeFilter) return
    lastFilterRef.current = activeFilter
    if (isCheckingAuth) return
    hasLoadedRef.current = false // kısa bir yükleniyor görünümü: boş sonuç ekranı yanıp sönmesin
    fetchListings(queryRef.current, pageSizeRef.current)
  }, [activeFilter, isCheckingAuth, fetchListings])
  const lastRouteRef = useRef("|")
  useEffect(() => {
    routeRef.current = route
    const key = `${route.from}|${route.to}`
    if (lastRouteRef.current === key) return
    lastRouteRef.current = key
    if (isCheckingAuth) return
    setPageSize(PAGE_SIZE)
    pageSizeRef.current = PAGE_SIZE
    hasLoadedRef.current = false
    fetchListings(queryRef.current, PAGE_SIZE)
  }, [route, isCheckingAuth, fetchListings])
  useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])
  useEffect(() => { isPremiumRef.current = isPremium }, [isPremium])

  // Premium durumu netleşince (ya da değişince) listeyi doğru kurala göre yeniden çek
  useEffect(() => {
    if (isCheckingAuth || premiumLoading) return
    fetchListings(queryRef.current, pageSizeRef.current)
    fetchCounts()
  }, [isPremium, premiumLoading, isCheckingAuth, fetchListings, fetchCounts])

  useEffect(() => {
    try {
      setBlockedKeys(JSON.parse(localStorage.getItem("blocked_users") || "[]"))
    } catch {
      setBlockedKeys([])
    }
  }, [])

  const handleUserBlocked = useCallback((key: string) => {
    setBlockedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    // Giriş yapmış kullanıcının engelleri hesabına kaydedilir (cihaz değişince / uygulama silinince kaybolmaz)
    const uid = currentUserIdRef.current
    if (uid && supabase) {
      supabase
        .from("blocked_users")
        .upsert({ user_id: uid, target: key }, { onConflict: "user_id,target" })
        .then(({ error }) => { if (error) console.error("Engelleme kaydedilemedi:", error.message) })
    }
  }, [])

  // Oturum açılınca hesaptaki engelleri çek, bu cihazdakilerle birleştir; sadece cihazda olanları hesaba yükle
  useEffect(() => {
    if (!currentUserId || !supabase) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase.from("blocked_users").select("target").eq("user_id", currentUserId)
        if (error || !data || cancelled) return
        const remote = data.map((r: { target: string }) => String(r.target))
        let local: string[] = []
        try { local = JSON.parse(localStorage.getItem("blocked_users") || "[]") } catch { local = [] }
        const merged = Array.from(new Set([...local, ...remote]))
        localStorage.setItem("blocked_users", JSON.stringify(merged))
        if (!cancelled) setBlockedKeys(merged)
        const missing = merged.filter((k) => !remote.includes(k))
        if (missing.length > 0) {
          await supabase
            .from("blocked_users")
            .upsert(missing.map((target) => ({ user_id: currentUserId, target })), { onConflict: "user_id,target" })
        }
      } catch (e) {
        console.error("Engellenenler senkronlanamadı:", e)
      }
    })()
    return () => { cancelled = true }
  }, [currentUserId])

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

    // Bot toplu kayıt eklediğinde her satırda yeniden çekmemek için olayları birleştir.
    // Supabase ücretsiz bant genişliğini korumak için: en az 20 sn aralık, sekme gizliyken hiç çekme
    // (sekmeye dönünce aşağıdaki "tick" zaten yeniler).
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastRun = 0
    const MIN_GAP_MS = 20_000
    const refresh = () => {
      if (timer) return // zaten planlı bir yenileme var: tüm olaylar onunla birleşir
      const wait = Math.max(2500, MIN_GAP_MS - (Date.now() - lastRun))
      timer = setTimeout(() => {
        timer = null
        if (document.visibilityState !== "visible") return
        lastRun = Date.now()
        fetchListings(queryRef.current, pageSizeRef.current)
        fetchCounts()
      }, wait)
    }

    let realtimeOk = false
    let pollSkips = 0
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bot_listings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => {
        if (currentUserId) fetchUserFavorites(currentUserId)
      })
      .subscribe((status) => { realtimeOk = status === "SUBSCRIBED" })

    // Realtime sessizce düşebilir ya da tabloda yayın kapalı olabilir. Yedek olarak: sekme açıkken
    // dakikada bir yenile; sekmeye dönünce / internet gelince hemen yenile (elle yenileme gerekmesin).
    const tick = () => {
      if (document.visibilityState !== "visible") return
      fetchListings(queryRef.current, pageSizeRef.current)
      fetchCounts()
    }
    // Realtime bağlıyken yedek yenileme 5 dakikada bir (her istek ~120 satır çeker; çok kullanıcıda Supabase ücretsiz
    // bant genişliğini hızla tüketir). Realtime düşerse eskisi gibi dakikada bir yenilenir.
    const poll = setInterval(() => {
      if (realtimeOk && ++pollSkips % 5 !== 0) return
      tick()
    }, 60000)
    document.addEventListener("visibilitychange", tick)
    window.addEventListener("online", tick)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(poll)
      document.removeEventListener("visibilitychange", tick)
      window.removeEventListener("online", tick)
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
      const filterMatch = activeFilter === "Tümü" || (activeFilter === "Acil" ? load.urgent : matchesVehicle(load, activeFilter))
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
      activeRoutesCount: uniqueRoutes,
      last24h: last24h ?? undefined,
    }
  }, [visibleLoads, totals, currentUserId, last24h])

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

  const handleCitySearch = useCallback((city: string) => {
    setQuery(city)
    setDebouncedQuery(city)
    queryRef.current = city
    setActiveFilter("Tümü")
    setSourceFilter("all")
    setActiveTab("İlanlar")
  }, [])

  // Premium sekmesini dışarıdan (reklam kartı, kilitli özellik) açma
  useEffect(() => {
    const open = () => { setActiveTab("Premium"); setIsSidebarOpen(false) }
    window.addEventListener(OPEN_PREMIUM_EVENT, open)
    return () => window.removeEventListener(OPEN_PREMIUM_EVENT, open)
  }, [])

  // Ücretsiz planda aynı anda en fazla N aktif ilan
  const requestCreate = () => {
    if (!isPremium && !isGuest && stats.pendingTrips >= FREE_LIMITS.activeListings) {
      toast(`Ücretsiz planda aynı anda en fazla ${FREE_LIMITS.activeListings} aktif ilanınız olabilir. Sınırsız ilan için Premium'a geçin.`)
      setActiveTab("Premium")
      return
    }
    setIsCreateOpen(true)
  }

  const effectiveTab = isGuest && GUEST_BLOCKED_TABS.includes(activeTab) ? "__guest" : activeTab

  if (isCheckingAuth) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#122c4a] to-[#0b1d33] text-white">
        <LogoMark size={96} className="animate-pulse drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]" />
        <div className="text-center">
          <div className="text-lg font-bold tracking-tight">Nakliye Cepte</div>
          <div className="mt-1 text-xs text-white/60">Oturum kontrol ediliyor...</div>
        </div>
      </div>
    )
  }

  const urgentTotal = totals ? totals.urgent : 0

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppLauncher
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loadsCount={totalActive}
        favoritesCount={favoriteIds.length}
        isGuest={isGuest}
        isPremium={isPremium}
        profile={profile}
        onLogout={handleLogout}
      />

      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl pt-safe">
          <div className="flex flex-col gap-2.5 px-4 pb-3 pt-3 sm:px-8 lg:h-[76px] lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
            {/* Mobil: marka + aksiyonlar */}
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <button onClick={() => setActiveTab("Genel Bakış")} className="flex items-center gap-2.5" aria-label="Ana sayfa">
                <LogoMark size={38} tile className="shrink-0 rounded-[10px] shadow-sm" />
                <span className="text-[17px] font-bold tracking-tight">Nakliye Cepte</span>
              </button>
              <div className="flex items-center gap-1.5">
                <ThemeToggle className="size-10" />
                <UrgentButton count={urgentTotal} onClick={openUrgent} />
                {isGuest ? (
                  <button
                    onClick={handleLogout}
                    className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
                  >
                    <LogIn className="size-4" />
                    Giriş
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab("Şirket Profili")}
                    aria-label="Profilim"
                    className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-foreground transition-colors hover:bg-muted"
                  >
                    {profile.initials}
                  </button>
                )}
              </div>
            </div>

            {/* Masaüstü: marka + üst gezinme (yan menü yerine) */}
            <div className="hidden items-center gap-1 lg:flex">
              <button onClick={() => setActiveTab("Genel Bakış")} className="mr-3 flex items-center gap-2.5" aria-label="Ana sayfa">
                <LogoMark size={40} tile className="shrink-0 rounded-[10px] shadow-sm" />
                <span className="text-[17px] font-bold tracking-tight">Nakliye Cepte</span>
              </button>
              {[
                { tab: "Genel Bakış", label: "Ana Sayfa" },
                { tab: "İlanlar", label: "İlanlar" },
                { tab: "Seferlerim", label: "Seferlerim" },
                { tab: "Gelir Gider", label: "Gelir & Gider" },
                { tab: "Sefer Hesapla", label: "Sefer Hesapla" },
              ].map((n) => {
                const on = n.tab === "Genel Bakış" ? (activeTab === "Genel Bakış" || activeTab === "overview") : activeTab === n.tab
                return (
                  <button
                    key={n.tab}
                    onClick={() => setActiveTab(n.tab)}
                    aria-current={on ? "page" : undefined}
                    className={cn("rounded-xl px-3 py-2 text-sm font-medium transition-colors", on ? "bg-brand/10 font-semibold text-brand" : "text-muted-foreground hover:bg-card hover:text-foreground")}
                  >
                    {n.label}
                  </button>
                )
              })}
              <button onClick={() => setIsSidebarOpen(true)} className="ml-1 flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand/40" aria-label="Tüm bölümler">
                <LayoutGrid className="size-4" /> Tümü
              </button>
            </div>

            {/* Arama */}
            <div className={cn("relative w-full lg:w-[200px] xl:w-[300px]", (effectiveTab === "Genel Bakış" || effectiveTab === "overview") && "hidden lg:block")}>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={query} 
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value.trim().length > 0) setActiveTab("İlanlar")
                }} 
                placeholder="Şehir, firma veya yük ara..." 
                enterKeyHint="search"
                className="h-11 w-full rounded-xl border-border bg-card pl-10 pr-10 text-base shadow-[0_1px_2px_rgba(18,44,74,0.04)] md:text-sm" 
              />
              {query && (
                <button
                  type="button"
                  aria-label="Aramayı temizle"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Masaüstü: aksiyonlar */}
            <div className="hidden items-center gap-3 lg:flex">
              <ThemeToggle />
              <UrgentButton count={urgentTotal} onClick={openUrgent} />
              <button onClick={() => setActiveTab("Şirket Profili")} className="flex items-center gap-2.5 rounded-xl p-1.5 pr-3 transition-colors hover:bg-card">
                <div className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold text-foreground">{profile.initials}</div>
                <div className="hidden text-left xl:block">
                  <div className="text-sm font-semibold leading-tight">{profile.authorized_person}</div>
                  <div className="text-xs text-muted-foreground">{profile.company_name}</div>
                </div>
              </button>
              {isGuest && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
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
              last24h={last24h ?? undefined}
              urgentCount={totals ? totals.urgent : undefined}
              currentUserId={currentUserId}
              userName={isGuest ? undefined : profile.authorized_person}
              onOpenCreate={requestCreate} 
              setActiveTab={setActiveTab} 
              onSelectCity={handleCitySearch}
              onOpenUrgent={openUrgent}
              onPickFilter={(f: string) => { setActiveFilter(f); setSourceFilter("all"); setActiveTab("İlanlar") }}
              favoritesCount={favoriteIds.length}
            />
          )}
          {effectiveTab === "İlanlar" && (
            <>
            <ListingsView 
              loads={filteredLoads} 
              stats={stats} 
              loading={isLoading} 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter} 
              sourceFilter={sourceFilter} 
              setSourceFilter={setSourceFilter} 
              setIsCreateOpen={(open: boolean) => (open ? requestCreate() : setIsCreateOpen(false))} 
              searchQuery={debouncedQuery}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onUserBlocked={handleUserBlocked}
              onCitySearch={handleCitySearch}
              hasMore={hasMore}
              onLoadMore={() => setPageSize((p) => p + PAGE_SIZE)}
              lockedCount={lockedCount}
              from={route.from}
              to={route.to}
              onRouteChange={(f: string, t: string) => setRoute({ from: f, to: t })}
            />
            </>
          )}
          {effectiveTab === "Favorilerim" && (
            <FavoritesView 
              loads={visibleLoads} 
              favoriteIds={favoriteIds} 
              onToggleFavorite={toggleFavorite} 
              onUserBlocked={handleUserBlocked}
              onCitySearch={handleCitySearch}
              searchQuery={debouncedQuery}
            />
          )}
          {effectiveTab === "Seferlerim" && (
            <TripsView
              currentUserId={currentUserId}
              onOpenCreate={requestCreate}
              onChanged={() => {
                fetchListings(queryRef.current, pageSizeRef.current)
                fetchCounts()
              }}
            />
          )}
          {effectiveTab === "Gelir Gider" && (premiumLoading ? null : isPremium ? <FinanceView /> : <PremiumLock title="Gelir-Gider Premium'a özel" description="Kazanç ve masraflarınızı takip etmek, raporları görmek için Premium aboneliğe geçin." />)}
          {effectiveTab === "Şirket Profili" && <CompanyProfileView onProfileUpdated={fetchProfile} />}
          {effectiveTab === "Sefer Hesapla" && <CalculatorView />}
          {effectiveTab === "Araçlar" && <ToolsView />}
          {effectiveTab === "Yardım Merkezi" && <HelpCenterView />}
          {effectiveTab === "Premium" && <PremiumView isGuest={isGuest} onLogin={handleLogout} />}
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreate={requestCreate}
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
      className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card"
    >
      <Bell className="size-[22px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full border-2 border-background bg-brand px-1 text-[9px] font-bold leading-[14px] text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

function GuestGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="animate-rise mx-auto mt-6 max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-foreground">
        <LogIn className="size-6" />
      </div>
      <h2 className="text-lg font-bold text-foreground">Bu bölüm için giriş gerekiyor</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Favoriler, seferler, gelir-gider ve profil özellikleri için ücretsiz üye olabilir veya giriş yapabilirsiniz.
      </p>
      <button
        onClick={onLogin}
        className="mt-6 h-12 w-full rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
      >
        Giriş Yap / Kayıt Ol
      </button>
    </div>
  )
}
