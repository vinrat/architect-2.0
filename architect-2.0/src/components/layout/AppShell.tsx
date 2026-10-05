import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../api/auth'
import { useAppStore } from '../../store/useAppStore'
import Navbar from './Navbar'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AppShell() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const { persona, setPersona } = useAppStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        if (!persona) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('persona')
            .eq('id', data.session.user.id)
            .single()
          if (profile?.persona) setPersona(profile.persona as 'vibe' | 'code')
        }
        setAuthed(true)
      } else {
        setAuthed(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session))
    return () => listener.subscription.unsubscribe()
  }, [])

  // Keep Railway backend warm — ping every 4 minutes to prevent cold starts
  useEffect(() => {
    const ping = () => fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {})
    ping()
    const interval = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (authed === null) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#070a12' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!authed) return <Navigate to="/" replace />

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070a12' }}>
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
