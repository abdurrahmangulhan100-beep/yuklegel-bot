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
    return { ok: res.ok, ...json } as { ok: boolean; premium?: boolean; status?: string; expiresAt?: string; error?: string }
  }, [])

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setIsPremium(false); setStatus(null); setExpiresAt(null); return }
      const { data } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle()
      setIsPremium(isEntitled(data))
      setStatus(data?.status ?? null)
      setExpiresAt(data?.expires_at ?? null)

      // Yenileme / iptal takibi: süre bitmişse veya 1 günden az kaldıysa Google'dan tekrar sor
      if (data && (!data.expires_at || new Date(data.expires_at).getTime() - Date.now() < 86400000)) {
        const r = await callVerify()
        if (r?.ok) {
          setIsPremium(!!r.premium)
          setStatus(r.status ?? null)
          setExpiresAt(r.expiresAt ?? null)
        }
      }
    } catch (e) {
      console.error("Premium durumu alınamadı:", e)
    } finally {
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
      const r = await callVerify(mine.purchaseToken)
      if (r?.ok && r.premium) { setMessage("Premium aboneliğiniz geri yüklendi."); await load() }
      else setMessage(r?.error || "Abonelik doğrulanamadı.")
    } catch (e) {
      const err = e as { name?: string; message?: string }
      setMessage(`Geri yükleme başarısız: ${err?.name || ""} ${err?.message || ""}`)
    } finally {
      setBusy(false)
    }
  }, [callVerify, load])

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
      const r = await callVerify(purchaseToken)
      if (r?.ok && r.premium) {
        await response.complete("success")
        setMessage("Premium aktif! Teşekkürler.")
        await load()
      } else {
        await response.complete("fail")
        setMessage(r?.error || "Satın alma doğrulanamadı. Ücret alındıysa birkaç dakika sonra 'Satın alımı geri yükle' deneyin.")
      }
    } catch (e) {
      const name = (e as { name?: string })?.name
      if (name !== "AbortError" && name !== "NotAllowedError") setMessage("Satın alma başlatılamadı. Lütfen tekrar deneyin.")
    } finally {
      setBusy(false)
    }
  }, [callVerify, load])

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
          if (r?.ok && r.premium) await load()
        }
      } catch {}
    })()
  }, [loading, isPremium, canBuyHere, callVerify, load])

  const value = useMemo(
    () => ({ isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore, refresh: load }),
    [isPremium, loading, status, expiresAt, canBuyHere, busy, message, price, buy, restore, load]
  )

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
}
