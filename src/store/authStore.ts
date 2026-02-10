import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'employee'
  created_at: string
  username?: string
}

interface SubUser {
  id: string
  username: string
  full_name: string
  role: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  subUser: SubUser | null
  isSubUser: boolean
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setSubUser: (subUser: SubUser | null) => void
  setIsSubUser: (isSubUser: boolean) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signInSubUser: (adminEmail: string, username: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'employee') => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  subUser: null,
  isSubUser: false,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSubUser: (subUser) => set({ subUser }),
  setIsSubUser: (isSubUser) => set({ isSubUser }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      set({ user: data.user, isSubUser: false, subUser: null })
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileData) {
        set({ profile: profileData })
      }
    }
  },

  signInSubUser: async (adminEmail: string, username: string, password: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sub-user-auth/authenticate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_email: adminEmail,
          username,
          password,
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Erreur de connexion')
    }

    const { data } = result

    if (data.is_admin) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      set({
        user: data.user,
        profile: null,
        isSubUser: false,
        subUser: null,
        loading: false,
      })

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileData) {
        set({ profile: profileData })
      }
    } else if (data.authenticated) {
      localStorage.setItem('subUserAuth', JSON.stringify({
        adminEmail: data.admin_email,
        adminId: data.admin_id,
        subUser: data.sub_user,
      }))

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        throw new Error(`Erreur de configuration de la session: ${sessionError.message}`);
      }

      set({
        user: data.user,
        profile: {
          id: data.admin_id,
          email: data.admin_email,
          full_name: data.sub_user.full_name,
          role: data.sub_user.role as 'admin' | 'employee',
          created_at: new Date().toISOString(),
        },
        isSubUser: true,
        subUser: data.sub_user,
        loading: false,
      })
    }
  },

  signUp: async (email: string, password: string, fullName: string, role: 'admin' | 'employee') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role,
        })

      if (profileError) throw profileError
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('subUserAuth')
    set({ user: null, profile: null, subUser: null, isSubUser: false })
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error
    if (data) set({ profile: data })
  },
}))
