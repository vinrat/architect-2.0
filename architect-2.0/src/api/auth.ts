import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/onboarding`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })

export const signInWithEmail = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUpWithEmail = (email: string, password: string, firstName?: string, lastName?: string) =>
  supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: [firstName, lastName].filter(Boolean).join(' ') || email },
    },
  })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
