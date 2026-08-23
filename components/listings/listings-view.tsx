import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/format'
import { subscribeToPushNotifications } from '@/lib/push-client'
import { 
  Search, X, Clock, Heart, Phone, Copy, Check, Loader2, MessageSquare, 
  Bell, RotateCcw, Truck, AlertCircle, RefreshCw, FileText, Plus, Trash2, LogIn, Sparkles
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
  { keys: ['acil'], label: '⚡ ACİL YÜK', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-sm' },
  { keys: ['frigo', 'soguk', 'soğuk'], label: '❄️ FRİGO', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 shadow-sm' },
  { keys: ['damper'], label: 'DAMPER', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 shadow-sm' },
  { keys: ['tenteli', 'tente'], label: '📦 TENTELİ', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-sm' },
  { keys: ['13.60', '1360', '13/60'], label: '🚛 13.60', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm' },
  { keys: ['kirkayak'], label: '🚚 KIRKAYAK', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm' },
  { keys: ['10 teker', '10teker', 'onteker'], label: '🚚 10 TEKER', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shadow-sm' },
  { keys: ['tir'], label: '🚛 TIR', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 shadow-sm' }
]

const CRITICAL_KEYWORDS = [
  'PEŞİN ÖDEME', 'PEŞİN', 'SABAH İNDİRİR', 'HEMEN YÜKLEME', 'ACİL YÜK', 'ACİL',
  'DÖNÜŞ YÜKÜ', 'SINIRSIZ ARAÇ', 'AÇIK ARAÇ', 'KAPALI ARAÇ', 'KDV DAHİL',
  'KDV HARİÇ', 'BUGÜN YÜKLEME', 'YARIN YÜKLEME', 'SABAH YÜKLEME', 'AKŞAM YÜKLEME'
]

const DEFAULT_BLOCKED_SENDERS = ['ROJHAT BAYIK', 'ROJHAT BAYİK']

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
  try {
    return encodeURIComponent(str)
  } catch {
    return encodeURIComponent(str.replace(/[\uD800-\uDFFF]/g, ''))
  }
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
      .toLocaleUpperCase('tr-TR')
  } catch {
    return String(text || '').toLocaleUpperCase('tr-TR')
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
      .toLocaleUpperCase('tr-TR')
  } catch {
    return String(text || '').toLocaleUpperCase('tr-TR')
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

function extractMessageText(ilan: any): string {
  if (!ilan) return ''
  return ilan.ham_mesaj || ilan.mesaj_metni || ilan.message || ilan.icerik || ilan.text || ilan.content || ''
}

function isSpamOrGarbage(rawMessage: string, senderName: string): boolean {
  if (!rawMessage || rawMessage.trim().length < 5) return true

  try {
    const cleaned = formatCleanText(rawMessage)
    const normRaw = normalizeTR(cleaned)
    const normSender = normalizeTR(senderName)
    const fullSearchPool = `${normSender} ${normRaw}`

    if (DEFAULT_BLOCKED_SENDERS.some(blocked => fullSearchPool.includes(normalizeTR(blocked)))) return true
    if (SPAM_KEYWORDS.some(keyword => normRaw.includes(normalizeTR(keyword)))) return true

    const words = cleaned.split(/\s+/)
    const numericWords = words.filter(w => /^\d{5,}$/.test(w))
    if (words.length > 2 && numericWords.length / words.length > 0.4) {
      return true
    }
  } catch {
    return false
  }

  return false
}

function processListingItem(ilan: any) {
  if (!ilan) return null
  try {
    const raw = extractMessageText(ilan)
    const sender = (ilan?.ilan_sahibi || ilan?.username || ilan?.sender || 'Lojistik Grubu').toLocaleUpperCase('tr-TR')
    
    if (isSpamOrGarbage(raw, sender)) return null

    const cleanedRaw = cleanLogisticsText(raw)
    if (!cleanedRaw || cleanedRaw.length < 3) return null

    const normRaw = normalizeTR(cleanedRaw)
    const badges = DETECTABLE_BADGES.filter(b => b.keys.some(k => normRaw.includes(normalizeTR(k))))
    const stableKey = ilan?.id ? String(ilan.id) : `${ilan?.created_at || Date.now()}-${sender}-${cleanedRaw.slice(0, 10)}`

    return {
      ...ilan,
      _stableKey: stableKey,
      _rawText: cleanedRaw,
      _originalRawText: formatCleanText(raw),
      _sender: sender,
      _badges: badges,
      _searchPool: `${normRaw} ${normalizeTR(sender)}`
    }
  } catch (err) {
    console.error('İlan işleme hatası:', err)
    return null
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

function FormattedListingText({ text, query }: { text: string; query: string }) {
  if (!text) return null

  const upperText = text.toLocaleUpperCase('tr-TR')
  const upperQuery = query ? query.trim().toLocaleUpperCase('tr-TR') : ''

  const lines = upperText
    .split(/\n+|\s+\/\s+(?![^\(]*\))/)
    .map(l => l.trim())
    .filter(Boolean)

  return (
    <div className="space-y-2">
      {lines.map((line, lIdx) => (
        <div key={lIdx} className={lines.length > 1 ? 'flex items-start gap-2.5 text-[13px]' : 'text-[13.5px]'}>
          {lines.length > 1 && (
            <span className="inline-block text-primary font-bold shrink-0 mt-1.5 size-1.5 rounded-full bg-primary/60 shadow-sm" />
          )}
          <p className="leading-relaxed font-semibold text-zinc-800 dark:text-zinc-100 break-words flex-1 tracking-tight">
            {renderFormattedWords(line, upperQuery)}
          </p>
        </div>
      ))}
    </div>
  )
}

function renderFormattedWords(line: string, query: string) {
  const words = line.split(/(\s+)/)

  return words.map((word, i) => {
    const normWord = word.trim()
    if (!normWord) return word

    const normTRWord = normalizeTR(normWord)
    const isQueryMatch = query && normTRWord.includes(normalizeTR(query))
    const isCritical = CRITICAL_KEYWORDS.some(k => normTRWord.includes(normalizeTR(k)))

    if (isQueryMatch) {
      return (
        <mark key={i} className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-lg font-bold border border-primary/30 shadow-sm">
          {word}
        </mark>
      )
    }

    if (isCritical) {
      return (
        <span key={i} className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-lg border border-amber-500/25 shadow-sm">
          {word}
        </span>
      )
    }

    return word
  })
}

export function ListingsView({ listings: propListings = [] }: { listings?: any[] }) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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

  const isInitialFetchedRef = useRef(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserFavorites = useCallback(async (user: any) => {
    if (!user) {
      setFavorites([])
      return
    }
    const { data, error } = await supabase
      .from('favoriler')
      .select('ilan_id')
      .eq('user_id', user.id)

    if (!error && data) {
      setFavorites(data.map((f: any) => f.ilan_id))
    }
  }, [])

  const loadUserNotes = useCallback(async (user: any) => {
    if (!user) {
      setUserNotes([])
      return
    }
    const { data, error } = await supabase
      .from('notlar')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUserNotes(data)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadUserFavorites(currentUser)
      loadUserNotes(currentUser)
    } else {
      setFavorites([])
      setUserNotes([])
    }
  }, [currentUser, loadUserFavorites, loadUserNotes])

  useEffect(() => {
    if (selectedIlan || noteModalIlan) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = 'unset'
      document.body.style.position = 'static'
    }
    return () => { 
      document.body.style.overflow = 'unset'
      document.body.style.position = 'static'
    }
  }, [selectedIlan, noteModalIlan])

  const fetchListings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setRefreshing(true)
      }
      setErrorMsg(null)

      const { data, error } = await supabase
        .from('ilanlar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      if (data) {
        const processed = data.map(processListingItem).filter(Boolean)
        setListings(processed)
      }
    } catch (err: any) {
      console.error('Yükleme hatası:', err)
      setErrorMsg('İlanlar yüklenirken bağlantı sorunu oluştu.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (propListings && propListings.length > 0) {
      setListings(propListings.map(processListingItem).filter(Boolean))
      setLoading(false)
    } else if (!isInitialFetchedRef.current) {
      isInitialFetchedRef.current = true
      fetchListings()
    }
  }, [propListings, fetchListings])

  useEffect(() => {
    let channel: any

    try {
      channel = supabase
        .channel('public:ilanlar')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ilanlar' }, (payload: any) => {
          const item = processListingItem(payload.new)
          if (item) {
            setListings(prev => {
              const exists = prev.some(p => p._stableKey === item._stableKey)
              if (exists) return prev
              return [item, ...prev]
            })
            setNewToast(true)
            setTimeout(() => setNewToast(false), 3000)
          }
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            fetchListings(true)
          }
        })
    } catch (err) {
      console.error('Realtime kanal hatası:', err)
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [fetchListings])

  const handleToggleFavorite = async (e: React.MouseEvent, key: string) => {
    e.stopPropagation()

    if (!currentUser) {
      setShowAuthWarning(true)
      return
    }

    const isFav = favorites.includes(key)
    setFavorites(prev => isFav ? prev.filter(k => k !== key) : [...prev, key])

    if (isFav) {
      const { error } = await supabase
        .from('favoriler')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('ilan_id', key)

      if (error) setFavorites(prev => [...prev, key])
    } else {
      const { error } = await supabase
        .from('favoriler')
        .insert([{ user_id: currentUser.id, ilan_id: key }])

      if (error) setFavorites(prev => prev.filter(k => k !== key))
    }
  }

  const handleAddNote = async () => {
    if (!currentUser) {
      setShowAuthWarning(true)
      return
    }
    if (!newNoteText.trim() || !noteModalIlan) return

    setIsSavingNote(true)

    const { data, error } = await supabase
      .from('notlar')
      .insert([{
        user_id: currentUser.id,
        ilan_id: noteModalIlan._stableKey,
        not_metni: newNoteText.trim()
      }])
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

  const handleCopyText = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation()
    const cleanToCopy = formatCleanText(text) || text
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanToCopy)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = cleanToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Kopyalama hatası:', err)
    }
  }

  const filteredListings = useMemo(() => {
    const activeChipObj = CHIP_FILTERS.find(c => c.id === selectedChip)
    const chipKeywords = activeChipObj?.keywords ? activeChipObj.keywords.map(normalizeTR) : []
    const searchNorm = normalizeTR(searchQuery)
    const now = Date.now()

    const notedIlanIds = userNotes.map(n => n.ilan_id).filter(Boolean)

    return listings.filter(ilan => {
      if (!ilan) return false
      if (onlyFavorites && !favorites.includes(ilan._stableKey)) return false
      if (onlyNotes && !notedIlanIds.includes(ilan._stableKey)) return false

      const dateVal = ilan?.created_at || ilan?.ilan_tarihi
      if (timeFilter !== 'all' && dateVal) {
        const diffMs = now - new Date(dateVal).getTime()
        if (timeFilter === '15m' && diffMs > 15 * 60 * 1000) return false
        if (timeFilter === '1h' && diffMs > 60 * 60 * 1000) return false
      }

      const normRaw = normalizeTR(ilan._rawText)
      if (chipKeywords.length > 0 && !chipKeywords.some(k => normRaw.includes(k))) return false
      if (searchNorm && !ilan._searchPool?.includes(searchNorm)) return false

      return true
    })
  }, [listings, selectedChip, timeFilter, onlyFavorites, favorites, onlyNotes, userNotes, searchQuery])

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 relative pb-16 font-sans w-full overflow-x-hidden">
      {newToast && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border border-emerald-500/40 backdrop-blur-md">
          <Sparkles className="size-4 animate-bounce text-emerald-200" />
          <span className="text-xs font-bold tracking-wide">Yeni İlan Düştü!</span>
        </div>
      )}

      {showAuthWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800 p-8 shadow-2xl text-center space-y-5 backdrop-blur-xl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <LogIn className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Giriş Yapmanız Gerekiyor</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Favorilere ekleme yapmak ve kendinize özel notlar kaydetmek için hesabınıza giriş yapmalısınız.
              </p>
            </div>
            <button
              onClick={() => setShowAuthWarning(false)}
              className="w-full rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground hover:opacity-95 transition-all shadow-lg shadow-primary/25 cursor-pointer active:scale-95"
            >
              Tamam, Anladım
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 p-4 sm:p-5 shadow-xl shadow-zinc-900/5 backdrop-blur-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="İl, ilçe veya yük detayına göre arayın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 py-3.5 pl-11 pr-10 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-all focus:border-primary focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-4 focus:ring-primary/10 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-2 px-2">
          {CHIP_FILTERS.map((chip) => {
            const isActive = selectedChip === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedChip(chip.id)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all shrink-0 border cursor-pointer active:scale-95 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.02]' 
                    : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            {(['all', '15m', '1h'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeFilter(t)}
                className={`rounded-xl px-3.5 py-2 text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  timeFilter === t ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {t === 'all' && 'Tüm Zamanlar'}
                {t === '15m' && '⚡ Son 15 Dk'}
                {t === '1h' && '⏰ Son 1 Saat'}
              </button>
            ))}

            {(searchQuery || selectedChip !== 'ALL' || timeFilter !== 'all' || onlyFavorites || onlyNotes) && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedChip('ALL'); setTimeFilter('all'); setOnlyFavorites(false); setOnlyNotes(false); }}
                className="flex items-center gap-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-2 text-[11px] font-bold hover:bg-rose-500/20 transition-all shrink-0 ml-1 cursor-pointer active:scale-95"
              >
                <RotateCcw className="size-3" /> Sıfırla
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const cities = searchQuery.trim() ? [searchQuery.trim()] : []
                subscribeToPushNotifications(cities, currentUser?.id)
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-2 text-[11px] font-bold transition-all w-full sm:w-auto active:scale-95 cursor-pointer shadow-sm"
            >
              <Bell className="size-3.5" />
              <span>Bildirim Aç</span>
            </button>

            <button
              type="button"
              onClick={() => fetchListings(false)}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-3 py-2 text-[11px] font-bold transition-all w-full sm:w-auto active:scale-95 text-zinc-700 dark:text-zinc-200 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
              <span>{refreshing ? 'Yenileniyor...' : 'Yenile'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setOnlyNotes(!onlyNotes); if (!onlyNotes) setOnlyFavorites(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all w-full sm:w-auto cursor-pointer active:scale-95 shadow-sm ${
                onlyNotes ? 'bg-amber-500 text-white shadow-amber-500/25' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <FileText className="size-3.5" />
              <span>Notlarım ({userNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setOnlyFavorites(!onlyFavorites); if (!onlyFavorites) setOnlyNotes(false); }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-all w-full sm:w-auto cursor-pointer active:scale-95 shadow-sm ${
                onlyFavorites ? 'bg-rose-500 text-white shadow-rose-500/25' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <Heart className={`size-3.5 ${onlyFavorites ? 'fill-white text-white' : ''}`} />
              <span>Favoriler ({favorites.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-1">
        <span>Görüntülenen İlan: <strong className="text-zinc-900 dark:text-zinc-100 font-extrabold">{filteredListings.length}</strong></span>
        <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          Canlı Akış Aktif
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 space-y-3">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-xs font-semibold text-zinc-400">Güncel lojistik ilanları yükleniyor...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 space-y-3 shadow-lg">
          <AlertCircle className="size-10" />
          <p className="text-xs font-bold">{errorMsg}</p>
          <button
            type="button"
            onClick={() => fetchListings(false)}
            className="rounded-xl bg-amber-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer active:scale-95 shadow-md"
          >
            Tekrar Dene
          </button>
        </div>
      ) : filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {filteredListings.map((ilan) => {
            const ilanKey = ilan._stableKey
            const displayContent = ilan._rawText
            const fullContent = ilan._originalRawText || displayContent
            const phones = extractPhoneNumbers(ilan, fullContent)
            const isFav = favorites.includes(ilanKey)
            const dateVal = ilan?.created_at || ilan?.ilan_tarihi
            const ilanNotes = userNotes.filter(n => n.ilan_id === ilanKey)
            const waMessage = safeEncode(`Merhaba, Nakliye Cepte üzerindeki "${displayContent.slice(0, 60)}..." ilanınız için ulaşıyorum.`)

            return (
              <div 
                key={ilanKey}
                onClick={() => setSelectedIlan(ilan)}
                className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 p-5 shadow-md hover:shadow-2xl hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5 max-w-[62%] truncate">
                      <div className="size-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm">
                        <Truck className="size-4" />
                      </div>
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate text-xs tracking-wide">
                        {ilan._sender}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                        <Clock className="size-3 text-zinc-400" />
                        {dateVal ? timeAgo(dateVal) : 'Yeni'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setNoteModalIlan(ilan); }}
                        className={`rounded-xl p-2 transition-all relative cursor-pointer active:scale-90 ${
                          ilanNotes.length > 0 
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-sm' 
                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title="Not Ekle / Gör"
                      >
                        <FileText className="size-3.5" />
                        {ilanNotes.length > 0 && (
                          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-md animate-pulse">
                            {ilanNotes.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, ilanKey)}
                        className={`rounded-xl p-2 transition-all cursor-pointer active:scale-90 ${
                          isFav ? 'bg-rose-500/10 text-rose-500 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10'
                        }`}
                        title="Favorilere Ekle"
                      >
                        <Heart className={`size-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {ilan._badges && ilan._badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ilan._badges.map((badge: any, idx: number) => (
                        <span 
                          key={idx} 
                          className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <div className="line-clamp-4">
                      <FormattedListingText text={displayContent} query={searchQuery} />
                    </div>
                    {displayContent.length > 130 && (
                      <span className="text-[11px] font-extrabold text-primary mt-2 inline-flex items-center gap-1 hover:underline">
                        <span>Devamını Oku</span>
                        <span>→</span>
                      </span>
                    )}
                  </div>

                  {ilanNotes.length > 0 && (
                    <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-3 text-[11px] text-amber-900 dark:text-amber-200 shadow-sm">
                      <span className="font-extrabold block text-[10px] mb-0.5 tracking-wider uppercase text-amber-700 dark:text-amber-400">Özel Notunuz:</span>
                      <p className="line-clamp-2 italic font-medium">{ilanNotes[0].not_metni.toLocaleUpperCase('tr-TR')}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800/80 pt-3.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopyText(e, displayContent, ilanKey)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-2.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    {copiedId === ilanKey ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-zinc-400" />}
                    <span>{copiedId === ilanKey ? 'KOPYALANDI' : 'KOPYALA'}</span>
                  </button>

                  {phones.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/90${phones[0].replace(/^0/, '')}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-[11px] font-extrabold transition-all shadow-md shadow-emerald-600/25 active:scale-95"
                        title="WhatsApp İle Yaz"
                      >
                        <MessageSquare className="size-3.5" />
                        <span>WP</span>
                      </a>

                      <a
                        href={`tel:${phones[0]}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-[11px] font-extrabold transition-all shadow-md shadow-blue-600/25 active:scale-95"
                        title="Doğrudan Ara"
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
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 space-y-3">
          <div className="size-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm">
            <MessageSquare className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">İlan Bulunamadı</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Arama kriterlerinize veya seçtiğiniz filtrelere uygun aktif bir yük ilanı bulunmuyor.
            </p>
          </div>
        </div>
      )}

      {noteModalIlan && (() => {
        const modalIlanNotes = userNotes.filter(n => n.ilan_id === noteModalIlan._stableKey)

        return (
          <div 
            onClick={() => setNoteModalIlan(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xl space-y-5 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <FileText className="size-4 text-amber-500" />
                  İlana Özel Notlarım
                </h3>
                <button 
                  type="button"
                  onClick={() => setNoteModalIlan(null)} 
                  className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Bu ilan için sadece sizin görebileceğiniz bir not ekleyin..."
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 shadow-inner"
                />
                <button
                  onClick={handleAddNote}
                  disabled={isSavingNote || !newNoteText.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 text-white py-3 text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSavingNote ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  <span>Notu Kaydet</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-zinc-400">Kayıtlı Notlar ({modalIlanNotes.length}):</span>
                {modalIlanNotes.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic text-center py-4">Bu ilana ait kayıtlı bir notunuz yok.</p>
                ) : (
                  modalIlanNotes.map((note) => (
                    <div key={note.id} className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 text-xs shadow-sm">
                      <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed break-words font-medium">{note.not_metni}</p>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-zinc-400 hover:text-rose-500 transition-colors p-1 shrink-0 cursor-pointer"
                        title="Notu Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {selectedIlan && (() => {
        const modalText = selectedIlan._originalRawText || selectedIlan._rawText
        const modalPhones = extractPhoneNumbers(selectedIlan, modalText)
        const waMessageModal = safeEncode(`Merhaba, Nakliye Cepte üzerindeki "${modalText.slice(0, 60)}..." ilanınız için ulaşıyorum.`)

        return (
          <div 
            onClick={() => setSelectedIlan(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <div className="size-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <Truck className="size-4" />
                  </div>
                  <span>İlan Detayı ({selectedIlan._sender})</span>
                </h3>
                <button 
                  type="button"
                  onClick={() => setSelectedIlan(null)} 
                  className="rounded-xl p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="p-4.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed select-text font-medium shadow-inner">
                <FormattedListingText text={modalText} query={searchQuery} />
              </div>

              {modalPhones.length > 0 && (
                <div className="flex flex-col gap-2.5 pt-2">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider">İLETİŞİM KANALLARI:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {modalPhones.map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 w-full sm:w-auto">
                        <a
                          href={`https://wa.me/90${phone.replace(/^0/, '')}?text=${waMessageModal}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-5 py-3 text-xs font-extrabold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/25 active:scale-95"
                        >
                          <MessageSquare className="size-4" />
                          <span>WHATSAPP ({phone})</span>
                        </a>
                        <a
                          href={`tel:${phone}`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white px-5 py-3 text-xs font-extrabold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 active:scale-95"
                        >
                          <Phone className="size-4" />
                          <span>TELEFONLA ARA</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
