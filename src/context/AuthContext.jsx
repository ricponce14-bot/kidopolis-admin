import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  console.log('AuthContext State:', { user: !!user, role, loading });

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
    let mounted = true;
    
    // Safety timeout: if auth doesn't resolve in 10s, stop loading
    const timer = setTimeout(() => {
      if (mounted) {
        console.warn('Auth timeout reached');
        setLoading(false);
      }
    }, 10000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      
      try {
        const session = data?.session;
        if (error) console.error('Supabase getSession error:', error.message);
        
        if (session?.user) {
          setUser(session.user)
          const r = await fetchRole(session.user.id)
          setRole(r)
        }
      } catch (e) {
        console.error('Error in auth initialization:', e);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Failed to get session:', err);
      if (mounted) {
        clearTimeout(timer);
        setLoading(false);
      }
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
      clearTimeout(timer);
      if (subscription?.unsubscribe) subscription.unsubscribe();
    }
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
