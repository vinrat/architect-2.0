import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../api/auth'

type Tab = 'profile' | 'models' | 'apikeys' | 'github' | 'billing'

const TABS = [
  { id: 'profile', label: 'Profile',  icon: 'fa-user',             color: 'text-brand-500' },
  { id: 'models',  label: 'Models',   icon: 'fa-microchip',        color: 'text-accent-purple' },
  { id: 'apikeys', label: 'API Keys', icon: 'fa-key',              color: 'text-accent-amber' },
  { id: 'github',  label: 'GitHub',   icon: 'fa-brands fa-github', color: 'text-white' },
  { id: 'billing', label: 'Billing',  icon: 'fa-credit-card',      color: 'text-accent-emerald' },
]

const MODELS = [
  { name: 'Claude Haiku 4.5',  provider: 'Anthropic · Bedrock', note: 'Fastest, default',      icon: '⚡', isDefault: true  },
  { name: 'Claude Sonnet 4',   provider: 'Anthropic · Bedrock', note: 'Best reasoning',         icon: '🔥', isDefault: false },
  { name: 'GPT-4o',            provider: 'OpenAI',              note: 'Best for speed',         icon: '🧠', isDefault: false },
  { name: 'Gemini 1.5 Pro',    provider: 'Google',              note: 'Best for long context',  icon: '💎', isDefault: false },
  { name: 'Llama 3.1 70B',     provider: 'Meta',                note: 'Open-source',            icon: '🦙', isDefault: false },
]

// Dummy GitHub connected state
const GITHUB_CONNECTED_MOCK = {
  username: 'vinodkumar-dev',
  avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
  repos: 12,
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { tab: tabParam } = useParams<{ tab?: string }>()
  const [activeTab, setActiveTab] = useState<Tab>((tabParam as Tab) || 'profile')

  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')

  // GitHub state
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubConnecting, setGithubConnecting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', session.user.id)
        .single()
      if (data) {
        const parts = (data.name || '').split(' ')
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' ') || '')
        setEmail(data.email || session.user.email || '')
      }
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    setSaveMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    const name = [firstName, lastName].filter(Boolean).join(' ')
    await supabase.from('profiles').update({ name, email }).eq('id', session.user.id)
    setSaving(false)
    setSaveMsg('Saved!')
    setTimeout(() => setSaveMsg(''), 2500)
  }

  const connectGitHub = () => {
    setGithubConnecting(true)
    // Simulate OAuth flow
    setTimeout(() => {
      setGithubConnecting(false)
      setGithubConnected(true)
    }, 2000)
  }

  const avatarInitial = [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase() || '?'

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg">
      <header className="h-16 border-b border-dark-border bg-dark-panel/80 px-6 flex items-center space-x-3 shrink-0 sticky top-0 z-30 backdrop-blur-md">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition text-xs flex items-center gap-1">
          <i className="fa-solid fa-arrow-left" /> Back
        </button>
        <div className="h-4 w-px bg-dark-border" />
        <span className="font-bold text-sm text-white">Settings</span>
      </header>

      <main className="max-w-4xl w-full mx-auto p-6 md:p-10 flex gap-8">

        {/* Sidebar */}
        <div className="w-44 shrink-0 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                activeTab === t.id
                  ? 'bg-dark-card text-white border border-dark-border'
                  : 'text-gray-400 hover:text-white hover:bg-dark-card'
              }`}
            >
              <i className={`${t.icon} ${t.color}`} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan flex items-center justify-center text-white font-bold text-lg select-none">
                  {avatarInitial}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}</p>
                  <p className="text-xs text-gray-400">{email || 'your@email.com'}</p>
                  <button className="text-[11px] text-brand-500 hover:underline mt-1">Change avatar</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">First Name</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Last Name</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Email</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {saveMsg && <span className="text-xs text-accent-emerald"><i className="fa-solid fa-check mr-1" />{saveMsg}</span>}
              </div>
            </div>
          )}

          {/* ── MODELS ── */}
          {activeTab === 'models' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white">Default Model</p>
              <p className="text-xs text-gray-400">Set your default model for all agents.</p>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <div key={m.name} className={`bg-dark-card border ${m.isDefault ? 'border-brand-500/40' : 'border-dark-border hover:border-gray-600'} rounded-xl p-4 flex items-center justify-between cursor-pointer transition`}>
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{m.name}</p>
                        <p className="text-[11px] text-gray-400">{m.provider} · {m.note}</p>
                      </div>
                    </div>
                    {m.isDefault
                      ? <span className="text-[10px] bg-brand-500/20 text-brand-500 px-2 py-0.5 rounded border border-brand-500/30">Default</span>
                      : <button className="text-[10px] text-gray-400 hover:text-white border border-dark-border px-2 py-0.5 rounded transition">Set Default</button>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── API KEYS ── */}
          {activeTab === 'apikeys' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white">API Keys</p>
              <p className="text-xs text-gray-400">Keys are encrypted at rest and never exposed in logs.</p>
              {['Anthropic', 'OpenAI', 'Google AI'].map((provider) => (
                <div key={provider} className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-2">
                  <label className="text-[11px] text-gray-400">{provider} API Key</label>
                  <div className="flex space-x-2">
                    <input type="password" placeholder="sk-..." className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500" />
                    <button className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-500 transition">Save</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── GITHUB ── */}
          {activeTab === 'github' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-white">GitHub Integration</p>
                <p className="text-xs text-gray-400 mt-1">Connect your GitHub account to import repos and push generated code.</p>
              </div>

              {!githubConnected ? (
                <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center">
                    <i className="fa-brands fa-github text-white text-2xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Connect GitHub</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Authorize Architect to read your repos, create branches, and push generated code.
                    </p>
                  </div>
                  <button
                    onClick={connectGitHub}
                    disabled={githubConnecting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-100 disabled:opacity-60 text-gray-900 text-xs font-semibold rounded-xl transition"
                  >
                    {githubConnecting
                      ? <><div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Connecting...</>
                      : <><i className="fa-brands fa-github text-base" /> Connect with GitHub</>
                    }
                  </button>
                  <p className="text-[10px] text-gray-500">
                    Scopes requested: <code className="text-gray-400">repo</code>, <code className="text-gray-400">read:user</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected account */}
                  <div className="bg-dark-card border border-accent-emerald/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center overflow-hidden">
                        <i className="fa-brands fa-github text-white text-lg" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">@{GITHUB_CONNECTED_MOCK.username}</p>
                          <span className="text-[10px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 px-1.5 py-0.5 rounded">Connected</span>
                        </div>
                        <p className="text-[11px] text-gray-400">{GITHUB_CONNECTED_MOCK.repos} repositories accessible</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setGithubConnected(false)}
                      className="text-[11px] text-accent-rose hover:text-red-400 border border-accent-rose/30 hover:border-red-400/50 px-2.5 py-1 rounded-lg transition"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Permissions */}
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-2">
                    <p className="text-[11px] font-semibold text-gray-300">Active permissions</p>
                    {[
                      { icon: 'fa-code-branch', label: 'Read & write repositories', granted: true },
                      { icon: 'fa-user',         label: 'Read user profile',         granted: true },
                      { icon: 'fa-webhook',      label: 'Manage webhooks',           granted: false },
                    ].map((p) => (
                      <div key={p.label} className="flex items-center gap-2 text-[11px]">
                        <i className={`fa-solid ${p.icon} w-4 ${p.granted ? 'text-accent-emerald' : 'text-gray-500'}`} />
                        <span className={p.granted ? 'text-gray-300' : 'text-gray-500'}>{p.label}</span>
                        {!p.granted && <span className="text-[10px] text-gray-600 ml-auto">Not granted</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BILLING ── */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-white">Billing & Plan</p>
              <div className="bg-dark-card border border-brand-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Free Plan</p>
                    <p className="text-xs text-gray-400">5 projects · 100k tokens/month</p>
                  </div>
                  <span className="text-[10px] bg-brand-500/20 text-brand-500 border border-brand-500/30 px-2 py-0.5 rounded">Current</span>
                </div>
                <button className="w-full py-2 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-xs font-semibold rounded-xl transition">
                  Upgrade to Pro — $20/month
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
