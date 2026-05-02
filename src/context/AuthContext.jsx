import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data, error }) => {
      const session = data?.session;
      if (error) {
        console.error('Supabase Auth Error:', error.message)
      }
      if (session?.user) {
        setUser(session.user)
        const r = await fetchRole(session.user.id)
        setRole(r)
      }
      setLoading(false)
    }).catch(err => {
      console.error('Unexpected Auth Error:', err)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          setRole(r)
        } else {
          setUser(null)
          setRole(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isAdmin = role === 'admin'
  const isVisor = role === 'visor'

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin, isVisor, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
