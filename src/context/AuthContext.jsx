import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigValid } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)

  // Fetch role from user_profiles table
  async function fetchRole(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching role:', error.message)
      return null
    }
    return data?.role ?? null
  }

  const initAuth = useCallback(() => {
    if (!isConfigValid) {
      setLoading(false)
      return () => {}
    }

    let mounted = true
    setLoading(true)
    setTimedOut(false)

    // Safety timeout: if Supabase doesn't respond in 8s, show retry
    const timer = setTimeout(() => {
      if (mounted && loading) {
        setTimedOut(true)
        setLoading(false)
      }
    }, 8000)

    // Get initial session
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      clearTimeout(timer)

      try {
        const session = data?.session
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          if (mounted) setRole(r)
        }
      } catch (e) {
        console.error('Auth initialization error:', e)
      } finally {
        if (mounted) {
          setLoading(false)
          setTimedOut(false)
        }
      }
    }).catch(err => {
      console.error('Failed to get session:', err)
      if (mounted) {
        clearTimeout(timer)
        setLoading(false)
        setTimedOut(true)
      }
    })

    // Listen for auth state changes (login, logout, token refresh)
    const authRes = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          if (mounted) setRole(r)
        } else {
          setUser(null)
          setRole(null)
        }
        setLoading(false)
        setTimedOut(false)
      }
    )

    const subscription = authRes?.data?.subscription || authRes?.subscription

    return () => {
      mounted = false
      clearTimeout(timer)
      if (subscription?.unsubscribe) subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const cleanup = initAuth()
    return cleanup
  }, [initAuth])

  function retry() {
    setTimedOut(false)
    setLoading(true)
    // Re-attempt session fetch
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        const session = data?.session
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          setRole(r)
        }
      } catch (e) {
        console.error('Retry auth error:', e)
      } finally {
        setLoading(false)
      }
    }).catch(err => {
      console.error('Retry failed:', err)
      setLoading(false)
      setTimedOut(true)
    })
  }

  async function signIn(email, password) {
    if (!isConfigValid) throw new Error('Configuración de Supabase inválida.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setTimedOut(false)
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isAdmin = role === 'admin'
  const isVisor = role === 'visor'

  if (!isConfigValid && !loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <h1>Configuration Error</h1>
        <p>Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing or invalid.</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin, isVisor, signIn, signOut, isConfigValid, timedOut, retry }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
