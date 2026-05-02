import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigValid } from '../lib/supabase'

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
    if (!isConfigValid) {
      setLoading(false);
      return;
    }

    let mounted = true;
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      
      try {
        const session = data?.session;
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          setRole(r)
        }
      } catch (e) {
        console.error('Auth initialization error:', e);
      } finally {
        setLoading(false)
      }
    }).catch(err => {
      console.error('Failed to get session:', err);
      if (mounted) setLoading(false);
    })

    // Listen for auth state changes
    const authRes = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
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

    const subscription = authRes?.data?.subscription || authRes?.subscription;

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    }
  }, [])

  async function signIn(email, password) {
    if (!isConfigValid) throw new Error('Supabase configuration is invalid. Please check your environment variables.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, isAdmin, isVisor, signIn, signOut, isConfigValid }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
