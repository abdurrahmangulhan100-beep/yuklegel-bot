'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthModalOpen: boolean
  openAuthModal: (reason?: string) => void
  closeAuthModal: () => void
  signOut: () => Promise<void>
  modalReason: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [modalReason, setModalReason] = useState('')

  useEffect(() => {
    let isMounted = true

    const syncAuthState = (currentSession: Session | null) => {
      if (!isMounted) return
      const currentUser = currentSession?.user ?? null

      setSession(currentSession)
      setUser(currentUser)

      if (currentSession) {
        setIsAuthModalOpen(false)
      }
    }

    // 1. İlk yüklemede mevcut oturumu al
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        syncAuthState(session)
        if (isMounted) setLoading(false)
      })
      .catch((err) => {
        console.error('Session getirme hatası:', err)
        if (isMounted) setLoading(false)
      })

    // 2. Auth durum değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncAuthState(session)
      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const openAuthModal = (reason = 'Bu özelliği kullanmak için ücretsiz giriş yapın.') => {
    setModalReason(reason)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
    setModalReason('')
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signOut,
        modalReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth bir AuthProvider içinde kullanılmalıdır.')
  }
  return context
}
