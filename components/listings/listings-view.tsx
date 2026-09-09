import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/format'
import { subscribeToPushNotifications } from '@/lib/push-client'
import { 
  Search, X, Clock, Heart, Phone, Copy, Check, MessageSquare, 
  Bell, RefreshCw, FileText, Plus, Trash2, LogIn, Sparkles, ChevronDown,
  Store, Users, AlertCircle, Truck, MapPin, Filter, ChevronUp, Loader2, ZoomIn
} from 'lucide-react'

// Şehir Veri Seti (Autocomplete için)
const TURKEY_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 
  'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 
  'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
]

const CHIP_FILTERS = [
  { id: 'ALL', label: 'TÜMÜ' },
  { id: 'ACIL', label: '⚡ ACİL', keywords: ['acil'] },
  { id: 'TIR', label: 'TIR', keywords: ['tir'] },
  { id: '1360', label: '13.60', keywords: ['13.60', '13 60', '13,60'] },
  { id: 'DAMPER', label: 'DAMPER', keywords: ['damper'] },
  { id: 'TENTELI', label: 'TENTELİ', keywords: ['tenteli', 'tente'] },
  { id: 'FRIGO', label: 'FRİGO', keywords: ['frigo', 'soguk', 'soğuk'] },
  { id: 'KIRKAYAK', label: 'KIRKAYAK', keywords: ['kirkayak'] },
  { id: 'ONTEKER', label: '10 TEKER', keywords: ['10 teker', '10teker', 'onteker'] }
]

const DETECTABLE_BADGES = [
  { keys: ['acil'], label: '⚡ ACİL', color: 'bg-rose-50 text-rose-600 border-rose-200' },
  { keys: ['frigo', 'soguk', 'soğuk'], label: '❄️ FRİGO', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { keys: ['damper'], label: 'DAMPER', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { keys: ['tenteli', 'tente'], label: '📦 TENTELİ', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { keys: ['13.60', '1360', '13/60'], label: '🚛 13.60', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { keys: ['kirkayak'], label: '🚚 KIRKAYAK', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { keys: ['10 teker', '10teker', 'onteker'], label: '🚚 10 TEKER', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { keys: ['tir'], label: '🚛 TIR', color: 'bg-slate-100 text-slate-700 border-slate-200' }
]

const DEFAULT_BLOCKED_SENDERS = ['ROJHAT BAYIK', 'ROJHAT BAYİK']
const EMPTY_ARRAY: any[] = []

const SPAM_KEYWORDS = [
  'nakliye gorevi', 'nakliye görevi', 'bugunki nakliyeler', 'bugünkü nakliyeler',
  'bugun yükleme', 'bugün yükleme', 'bugunkü yükleme', 'bugünkü yükleme',
  'bugunki nakliye', 'bugünkü nakliye', 'bugun nakliye', 'bugün nakliye',
  'kaliteli yuk', 'kaliteli yük', 'canli yuk akisi', 'canlı yük akışı',
  'whatsapp dan ulasin', 'telegram', 'whatsapp grubu', 'wa.me', 't.me',
  'e-fatura', 'e-arsiv', 'kdv iadesi', 'bahis', 'casino',
  'isler verildi', 'işler verildi', 'is verildi', 'iş verildi',
  'yuk alindi', 'yük alındı', 'araç tutuldu', 'arac tutuldu',
  'iptal', 'doldu', 'aranmasin', 'aranmasın', 'tamamlendi', 'tamamlandı'
]

const safeEncode = (str: string) => {
  if (!str) return ''
  try { return encodeURIComponent(str) } catch { return encodeURIComponent(str.replace(/[\uD800-\uDFFF]/g, '')) }
}

function fixEncoding(str: string): string {
  if (!str) return ''
  try {
    return String(str)
      .replace(/\uFFFD/g, '')
      .replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
      .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
      .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
      .replace(/ÄŸ/g, 'ğ').replace(/Ä³/g, 'Ğ')
      .replace(/ÅŸ/g, 'ş').replace(/Åž/g, 'Ş')
      .replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ')
  } catch {
    return String(str || '')
  }
}

function toTitleCase(str: string): string {
  if (!str) return ''
  try {
    const smallWords = /^(ve|ile|de|da|için|icin|bir|bu|şu|o|kadar|gibi|göre|gore)$/i
    return str
      .toLocaleLowerCase('tr-TR')
      .split(' ')
      .map((word, index) => {
        if (!word) return ''
        if (index > 0 && smallWords.test(word)) return word
        return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
      })
      .join(' ')
  } catch {
    return str
  }
}

function cleanLogisticsText(text: string): string {
  if (!text) return ''
  try {
    let cleaned = fixEncoding(text)
    return cleaned
      .replace(/(hayırlı\s*işler|selam[un]?\s*aleyküm|s\.a|kolay\s*gelsin|iyi\s*günler|günaydın|h\.işler)/gi, '')
      .replace(/(iletişime\s*geçiniz|arayınız|ulaşınız|özelden\s*yazın|dönüş\s*yapın|wp|whatsapp|lütfen\s*arayın)/gi, '')
      .replace(/(?:(?:\+?90)|0)?\s*5[\d\s\-\.]{8,16}\d/g, '')
      .replace(/[\.\,\-\_\+\*]{2,}/g, ' ')
      .replace(/[\uFFFD\uFEFF\u200B-\u200D\u007F-\u009F\u202A-\u202E]/g, ' ')
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ\.\,\:\;\-\+\/\(\)\@]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return String(text || '').trim()
  }
}

function formatCleanText(text: string): string {
  if (!text) return ''
  try {
    let cleaned = fixEncoding(text)
    return cleaned
      .replace(/[\uFFFD\uFEFF\u200B-\u200D\u007F-\u009F\u202A-\u202E]/g, ' ')
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ\.\,\:\;\-\+\/\(\)\@]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return String(text || '').trim()
  }
}

function normalizeTR(text: any = ''): string {
  if (!text) return ''
  try {
    return String(text)
      .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
      .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
      .replace(/Ü/g, 'u').replace(/ü/g, 'u')
      .replace(/Ş/g, 's').replace(/ş/g, 's')
      .replace(/Ö/g, 'o').replace(/ö/g, 'o')
      .replace(/Ç/g, 'c').replace(/ç/g, 'c')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return ''
  }
}

function extractPhoneNumbers(ilan: any, text: string): string[] {
  const foundPhones: string[] = []
  try {
    if (ilan?.phone) foundPhones.push(String(ilan.phone))

    const rawMatches = text.match(/(?:(?:\+?90)|0)?\s*5[\d\s\-\.]{8,16}\d/g) || []
    for (const rawMatch of rawMatches) {
      const digitsOnly = rawMatch.replace(/\D/g, '')
      let normalized = ''
      if (digitsOnly.length === 10 && digitsOnly.startsWith('5')) normalized = '0' + digitsOnly
      else if (digitsOnly.length === 11 && digitsOnly.startsWith('05')) normalized = digitsOnly
      else if (digitsOnly.length === 12 && digitsOnly.startsWith('905')) normalized = '0' + digitsOnly.slice(2)

      if (normalized && normalized.length === 11 && /^05[0-9]{9}$/.test(normalized)) {
        foundPhones.push(normalized)
      }
    }
  } catch (err) {
    console.error('Telefon çıkarma hatası:', err)
  }
  return Array.from(new Set(foundPhones))
}

function processListingItem(ilan: any) {
  if (!ilan) return null
  try {
    const raw = ilan.content || ilan.title || ''
    const sender = toTitleCase(ilan?.title || 'Lojistik Grubu')
    
    if (!raw || raw.trim().length < 3) return null

    const cleanedRaw = cleanLogisticsText(raw)
    if (!cleanedRaw || cleanedRaw.length < 3) return null

    const normRaw = normalizeTR(cleanedRaw)
    const normSender = normalizeTR(sender)
    const fullSearchPool = `${normSender} ${normRaw}`

    if (DEFAULT_BLOCKED_SENDERS.some(blocked => fullSearchPool.includes(normalizeTR(blocked)))) return null
    
    if (SPAM_KEYWORDS.some(keyword => normRaw.includes(normalizeTR(keyword)))) return null
    if (/(bugun|bugün)\s*(nakliye|yükleme|yukleme|sevkiyat|is|iş)/i.test(normRaw)) return null

    const formattedFull = formatCleanText(raw)
    const phones = extractPhoneNumbers(ilan, formattedFull)
    const badges = DETECTABLE_BADGES.filter(b => b.keys.some(k => normRaw.includes(normalizeTR(k))))
    const stableKey = ilan?.id ? String(ilan.id) : `${ilan?.created_at || Date.now()}-${sender}-${cleanedRaw.slice(0, 10)}`

    return {
      ...ilan,
      _stableKey: stableKey,
      _rawText: cleanedRaw,
      _originalRawText: formattedFull,
      _sender: sender,
      _phones: phones,
      _badges: badges,
      _searchPool: fullSearchPool,
      _waMessage: safeEncode(`Merhaba, Nakliye Cepte üzerindeki "${cleanedRaw.slice(0, 60)}..." ilanınız için ulaşıyorum.`)
    }
  } catch {
    return null
  }
}

const FormattedListingText = React.memo(({ text, query }: { text: string; query: string }) => {
  if (!text) return null
  const formatted = toTitleCase(text.trim())
  const q = query ? query.trim() : ''

  if (!q) return <span>{formatted}</span>

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = formatted.split(new RegExp(`(${escapedQ})`, 'gi'))
  return (
    <span>
      {parts.map((part, pIdx) => 
        normalizeTR(part) === normalizeTR(q) ? (
          <mark key={pIdx} className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded font-bold">
            {part}
          </mark>
        ) : part
      )}
    </span>
  )
})
FormattedListingText.displayName = 'FormattedListingText'

// SKELETON LOADER - Aynı boyutta nizami yükleme iskeleti
const SkeletonCard = () => (
  <div className="bg-white border-b border-slate-200 sm:border sm:rounded-2xl p-4 sm:p-5 animate-pulse h-[160px] flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3 w-2/3">
          <div className="size-8 rounded-xl bg-slate-100 shrink-0"></div>
          <div className="h-4 bg-slate-100 rounded-md w-full"></div>
        </div>
        <div className="h-4 bg-slate-100 rounded-md w-16 shrink-0"></div>
      </div>
      <div className="space-y-2 mt-1">
        <div className="h-3.5 bg-slate-100 rounded-md w-full"></div>
        <div className="h-3.5 bg-slate-100 rounded-md w-5/6"></div>
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
      <div className="flex gap-1.5">
        <div className="size-8 bg-slate-100 rounded-xl"></div>
        <div className="size-8 bg-slate-100 rounded-xl"></div>
        <div className="size-8 bg-slate-100 rounded-xl"></div>
      </div>
      <div className="flex gap-1.5 w-[140px]">
        <div className="h-8 bg-slate-100 rounded-xl flex-1"></div>
        <div className="h-8 bg-slate-100 rounded-xl flex-1"></div>
      </div>
    </div>
  </div>
)

// MODERN & NİZAMİ KART GÖRÜNÜMÜ - Sabit Yükseklik ve Tıklanabilir Yapı
const ListingCard = React.memo(({ 
  ilan, isFav, ilanNotes = EMPTY_ARRAY, copiedId, searchQuery, 
  onToggleFavorite, onOpenNoteModal, onCopyText, onSelectIlan
}: { 
  ilan: any, isFav: boolean, ilanNotes?: any[], copiedId: string | null, searchQuery: string,
  onToggleFavorite: (e: React.MouseEvent, key: string) => void, onOpenNoteModal: (ilan: any) => void, 
  onCopyText: (e: React.MouseEvent, text: string, id: string) => void, onSelectIlan: (ilan: any) => void
}) => {
  const ilanKey = ilan._stableKey
  const displayContent = ilan._rawText
  const phones = ilan._phones || []

  return (
    <div 
      onClick={() => onSelectIlan(ilan)}
      className="group flex flex-col justify-between bg-white border-b border-slate-200 sm:border sm:rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:border-blue-300 active:bg-slate-50 transition-all duration-200 cursor-pointer relative h-auto min-h-[160px]"
    >
      
      {/* Tıklanabilir İçerik Alanı - Sabit Satır Sayısı */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-[70%] truncate">
            <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Truck className="size-4" />
            </div>
            <span className="font-extrabold text-slate-900 truncate text-[13px] sm:text-sm tracking-wide">{ilan._sender}</span>
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 shrink-0">
            <Clock className="size-3 text-slate-400" /> {ilan.created_at ? timeAgo(ilan.created_at) : 'az önce'}
          </span>
        </div>

        {ilan._badges && ilan._badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ilan._badges.map((badge: any, idx: number) => (
              <span key={idx} className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase ${badge.color}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* NİZAMİ GÖRÜNÜM: Her ilan en fazla 2 satır görünür */}
        <p className="text-[13px] sm:text-sm font-semibold text-slate-700 leading-snug break-words line-clamp-2 pr-4">
          <FormattedListingText text={displayContent} query={searchQuery} />
        </p>
        
        {/* Zoom İkonu (Kullanıcıya tıklanabilir olduğunu hissettirir) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shadow-sm">
            <ZoomIn className="size-4" />
          </div>
        </div>
      </div>

      {/* Aksiyon Alanı - Başparmak Ergonomisi */}
      <div className="mt-3 pt-3 flex items-center justify-between gap-2 border-t border-slate-100/80">
        
        {/* Yardımcı Butonlar Grubu */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onCopyText(e, displayContent, ilanKey); }} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors flex items-center gap-1.5">
            {copiedId === ilanKey ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenNoteModal(ilan); }} className={`p-2 rounded-xl transition-colors ${ilanNotes.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500 hover:text-amber-500 hover:bg-amber-50'}`}>
            <FileText className="size-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, ilanKey); }} className={`p-2 rounded-xl transition-colors ${isFav ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500 hover:text-rose-500 hover:bg-rose-50'}`}>
            <Heart className={`size-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Ana İletişim Butonları */}
        {phones.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-1 justify-end max-w-[200px]">
            <a href={`https://wa.me/90${phones[0].replace(/^0/, '')}?text=${ilan._waMessage}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#25D366] hover:bg-[#1ebd5a] text-white py-2 px-1 text-[11px] font-extrabold transition-all shadow-sm active:scale-95">
              <MessageSquare className="size-4" /> <span>WP</span>
            </a>
            <a href={`tel:${phones[0]}`} onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2 px-1 text-[11px] font-extrabold transition-all shadow-sm active:scale-95">
              <Phone className="size-4" /> <span>ARA</span>
            </a>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic px-2">Numara Yok</span>
        )}
      </div>
    </div>
  )
})
ListingCard.displayName = 'ListingCard'


export function ListingsView() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [botCount, setBotCount] = useState<number>(0)
  const [userCount, setUserCount] = useState<number>(0)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedChip, setSelectedChip] = useState('ALL')
  
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [favorites, setFavorites] = useState<string[]>([])
  const [timeFilter, setTimeFilter] = useState<'all' | '15m' | '1h' | '5h'>('all')
  
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [onlyNotes, setOnlyNotes] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newToast, setNewToast] = useState(false)

  const [userNotes, setUserNotes] = useState<any[]>([])
  const [selectedIlan, setSelectedIlan] = useState<any | null>(null)
  const [noteModalIlan, setNoteModalIlan] = useState<any | null>(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showAuthWarning, setShowAuthWarning] = useState(false)

  const favoritesSet = useMemo(() => new Set(favorites), [favorites])
  const userNotesMap = useMemo(() => {
    const map = new Map<string, any[]>()
    for (let i = 0; i < userNotes.length; i++) {
      const note = userNotes[i]
      if (!note?.ilan_id) continue
      const existing = map.get(note.ilan_id)
      if (existing) {
        existing.push(note)
      } else {
        map.set(note.ilan_id, [note])
      }
    }
    return map
  }, [userNotes])

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return []
    return TURKEY_CITIES.filter(city => 
      normalizeTR(city).startsWith(normalizeTR(searchQuery))
    ).slice(0, 6)
  }, [searchQuery])

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 250)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = useCallback(async (user: any) => {
    if (!user) { setFavorites([]); setUserNotes([]); return; }
    
    const [favRes, noteRes] = await Promise.all([
      supabase.from('favoriler').select('ilan_id').eq('user_id', user.id),
      supabase.from('notlar').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ])

    if (!favRes.error && favRes.data) setFavorites(favRes.data.map((f: any) => f.ilan_id))
    if (!noteRes.error && noteRes.data) setUserNotes(noteRes.data)
  }, [])

  useEffect(() => {
    if (currentUser) loadUserData(currentUser)
  }, [currentUser, loadUserData])

  const fetchListingCounts = useCallback(async () => {
    try {
      const [botRes, userRes] = await Promise.all([
        supabase.from('ilanlar').select('*', { count: 'exact', head: true }),
        supabase.from('user_listings').select('*', { count: 'exact', head: true })
      ])
      if (botRes.count !== null) setBotCount(botRes.count)
      if (userRes.count !== null) setUserCount(userRes.count)
    } catch (err) {
      console.error('İlan sayıları alınamadı:', err)
    }
  }, [])

  const fetchListings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      setErrorMsg(null)

      let query = supabase
        .from('ilanlar')
        .select('id, created_at, title, content, phone')
        .order('created_at', { ascending: false })
        .limit(200)

      if (timeFilter === '15m') {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        query = query.gte('created_at', fifteenMinsAgo)
      } else if (timeFilter === '1h') {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', oneHourAgo)
      } else if (timeFilter === '5h') {
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', fiveHoursAgo)
      }

      const cleanSearch = debouncedSearch.trim().replace(/[%_]/g, '')
      if (cleanSearch) {
        query = query.or(`content.ilike.%${cleanSearch}%,title.ilike.%${cleanSearch}%`)
      }

      if (selectedChip !== 'ALL') {
        const chipObj = CHIP_FILTERS.find(c => c.id === selectedChip)
        if (chipObj?.keywords && chipObj.keywords.length > 0) {
          const kwConditions = chipObj.keywords.map(k => `content.ilike.%${k}%`).join(',')
          query = query.or(kwConditions)
        }
      }

      if (onlyFavorites) {
        if (favorites.length === 0) { setListings([]); setLoading(false); return; }
        query = query.in('id', favorites)
      }

      const { data, error } = await query
      if (error) throw error

      if (data) {
        let processed = data.map(processListingItem).filter(Boolean)
        if (onlyNotes) {
          const noteIds = new Set(userNotes.map(n => n.ilan_id))
          processed = processed.filter(item => noteIds.has(item._stableKey))
        }
        setListings(processed)
      }
      
      fetchListingCounts()
    } catch (err: any) {
      console.error('Yükleme hatası:', err)
      setErrorMsg('İlanlar yüklenirken sorun oluştu.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearch, selectedChip, timeFilter, onlyFavorites, favorites, onlyNotes, userNotes, fetchListingCounts])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  useEffect(() => {
    let channel: any
    try {
      channel = supabase
        .channel('public:ilanlar')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ilanlar' }, (payload: any) => {
          const item = processListingItem(payload.new)
          if (item) {
            setListings(prev => [item, ...prev.filter(p => p._stableKey !== item._stableKey)])
            setBotCount(prev => prev + 1)
            setNewToast(true)
            setTimeout(() => setNewToast(false), 3000)
          }
        })
        .subscribe()
    } catch (err) {
      console.error('Realtime kanal hatası:', err)
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    if (!currentUser) { setShowAuthWarning(true); return; }

    const isFav = favoritesSet.has(key)
    setFavorites(prev => isFav ? prev.filter(k => k !== key) : [...prev, key])

    if (isFav) {
      await supabase.from('favoriler').delete().eq('user_id', currentUser.id).eq('ilan_id', key)
    } else {
      await supabase.from('favoriler').insert([{ user_id: currentUser.id, ilan_id: key }])
    }
  }, [currentUser, favoritesSet])

  const handleAddNote = async () => {
    if (!currentUser) { setShowAuthWarning(true); return; }
    if (!newNoteText.trim() || !noteModalIlan) return

    setIsSavingNote(true)
    const { data, error } = await supabase
      .from('notlar')
      .insert([{ user_id: currentUser.id, ilan_id: noteModalIlan._stableKey, not_metni: newNoteText.trim() }])
      .select('*')

    if (!error && data) {
      setUserNotes(prev => [data[0], ...prev])
      setNewNoteText('')
    }
    setIsSavingNote(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser) return
    setUserNotes(prev => prev.filter(n => n.id !== noteId))
    await supabase.from('notlar').delete().eq('id', noteId).eq('user_id', currentUser.id)
  }

  const handleCopyText = useCallback(async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }, [])

  return (
    <div className="space-y-4 max-w-7xl mx-auto relative font-sans w-full pb-20 md:pb-6">
      
      {/* Üst Kısım Header Alanı */}
      <div className="px-2 sm:px-4 space-y-4">
        {/* İstatistik Modülleri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Store className="size-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">İlan Pazarı</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? 'Yükleniyor...' : `Şu an yayında ${botCount} aktif yük var`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Sürücü İlanları</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading ? 'Yükleniyor...' : userCount > 0 ? `${userCount} güncel sürücü ilanı` : 'Henüz özel ilan yok'}
              </p>
            </div>
          </div>
        </div>

        {newToast && (
          <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-xl animate-in slide-in-from-bottom-5">
            <Sparkles className="size-4 text-emerald-200 animate-bounce" />
            <span className="text-xs font-bold">Yeni İlan Düştü!</span>
          </div>
        )}

        {/* Arama & Filtre Paneli */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
          
          <div className="relative w-full">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="İl, ilçe veya yük detayına göre arayın (örn: Konya)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowCityDropdown(true)
                }}
                onFocus={() => setShowCityDropdown(true)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(''); setShowCityDropdown(false); }} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {showCityDropdown && filteredCities.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden divide-y divide-slate-100">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSearchQuery(city)
                      setShowCityDropdown(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                  >
                    <MapPin className="size-3.5 text-blue-500" />
                    <span>{city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CHIP_FILTERS.map((chip) => {
              const isActive = selectedChip === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedChip(chip.id)}
                  className={`rounded-xl px-2.5 py-1.5 text-[10px] sm:text-[11px] font-extrabold transition-all shrink-0 active:scale-95 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* NİZAMİ HİZALAMA: Grid yapısı kullanılarak butonlar tamamen eşit ve simetrik hale getirildi */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 w-full">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2 text-[10px] sm:text-[11px] font-extrabold text-slate-600 transition-all active:scale-95 w-full"
            >
              <Filter className="size-3.5" />
              <span className="truncate">Filtreler</span>
              {showAdvancedFilters ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => { setOnlyNotes(!onlyNotes); if (!onlyNotes) setOnlyFavorites(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 w-full ${
                onlyNotes 
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <FileText className="size-3.5" />
              <span className="truncate">Notlar ({userNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setOnlyFavorites(!onlyFavorites); if (!onlyFavorites) setOnlyNotes(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 w-full ${
                onlyFavorites 
                  ? 'bg-rose-500 border-rose-600 text-white shadow-xs' 
                  : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <Heart className={`size-3.5 ${onlyFavorites ? 'fill-white text-white' : ''}`} />
              <span className="truncate">Favoriler ({favorites.length})</span>
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="pt-2 mt-2 border-t border-slate-50 grid grid-cols-1 md:grid-cols-12 gap-2 animate-in slide-in-from-top-2">
              <div className="md:col-span-6 flex items-center bg-slate-100 p-1 rounded-xl">
                {(['all', '15m', '1h', '5h'] as const).map((t) => {
                  const active = timeFilter === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeFilter(t)}
                      className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-lg transition-all text-center cursor-pointer active:scale-95 ${
                        active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {t === 'all' && 'Tümü'}
                      {t === '15m' && '⚡ 15Dk'}
                      {t === '1h' && '⏰ 1Saat'}
                      {t === '5h' && '🕒 5Saat'}
                    </button>
                  )
                })}
              </div>
              <div className="md:col-span-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cities = searchQuery.trim() ? [searchQuery.trim()] : []
                    subscribeToPushNotifications(cities, currentUser?.id)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 px-3 text-[11px] font-bold transition-all w-full md:w-auto"
                >
                  <Bell className="size-3.5" /> <span>Bildirim Kur</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchListings(false)}
                  disabled={refreshing}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 text-[11px] font-bold transition-all w-full md:w-auto"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
                  <span>Yenile</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Görüntülenen İlan: <strong className="text-slate-900">{loading ? '...' : listings.length}</strong></span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
            </span>
            Canlı Akış
          </span>
        </div>
      </div>

      {/* Ana Liste Alanı */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-4 sm:px-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : errorMsg ? (
        <div className="mx-2 sm:mx-4 flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-200 bg-rose-50">
          <AlertCircle className="size-10 text-rose-500 mb-2" />
          <p className="text-sm font-bold text-rose-700">{errorMsg}</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="mx-2 sm:mx-4 flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <Search className="size-10 text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600 mb-1">
            {onlyFavorites ? 'Favori ilanınız bulunmuyor.' :
             onlyNotes ? 'Not eklediğiniz ilan bulunmuyor.' :
             'Aradığınız kriterlere uygun ilan bulunamadı.'}
          </p>
          <p className="text-xs text-slate-400">Filtreleri veya arama kelimesini değiştirerek tekrar deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-4 sm:px-4 bg-slate-50 sm:bg-transparent">
          {listings.map((ilan) => (
            <ListingCard
              key={ilan._stableKey}
              ilan={ilan}
              isFav={favoritesSet.has(ilan._stableKey)}
              ilanNotes={userNotesMap.get(ilan._stableKey) || []}
              copiedId={copiedId}
              searchQuery={searchQuery}
              onToggleFavorite={handleToggleFavorite}
              onOpenNoteModal={setNoteModalIlan}
              onCopyText={handleCopyText}
              onSelectIlan={setSelectedIlan}
            />
          ))}
        </div>
      )}

      {/* DETAY (ZOOM) MODALI - Karta tıklanınca hızlıca tüm içeriğe odaklanmayı sağlar */}
      {selectedIlan && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedIlan(null)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <ZoomIn className="size-4 text-blue-600" /> İlan Detayı
              </h2>
              <button onClick={() => setSelectedIlan(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Truck className="size-6" />
                </div>
                <div>
                  <div className="text-base font-extrabold text-slate-900">{selectedIlan._sender}</div>
                  <div className="text-xs font-bold text-slate-400">
                    {selectedIlan.created_at ? new Date(selectedIlan.created_at).toLocaleString('tr-TR') : 'Bilinmeyen Tarih'}
                  </div>
                </div>
              </div>

              {selectedIlan._badges && selectedIlan._badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedIlan._badges.map((b: any, i: number) => (
                    <span key={i} className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase shadow-sm ${b.color}`}>
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                  {selectedIlan._originalRawText || selectedIlan._rawText}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <button onClick={(e) => handleCopyText(e, selectedIlan._originalRawText || selectedIlan._rawText, selectedIlan._stableKey)} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
                {copiedId === selectedIlan._stableKey ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} Kopyala
              </button>
              {(selectedIlan._phones || []).length > 0 && (
                <a href={`tel:${selectedIlan._phones[0]}`} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-xs font-extrabold text-white transition-all active:scale-95 shadow-sm shadow-blue-600/20">
                  <Phone className="size-4" /> Ara
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not Ekleme Modalı */}
      {noteModalIlan && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50/50">
              <h2 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
                <FileText className="size-4 text-amber-600" /> İlana Not Ekle
              </h2>
              <button onClick={() => { setNoteModalIlan(null); setNewNoteText(''); }} className="p-2 rounded-xl hover:bg-amber-100 text-amber-600 transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto text-xs font-semibold text-slate-600 leading-snug">
                {noteModalIlan._rawText}
              </div>
              
              <div className="space-y-2">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Bu ilanla ilgili notunuzu yazın (örn: Aradım fiyatta anlaşamadık...)"
                  className="w-full min-h-[100px] p-3 text-sm font-medium rounded-xl border border-slate-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none transition-all placeholder:text-slate-400"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim() || isSavingNote}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-colors active:scale-95 shadow-sm"
                  >
                    {isSavingNote ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Kaydet
                  </button>
                </div>
              </div>

              {(userNotesMap.get(noteModalIlan._stableKey) || []).length > 0 && (
                <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mevcut Notlarınız</h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {(userNotesMap.get(noteModalIlan._stableKey) || []).map((note) => (
                      <div key={note.id} className="group flex items-start justify-between gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <div>
                          <p className="text-xs font-semibold text-amber-900">{note.not_metni}</p>
                          <span className="text-[10px] text-amber-600/70 font-bold mt-1 block">
                            {new Date(note.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-amber-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Uyarısı Modalı */}
      {showAuthWarning && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="size-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogIn className="size-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">Giriş Yapmanız Gerekiyor</h2>
            <p className="text-sm font-medium text-slate-500">
              Favorilere ekleme yapmak ve not tutmak için hesabınıza giriş yapmalısınız.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setShowAuthWarning(false)} className="flex-1 py-3 text-xs font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95">
                İptal
              </button>
              <button onClick={() => { window.location.href = '/auth'; }} className="flex-1 py-3 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors active:scale-95 shadow-md shadow-blue-600/20">
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
