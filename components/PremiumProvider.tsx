"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PLAY_BILLING, PREMIUM_SKU } from "@/lib/premium"

type PremiumState = {
  isPremium: boolean
  loading: boolean
  status: string | null
  expiresAt: string | null
  /** Satın alma yalnızca Google Play uygulaması (TWA) içinde çalışır */
  canBuyHere: boolean
  busy: boolean
  message: string | null
  price: string | null
  buy: () => Promise<void>
  restore: () => Promise<void>
  refresh: () => Promise<void>
}

const PremiumContext = createContext<PremiumState>({
  isPremium: false,
  loading: true,
  status: null,
  expiresAt: null,
  canBuyHere: false,
  busy: false,
  message: null,
  price: null,
  buy: async () => {},
  restore: async () => {},
  refresh: async () => {},
})

export const usePremium = () => useContext(PremiumContext)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getService = async (): Promise<any | null> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  if (typeof w.getDigitalGoodsService !== "function") return null
  try {
    return await w.getDigitalGoodsService(PLAY_BILLING)
  } catch {
    return null
  }
}

const isEntitled = (row: { status?: string; expires_at?: string | null } | null) =>
  !!row &&
  ["active", "grace", "canceled"].includes(String(row.status)) &&
  (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [canBuyHere, setCanBuyHere] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [price, setPrice] = useState<string | null>(null)
  const restoredFor = useRef<string | null>(null)
  const loadingRef = useRef(false) // aynı anda birden fazla doğrulama isteği gitmesin
  const lastLoad = useRef(0)

  const callVerify = useCallback(async (purchaseToken?: string) => {
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    // Statik yayında sunucu rotası yok: doğrulama Supabase Edge Function üzerinden yapılır
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const res = await fetch(`${base}/functions/v1/premium-verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify(purchaseToken ? { purchaseToken } : {}),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, ...json } as { ok: boolean; premium?: boolean; status?: string; expiresAt?: string; error?: string; pending?: boolean }
  }, [])

  // Doğrulama sonucunu doğrudan uygular: load() başka bir istek sürerken hemen dönüyordu ve satın alan kullanıcı Premium'u geç görüyordu
  const applyResult = useCallback((r: { premium?: boolean; status?: string; expiresAt?: string } | null | undefined) => {
    if (!r) return
    setIsPremium(!!r.premium)
    setStatus(r.status ?? null)
    setExpiresAt(r.expiresAt ?? null)
  }, [])

  // Satın almadan hemen sonra Google kaydı birkaç saniye geç görünebilir veya ağ takılabilir: 3 kez dener
  const verifyWithRetry = useCallback(async (purchaseToken: string) => {
    let last: Awaited<ReturnType<typeof callVerify>> = null
    for (let i = 0; i < 3; i++) {
      try { last = await callVerify(purchaseToken) } catch { last = null }
      if (last?.ok && (last.premium || last.pending)) return last // bekleyen ödemede tekrar denemek faydasız
      if (last && !last.ok && (last as { error?: string }).error?.includes("başka bir hesaba")) return last // tekrar denemenin anlamı yok
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)))
    }
    return last
  }, [callVerify])

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    if (loadingRef.current) return
    loadingRef.current = true
    lastLoad.current = Date.now()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setIsPremium(false); setStatus(null); setExpiresAt(null); return }
      const { data } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle()
      let entitled = isEntitled(data)
      setIsPremium(entitled)
      setStatus(data?.status ?? null)
      setExpiresAt(data?.expires_at ?? null)

      // Yenileme / iptal takibi: süre bitmişse veya 1 günden az kaldıysa Google'dan tekrar sor
      if (data && (!data.expires_at || new Date(data.expires_at).getTime() - Date.now() < 86400000)) {
        const r = await callVerify()
        if (r?.ok) {
          entitled = !!r.premium
          setIsPremium(entitled)
          setStatus(r.status ?? null)
          setExpiresAt(r.expiresAt ?? null)
        }
      }
    } catch (e) {
      console.error("Premium durumu alınamadı:", e)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [callVerify])

  const restore = useCallback(async () => {
    setMessage(null)
    const service = await getService()
    if (!service) { setMessage("Satın alımları geri yüklemek için Google Play uygulamasını kullanın."); return }
    setBusy(true)
    try {
      const purchases: { itemId: string; purchaseToken: string }[] = await service.listPurchases()
      const mine = purchases.find((p) => p.itemId === PREMIUM_SKU)
      if (!mine) { setMessage("Bu Google hesabında aktif bir abonelik bulunamadı."); return }
      const r = await verifyWithRetry(mine.purchaseToken)
      if (r?.ok && r.premium) { applyResult(r); setMessage("Premium aboneliğiniz geri yüklendi.") }
      else if (r?.ok && r.pending) setMessage("Ödemeniz hâlâ onay bekliyor. Onaylanınca Premium otomatik açılır.")
      else setMessage(r?.error || "Abonelik doğrulanamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.")
    } catch (e) {
      const err = e as { name?: string; message?: string }
      setMessage(`Geri yükleme başarısız: ${err?.name || ""} ${err?.message || ""}`)
    } finally {
      setBusy(false)
    }
  }, [verifyWithRetry, applyResult])

  const buy = useCallback(async () => {
    setMessage(null)
    const service = await getService()
    if (!service) { setMessage("Premium satın alımı yalnızca Google Play'den indirilen uygulamada yapılabilir."); return }
    if (!supabase || !(await supabase.auth.getSession()).data.session) { setMessage("Satın almak için giriş yapın."); return }
    setBusy(true)
    try {
      // Google Play Faturalandırma örneğiyle aynı: details parametresi verilmez
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const request = new (PaymentRequest as any)([{ supportedMethods: PLAY_BILLING, data: { sku: PREMIUM_SKU } }])
      const response = await request.show()
      const purchaseToken: string | undefined = (response.details as { purchaseToken?: string }).purchaseToken
      if (!purchaseToken) { await response.complete("fail"); setMessage("Satın alma tamamlanamadı."); return }
      const r = await verifyWithRetry(purchaseToken)
      if (r?.ok && r.premium) {
        applyResult(r) // Premium anında açılır
        await response.complete("success")
        setMessage("Premium aktif! Tüm özellikler açıldı, teşekkürler.")
      } else if (r?.ok && r.pending) {
        await response.complete("unknown")
        setMessage("Ödemeniz onay bekliyor. Google onaylayınca Premium otomatik açılır; uygulamayı kapatıp açabilirsiniz.")
      } else {
        // Ödeme alınmış olabilir: "fail" demek yerine durumu belirsiz bırak, kullanıcı geri yükleyebilsin
        await response.complete("unknown")
        setMessage(r?.error || "Ödemeniz alındı ancak doğrulama tamamlanamadı. Birkaç dakika sonra 'Satın alımı geri yükle'ye dokunun; ücret tekrar alınmaz.")
      }
    } catch (e) {
      const err = e as { name?: string; message?: string }
      if (err?.name !== "AbortError" && err?.name !== "NotAllowedError") {
        setMessage(`Satın alma başlatılamadı: ${err?.name || ""} ${err?.message || ""}`)
      }
    } finally {
      setBusy(false)
    }
  }, [verifyWithRetry, applyResult])

  // İlk yükleme + oturum değişimi
  useEffect(() => {
    load()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") { setIsPremium(false); setStatus(null); setExpiresAt(null); restoredFor.current = null; return }
      if (session) load()
    })
    return () => data.subscription.unsubscribe()
  }, [load])

  // Süre dolduğu anda (oturum açıkken) Premium'u kapat / yenilenmişse yeni süreyi al
  useEffect(() => {
    if (!isPremium || !expiresAt) return
    const id = setInterval(() => {
      if (new Date(expiresAt).getTime() <= Date.now() + 1000) load()
    }, 15000)
    return () => clearInterval(id)
  }, [isPremium, expiresAt, load])

  // Uygulamaya geri dönülünce (arka plandan) durumu tazele
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > 60_000) load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load])

  // Play içinde: fiyatı çek, yeni cihazda/oturumda mevcut aboneliği otomatik geri yükle
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const service = await getService()
      if (!service || cancelled) return
      setCanBuyHere(true)
      try {
        const details = await service.getDetails([PREMIUM_SKU])
        const p = details?.[0]?.price
        if (p && !cancelled) {
          setPrice(new Intl.NumberFormat("tr-TR", { style: "currency", currency: p.currency }).format(Number(p.value)))
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (loading || isPremium || !canBuyHere || !supabase) return
    ;(async () => {
      const { data: { session } } = await supabase!.auth.getSession()
      if (!session || restoredFor.current === session.user.id) return
      restoredFor.current = session.user.id
      const service = await getService()
      if (!service) return
      try {
        const purchases: { itemId: string; purchaseToken: string }[] = await service.listPurchases()
        const mine = purchases.find((p) => p.itemId === PREMIUM_SKU)
        if (mine) {
          const r = await callVerify(mine.purchaseToken)
          if (r?.ok && r.premium) applyResult(r)
        }
      } catch {}
    })()
  }, [loading, isPremium, canBuyHere, callVerify, applyResult])

  const value = useMemo(
    () => ({ isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore, refresh: load }),
    [isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore, load]
  )

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
}
