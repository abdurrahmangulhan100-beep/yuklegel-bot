'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Ilan, Not } from './types'
import { supabase } from '@/lib/supabase'

interface StoreContextValue {
  ilanlar: Ilan[]
  notlar: Not[]
  loading: boolean
  addIlan: (ilan: Omit<Ilan, 'id' | 'ilan_tarihi'>) => Promise<void>
  addNot: (not: Omit<Not, 'id' | 'olusturma_tarihi'>) => void
  deleteNot: (id: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ilanlar, setIlanlar] = useState<Ilan[]>([])
  const [notlar, setNotlar] = useState<Not[]>([])
  const [loading, setLoading] = useState(true)

  // Supabase'den Canlı İlanları Çekme (Performans için limit eklendi)
  useEffect(() => {
    let isMounted = true

    async function fetchIlanlar() {
      try {
        const { data, error } = await supabase
          .from('ilanlar')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error
        if (data && isMounted) setIlanlar(data as Ilan[])
      } catch (err) {
        console.error('Supabase ilan çekme hatası:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchIlanlar()
    return () => { isMounted = false }
  }, [])

  const addIlan = useCallback(async (ilan: Omit<Ilan, 'id' | 'ilan_tarihi'>) => {
    try {
      const { data, error } = await supabase
        .from('ilanlar')
        .insert([ilan])
        .select()

      if (error) throw error
      if (data) setIlanlar((prev) => [data[0] as Ilan, ...prev])
    } catch (err) {
      console.error('İlan ekleme hatası:', err)
    }
  }, [])

  const addNot = useCallback((not: Omit<Not, 'id' | 'olusturma_tarihi'>) => {
    setNotlar((prev) => [{ ...not, id: `n-${Date.now()}`, olusturma_tarihi: new Date().toISOString() }, ...prev])
  }, [])

  const deleteNot = useCallback((id: string) => {
    setNotlar((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <StoreContext.Provider value={{ ilanlar, notlar, loading, addIlan, addNot, deleteNot }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore StoreProvider içinde kullanılmalıdır')
  return ctx
}
