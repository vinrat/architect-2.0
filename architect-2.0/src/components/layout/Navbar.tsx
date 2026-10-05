import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { signOut } from '../../api/auth'
import { useAppStore } from '../../store/useAppStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeModel, activeModelId, setModel } = useAppStore()
  const { isStreaming, restartStream } = useWorkspaceStore()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [pendingModel, setPendingModel] = useState<{ label: string; id: string } | null>(null)
  const isWorkspace = location.pathname.startsWith('/workspace')

  const MODELS = [
    { label: 'Claude Haiku 4.5',  id: 'claude-haiku-4-5-20251001',   icon: '⚡', color: 'text-orange-400', note: 'Fastest' },
    { label: 'Claude Sonnet 4.5', id: 'claude-sonnet-4-5-20250929',   icon: '🔥', color: 'text-orange-400', note: 'Balanced' },
    { label: 'Claude Sonnet 4.6', id: 'claude-sonnet-4-6',            icon: '🧠', color: 'text-orange-400', note: 'Best reasoning' },
  ]

  const handleSignOut = async () => {
    try { await signOut() } catch {}
    navigate('/')
  }

  return (
    <header className="h-14 border-b border-dark-border bg-dark-panel px-4 flex items-center justify-between shrink-0 z-30">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        {isWorkspace && (
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-xs transition flex items-center gap-1">
            <i className="fa-solid fa-arrow-left" /> Hub
          </button>
        )}
        {!isWorkspace && (
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent-purple via-brand-500 to-accent-cyan flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-white text-xs" />
            </div>
            <span className="font-extrabold text-sm text-white">
              Architect <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-500 border border-brand-500/30">2.0</span>
            </span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Model selector — workspace only */}
        {isWorkspace && (
          <div className="relative">
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="flex items-center space-x-2 bg-dark-card border border-dark-border hover:border-accent-purple/50 px-3 py-1.5 rounded-lg text-xs text-white transition"
            >
              <i className="fa-solid fa-microchip text-accent-purple text-[11px]" />
              <span>{activeModel}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-gray-400" />
            </button>
            {modelOpen && (
              <div className="absolute right-0 top-9 w-56 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 p-1 space-y-0.5">

                {/* Mid-stream warning */}
                {pendingModel ? (
                  <div className="p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-accent-amber text-sm shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-white">Switch model mid-generation?</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Switching to <span className="text-white font-medium">{pendingModel.label}</span> will stop the current generation and restart from scratch.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPendingModel(null); setModelOpen(false) }}
                        className="flex-1 py-1.5 text-[11px] font-medium text-gray-300 bg-dark-bg border border-dark-border rounded-lg hover:border-gray-500 transition"
                      >
                        Keep current
                      </button>
                      <button
                        onClick={() => {
                          setModel(pendingModel.label, pendingModel.id)
                          restartStream()
                          setPendingModel(null)
                          setModelOpen(false)
                        }}
                        className="flex-1 py-1.5 text-[11px] font-medium text-white bg-accent-amber/20 border border-accent-amber/40 rounded-lg hover:bg-accent-amber/30 transition"
                      >
                        Switch &amp; restart
                      </button>
                    </div>
                  </div>
                ) : (
                  MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        if (isStreaming && m.id !== activeModelId) {
                          setPendingModel(m)
                        } else {
                          setModel(m.label, m.id)
                          setModelOpen(false)
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 hover:bg-dark-hover ${activeModelId === m.id ? 'text-white bg-dark-hover' : 'text-gray-400'}`}
                    >
                      <span>{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.label}</p>
                        <p className="text-[10px] text-gray-500">{m.note}</p>
                      </div>
                      {activeModelId === m.id && <i className="fa-solid fa-check text-accent-emerald text-[10px] shrink-0" />}
                      {isStreaming && m.id !== activeModelId && (
                        <i className="fa-solid fa-triangle-exclamation text-accent-amber text-[10px] shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* GitHub button */}
        <button
          onClick={() => navigate('/settings/github')}
          className="text-xs text-gray-300 hover:text-white bg-dark-card hover:bg-dark-hover px-3 py-1.5 rounded-lg border border-dark-border transition hidden sm:flex items-center space-x-2"
        >
          <i className="fa-brands fa-github text-sm" /><span>GitHub</span>
        </button>

        {/* Avatar */}
        <div className="relative">
          <div onClick={() => setAvatarOpen(!avatarOpen)} className="flex items-center space-x-2 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan flex items-center justify-center text-white font-bold text-xs">AD</div>
            <i className="fa-solid fa-chevron-down text-[9px] text-gray-400" />
          </div>
          {avatarOpen && (
            <div className="absolute right-0 top-10 w-44 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 p-1 space-y-0.5">
              <button onClick={() => { navigate('/settings'); setAvatarOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-dark-hover hover:text-white transition flex items-center space-x-2">
                <i className="fa-solid fa-user w-4 text-brand-500" /><span>Profile</span>
              </button>
              <button onClick={() => { navigate('/settings/models'); setAvatarOpen(false) }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-dark-hover hover:text-white transition flex items-center space-x-2">
                <i className="fa-solid fa-microchip w-4 text-accent-purple" /><span>Settings</span>
              </button>
              <div className="border-t border-dark-border my-1" />
              <button onClick={handleSignOut} className="w-full text-left px-3 py-2 rounded-lg text-xs text-accent-rose hover:bg-accent-rose/10 transition flex items-center space-x-2">
                <i className="fa-solid fa-right-from-bracket w-4" /><span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
