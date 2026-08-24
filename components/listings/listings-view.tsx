import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/format'
import { subscribeToPushNotifications } from '@/lib/push-client'
import { 
  Search, X, Clock, Heart, Phone, Copy, Check, Loader2, MessageSquare, 
  Bell, RefreshCw, FileText, Plus, Trash2, LogIn, Sparkles, ChevronDown,
  Store, Users, AlertCircle, Truck
} from 'lucide-react'

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
  { keys: ['acil'], label: '⚡ ACİL YÜK', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { keys: ['frigo', 'soguk', 'soğuk'], label: '❄️ FRİGO', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  { keys: ['damper'], label: 'DAMPER', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { keys: ['tenteli', 'tente'], label: '📦 TENTELİ', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { keys: ['13.60', '1360', '13/60'], label: '🚛 13.60', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { keys: ['kirkayak'], label: '🚚 KIRKAYAK', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { keys: ['10 teker', '10teker', 'onteker'], label: '🚚 10 TEKER', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { keys: ['tir'], label: '🚛 TIR', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20' }
]

const DEFAULT_BLOCKED_SENDERS = ['ROJHAT BAYIK', 'ROJHAT BAYİK']
const EMPTY_ARRAY: any[] = []

const SPAM_KEYWORDS = [
  'nakliye gorevi', 'nakliye görevi', 'bugunki nakliyeler', 'bugünkü nakliyeler',
  'kaliteli yuk', 'kaliteli yük', 'canli yuk akisi', 'canlı yük akışı',
  'whatsapp dan ulasin', 'telegram', 'whatsapp grubu', 'wa.me', 't.me',
  'e-fatura', 'e-arsiv', 'kdv iadesi', 'bahis', 'casino',
  'isler verildi', 'işler verildi', 'is verildi', 'iş verildi',
  'yuk alindi', 'yük alındı', 'araç tutuldu', 'arac tutuldu',
  'iptal', 'doldu', 'aranmasin', 'aranmasın', 'tamamlandi', 'tamamlandı'
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
    if (ilan?.telefon) foundPhones.push(String(ilan.telefon))
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
    const raw = ilan.ham_mesaj || ilan.mesaj_metni || ilan.message || ilan.icerik || ilan.text || ilan.content || ''
    const sender = toTitleCase(ilan?.ilan_sahibi || ilan?.username || ilan?.sender || 'Lojistik Grubu')
    
    if (!raw || raw.trim().length < 5) return null

    const cleanedRaw = cleanLogisticsText(raw)
    if (!cleanedRaw || cleanedRaw.length < 3) return null

    const normRaw = normalizeTR(cleanedRaw)
    const normSender = normalizeTR(sender)
    const fullSearchPool = `${normSender} ${normRaw}`

    if (DEFAULT_BLOCKED_SENDERS.some(blocked => fullSearchPool.includes(normalizeTR(blocked)))) return null
    if (SPAM_KEYWORDS.some(keyword => normRaw.includes(normalizeTR(keyword)))) return null

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

  if (!q) {
    return <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-relaxed break-words">{formatted}</p>
  }

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = formatted.split(new RegExp(`(${escapedQ})`, 'gi'))
  return (
    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-relaxed break-words">
      {parts.map((part, pIdx) => 
        normalizeTR(part) === normalizeTR(q) ? (
          <mark key={pIdx} className="bg-amber-500/20 text-amber-900 dark:text-amber-300 px-1 py-0.5 rounded font-bold">
            {part}
          </mark>
        ) : part
      )}
    </p>
  )
})
FormattedListingText.displayName = 'FormattedListingText'

const ListingCard = React.memo(({ 
  ilan, 
  isFav, 
  ilanNotes = EMPTY_ARRAY, 
  copiedId, 
  searchQuery, 
  onToggleFavorite, 
  onOpenNoteModal, 
  onCopyText, 
  onSelectIlan 
}: { 
  ilan: any
  isFav: boolean
  ilanNotes?: any[]
  copiedId: string | null
  searchQuery: string
  onToggleFavorite: (e: React.MouseEvent, key: string) => void
  onOpenNoteModal: (ilan: any) => void
  onCopyText: (e: React.MouseEvent, text: string, id: string) => void
  onSelectIlan: (ilan: any) => void
}) => {
  const [expanded, setExpanded] = useState(false)

  const ilanKey = ilan._stableKey
  const displayContent = ilan._rawText
  const phones = ilan._phones || []
  const dateVal = ilan?.created_at || ilan?.ilan_tarihi
  const isLongText = displayContent.length > 140

  return (
    <div 
      onClick={() => onSelectIlan(ilan)}
      className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 p-4 sm:p-5 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-500/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl"
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 max-w-[60%] truncate">
            <div className="size-8 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
              <Truck className="size-4" />
            </div>
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate text-xs tracking-wide">
              {ilan._sender}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              <Clock className="size-3 text-zinc-400" />
              {dateVal ? timeAgo(dateVal) : 'az önce'}
            </span>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenNoteModal(ilan); }}
              className={`rounded-xl p-2 transition-all relative cursor-pointer active:scale-90 ${
                ilanNotes.length > 0 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' 
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 hover:text-amber-500'
              }`}
            >
              <FileText className="size-3.5" />
              {ilanNotes.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-md">
                  {ilanNotes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => onToggleFavorite(e, ilanKey)}
              className={`rounded-xl p-2 transition-all cursor-pointer active:scale-90 ${
                isFav ? 'bg-rose-500/10 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 hover:text-rose-500'
              }`}
            >
              <Heart className={`size-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>

        {ilan._badges && ilan._badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ilan._badges.map((badge: any, idx: number) => (
              <span key={idx} className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${badge.color}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        <div>
          <div className={`transition-all duration-300 overflow-hidden ${!expanded && isLongText ? 'line-clamp-3' : ''}`}>
            <FormattedListingText text={displayContent} query={searchQuery} />
          </div>

          {isLongText && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="mt-2 text-xs font-bold text-blue-600 inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>{expanded ? 'Daha Az Göster' : 'Tümünü Gör'}</span>
              <ChevronDown className={`size-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {ilanNotes.length > 0 && (
          <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-2.5 text-[11px] text-amber-900 dark:text-amber-200">
            <span className="font-extrabold block text-[9px] uppercase text-amber-700 dark:text-amber-400">Notunuz:</span>
            <p className="line-clamp-2 italic font-medium">{ilanNotes[0].not_metni}</p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => onCopyText(e, displayContent, ilanKey)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95"
        >
          {copiedId === ilanKey ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-zinc-400" />}
          <span>{copiedId === ilanKey ? 'KOPYALANDI' : 'KOPYALA'}</span>
        </button>

        {phones.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <a
              href={`https://wa.me/90${phones[0].replace(/^0/, '')}?text=${ilan._waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 text-[11px] font-extrabold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <MessageSquare className="size-3.5" />
              <span>WP</span>
            </a>

            <a
              href={`tel:${phones[0]}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 text-[11px] font-extrabold transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Phone className="size-3.5" />
              <span>ARA</span>
            </a>
          </div>
        ) : (
          <span className="text-[10px] text-zinc-400 italic px-2">Numara Yok</span>
        )}
      </div>
    </div>
  )
})
ListingCard.displayName = 'ListingCard'

export function ListingsView({ listings: propListings = [] }: { listings?: any[] }) {
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
  
  const [favorites, setFavorites] = useState<string[]>([])
  const [timeFilter, setTimeFilter] = useState<'all' | '15m' | '1h'>('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [onlyNotes, setOnlyNotes] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newToast, setNewToast] = useState(false)
  const [selectedIlan, setSelectedIlan] = useState<any | null>(null)

  const [userNotes, setUserNotes] = useState<any[]>([])
  const [noteModalIlan, setNoteModalIlan] = useState<any | null>(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showAuthWarning, setShowAuthWarning] = useState(false)

  const [displayLimit, setDisplayLimit] = useState(30)

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

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 120)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    setDisplayLimit(30)
  }, [debouncedSearch, selectedChip, timeFilter, onlyFavorites, onlyNotes])

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
      if (!isSilent) setRefreshing(true)
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('ilanlar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(800)

      if (error) throw error

      if (data) {
        const processed = data.map(processListingItem).filter(Boolean)
        setListings(processed)
      }
      
      fetchListingCounts()
    } catch (err: any) {
      console.error('Yükleme hatası:', err)
      setErrorMsg('İlanlar yüklenirken sorun oluştu.')
    } fontally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchListingCounts])

  useEffect(() => {
    if (propListings && propListings.length > 0) {
      setListings(propListings.map(processListingItem).filter(Boolean))
      setLoading(false)
      fetchListingCounts()
    } else {
      fetchListings()
    }
  }, [propListings, fetchListings, fetchListingCounts])

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

  const filteredListings = useMemo(() => {
    const activeChipObj = CHIP_FILTERS.find(c => c.id === selectedChip)
    const chipKeywords = activeChipObj?.keywords ? activeChipObj.keywords.map(normalizeTR) : []
    const searchNorm = normalizeTR(debouncedSearch)
    const now = Date.now()

    return listings.filter(ilan => {
      if (!ilan) return false
      if (onlyFavorites && !favoritesSet.has(ilan._stableKey)) return false
      if (onlyNotes && !userNotesMap.has(ilan._stableKey)) return false

      const dateVal = ilan?.created_at || ilan?.ilan_tarihi
      if (timeFilter !== 'all' && dateVal) {
        const diffMs = now - new Date(dateVal).getTime()
        if (timeFilter === '15m' && diffMs > 15 * 60 * 1000) return false
        if (timeFilter === '1h' && diffMs > 60 * 60 * 1000) return false
      }

      if (chipKeywords.length > 0 && !chipKeywords.some(k => ilan._searchPool.includes(k))) return false
      if (searchNorm && !ilan._searchPool.includes(searchNorm)) return false

      return true
    })
  }, [listings, selectedChip, timeFilter, onlyFavorites, favoritesSet, onlyNotes, userNotesMap, debouncedSearch])

  const visibleListings = useMemo(() => {
    return filteredListings.slice(0, displayLimit)
  }, [filteredListings, displayLimit])

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2.5 sm:px-6 relative pb-16 font-sans w-full overflow-x-hidden">
      
      {/* HIZLI MODÜLLER PANELİ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* İlan Pazarı Modülü */}
        <div className="relative flex flex-col justify-between p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 shadow-xs">
          <div className="space-y-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Store className="size-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">İlan Pazarı</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Şu an yayında {botCount} aktif yük var
              </p>
            </div>
          </div>
        </div>

        {/* Sizden Gelen İlanlar Modülü */}
        <div className="relative flex flex-col justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="space-y-3">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">Sizden Gelen İlanlar</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {userCount > 0 ? `Kullanıcıların eklediği ${userCount} güncel ilan` : 'Kullanıcıların eklediği güncel ilanlar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {newToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-2xl border border-emerald-500/40">
          <Sparkles className="size-4 text-emerald-200 animate-bounce" />
          <span className="text-xs font-bold">Yeni İlan Düştü!</span>
        </div>
      )}

      {showAuthWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
              <LogIn className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Giriş Yapmalısınız</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Favori ve Not özelliklerini kullanabilmek için hesabınıza giriş yapın.</p>
            </div>
            <button
              onClick={() => setShowAuthWarning(false)}
              className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md active:scale-95"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* FİLTRELEME VE ARAMA KONTROL PANELİ */}
      <div className="flex flex-col gap-3.5 rounded-[26px] border border-zinc-200/90 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/95 p-3.5 sm:p-5 shadow-sm backdrop-blur-xl">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="İl, ilçe veya yük detayına göre arayın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 py-3 pl-11 pr-9 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {CHIP_FILTERS.map((chip) => {
            const isActive = selectedChip === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedChip(chip.id)}
                className={`rounded-2xl px-3.5 py-2 text-[11px] font-extrabold transition-all shrink-0 active:scale-95 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/70">
          <div className="md:col-span-5 flex items-center bg-zinc-100/90 dark:bg-zinc-800/70 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            {(['all', '15m', '1h'] as const).map((t) => {
              const active = timeFilter === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeFilter(t)}
                  className={`flex-1 py-1.5 text-[11px] font-extrabold rounded-xl transition-all text-center cursor-pointer active:scale-95 ${
                    active 
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {t === 'all' && 'Tüm Zamanlar'}
                  {t === '15m' && '⚡ Son 15 Dk'}
                  {t === '1h' && '⏰ Son 1 Saat'}
                </button>
              )
            })}
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => {
                const cities = searchQuery.trim() ? [searchQuery.trim()] : []
                subscribeToPushNotifications(cities, currentUser?.id)
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 py-2 px-2.5 text-[11px] font-bold transition-all active:scale-95"
            >
              <Bell className="size-3.5 text-purple-600" />
              <span>Bildirim Aç</span>
            </button>

            <button
              type="button"
              onClick={() => fetchListings(false)}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 py-2 px-2.5 text-[11px] font-bold transition-all active:scale-95"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Yenile</span>
            </button>

            <button
              type="button"
              onClick={() => { setOnlyNotes(!onlyNotes); if (!onlyNotes) setOnlyFavorites(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-2xl py-2 px-2.5 text-[11px] font-bold transition-all active:scale-95 ${
                onlyNotes 
                  ? 'bg-amber-500 text-white shadow-xs' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <FileText className="size-3.5" />
              <span>Notlarım ({userNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setOnlyFavorites(!onlyFavorites); if (!onlyFavorites) setOnlyNotes(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-2xl py-2 px-2.5 text-[11px] font-bold transition-all active:scale-95 ${
                onlyFavorites 
                  ? 'bg-rose-500 text-white shadow-xs' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <Heart className={`size-3.5 ${onlyFavorites ? 'fill-white text-white' : ''}`} />
              <span>Favoriler ({favorites.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-bold text-zinc-500 px-1">
        <span>Görüntülenen İlan: <strong className="text-zinc-900 dark:text-zinc-100">{filteredListings.length}</strong></span>
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          Canlı Akış Aktif
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="size-9 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-zinc-400">İlanlar hazırlanıyor...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-amber-500/30 bg-amber-500/5 text-amber-700 space-y-3">
          <AlertCircle className="size-8" />
          <p className="text-xs font-bold">{errorMsg}</p>
          <button onClick={() => fetchListings(false)} className="rounded-xl bg-amber-600 text-white px-4 py-2 text-xs font-bold">Tekrar Dene</button>
        </div>
      ) : visibleListings.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {visibleListings.map((ilan) => {
              const ilanKey = ilan._stableKey
              const isFav = favoritesSet.has(ilanKey)
              const ilanNotes = userNotesMap.get(ilanKey) || EMPTY_ARRAY

              return (
                <ListingCard
                  key={ilanKey}
                  ilan={ilan}
                  isFav={isFav}
                  ilanNotes={ilanNotes}
                  copiedId={copiedId}
                  searchQuery={searchQuery}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenNoteModal={setNoteModalIlan}
                  onCopyText={handleCopyText}
                  onSelectIlan={setSelectedIlan}
                />
              )
            })}
          </div>

          {filteredListings.length > displayLimit && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setDisplayLimit(prev => prev + 30)}
                className="rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 text-xs font-extrabold hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                Daha Fazla İlan Yükle (+{filteredListings.length - displayLimit})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <MessageSquare className="size-8 text-zinc-400" />
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Uygun İlan Bulunamadı</h3>
        </div>
      )}

      {/* Modal - Not Ekleme */}
      {noteModalIlan && (
        <div onClick={() => setNoteModalIlan(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                <FileText className="size-4 text-amber-500" /> Özel Not Ekle
              </h3>
              <button onClick={() => setNoteModalIlan(null)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="size-4" /></button>
            </div>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Notunuzu buraya yazın..."
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleAddNote}
              disabled={isSavingNote || !newNoteText.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 text-white py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {isSavingNote ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Kaydet
            </button>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {(userNotesMap.get(noteModalIlan._stableKey) || EMPTY_ARRAY).map((note) => (
                <div key={note.id} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <p className="text-zinc-800 dark:text-zinc-200 font-medium">{note.not_metni}</p>
                  <button onClick={() => handleDeleteNote(note.id)} className="text-zinc-400 hover:text-rose-500 p-1"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal - İlan Detay */}
      {selectedIlan && (
        <div onClick={() => setSelectedIlan(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedIlan._sender} - İlan Detayı</h3>
              <button onClick={() => setSelectedIlan(null)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="size-4" /></button>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
              <FormattedListingText text={selectedIlan._originalRawText || selectedIlan._rawText} query={searchQuery} />
            </div>
            {selectedIlan._phones && selectedIlan._phones.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`https://wa.me/90${selectedIlan._phones[0].replace(/^0/, '')}?text=${selectedIlan._waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white py-2.5 text-xs font-bold shadow-md"
                >
                  <MessageSquare className="size-4" /> WHATSAPP
                </a>
                <a
                  href={`tel:${selectedIlan._phones[0]}`}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white py-2.5 text-xs font-bold shadow-md"
                >
                  <Phone className="size-4" /> TELEFONLA ARA
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
