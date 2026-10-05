import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../api/auth'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('test@architect.com')
  const [password, setPassword] = useState('Test1234!')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
    // on success Supabase redirects the browser automatically — no navigate() needed
  }

  const handleSubmit = async () => {
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    setError('')
    try {
      if (tab === 'signin') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        const { error } = await signUpWithEmail(email, password, firstName, lastName)
        if (error) throw error
        navigate('/onboarding')
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Demo bypass — skip auth for demo purposes
  const handleDemo = () => navigate('/onboarding')

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 animate-[fadeUp_0.4s_ease-out]">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-dark-card px-4 py-2 rounded-full border border-dark-border">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-accent-purple via-brand-500 to-accent-cyan flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-white text-[10px]" />
            </div>
            <span className="font-bold text-sm text-white">
              Architect <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-500 border border-brand-500/30">2.0</span>
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
          <p className="text-xs text-gray-400">Sign in to your workspace or create a new account.</p>
        </div>

        {/* Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4 shadow-2xl">
          {/* Google */}
          <button onClick={handleGoogle} className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm py-2.5 rounded-xl transition shadow">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="flex-1 h-px bg-dark-border" />
            <span className="text-[11px] text-gray-500">or</span>
            <div className="flex-1 h-px bg-dark-border" />
          </div>

          {/* Tabs */}
          <div className="flex bg-dark-bg rounded-xl p-1 border border-dark-border">
            {(['signin', 'signup'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t ? 'bg-dark-card text-white' : 'text-gray-400'}`}>
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-3">
            {tab === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">First Name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dev"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition" />
                </div>
              </div>
            )}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition" />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition" />
            </div>
            {error && <p className="text-xs text-accent-rose">{error}</p>}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white font-semibold text-xs rounded-xl shadow-lg transition disabled:opacity-50">
              {loading ? 'Loading...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={handleDemo} className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition">
              Continue as Guest (Demo) →
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-500">
          By continuing you agree to our <span className="text-brand-500 cursor-pointer hover:underline">Terms</span> and <span className="text-brand-500 cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
