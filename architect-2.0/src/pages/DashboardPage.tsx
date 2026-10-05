import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { supabase } from '../api/auth'
import type { Project } from '../types'
import ImportGithubModal from '../components/modals/ImportGithubModal'
import BuildModeModal from '../components/modals/BuildModeModal'
import ClarificationModal from '../components/modals/ClarificationModal'

const FRAMEWORKS = [
  { value: 'langgraph',  label: 'LangGraph (Multi-Agent State)' },
  { value: 'crewai',     label: 'CrewAI (Role-Based Swarms)' },
  { value: 'pydanticai', label: 'PydanticAI (Production Type-Safe)' },
  { value: 'autogen',    label: 'AutoGen (Conversational)' },
  { value: 'custom',     label: 'Custom Agent Runtime' },
]

const COLORS = ['cyan', 'brand', 'purple', 'cyan', 'brand', 'purple']

const colorMap: Record<string, string> = {
  cyan:   'border-accent-cyan/50 text-accent-cyan bg-accent-cyan/10',
  brand:  'border-brand-500/50 text-brand-500 bg-brand-500/10',
  purple: 'border-accent-purple/50 text-accent-purple bg-accent-purple/10',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { setProject } = useWorkspaceStore()
  const [prompt, setPrompt] = useState('')
  const [framework, setFramework] = useState('langgraph')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [promptError, setPromptError] = useState(false)
  const [showBuildMode, setShowBuildMode] = useState(false)
  const [showClarification, setShowClarification] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'vibe' | 'code' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setProjects(data) })
  }, [])

  const handleSynthesize = () => {
    if (!prompt.trim()) { setPromptError(true); return }
    setPromptError(false)
    setShowBuildMode(true)
  }

  const createProject = async (mode: 'vibe' | 'code') => {
    setShowBuildMode(false)
    setSelectedMode(mode)
    setShowClarification(true)
  }

  const createProjectWithPrompt = async (finalPrompt: string) => {
    setShowClarification(false)
    const mode = selectedMode || 'vibe'
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        name: prompt.trim().substring(0, 60),
        framework,
        prompt: finalPrompt,
        status: 'active',
        persona: mode,
      })
      .select()
      .single()
    setLoading(false)
    if (data) {
      setProject(data.id, data.name)
      navigate(`/workspace/${data.id}`)
    } else {
      console.error('Failed to create project:', error)
    }
  }

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    setDeletingId(id)
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteId(null)
  }

  const openProject = (p: Project) => {
    setProject(p.id, p.name)
    navigate(`/workspace/${p.id}`)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} mins ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`
  }

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg">
      <main className="max-w-6xl w-full mx-auto p-6 md:p-10 space-y-10">

        {/* Hero prompt */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">What are we building today?</h1>
          <p className="text-xs md:text-sm text-gray-400">Describe an AI app, import a repo, or pick a framework to synthesize an autonomous agent swarm.</p>
          <div className="glass p-2 rounded-2xl border border-dark-border shadow-2xl space-y-2">
            <div className="flex items-center space-x-2 px-3 py-2">
              <i className="fa-solid fa-wand-magic-sparkles text-accent-purple text-lg" />
              <input
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); if (e.target.value.trim()) setPromptError(false) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSynthesize()}
                placeholder="e.g. Build an autonomous arXiv paper summarizer that posts summaries to Discord..."
                className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-500"
              />
            </div>
            {promptError && (
              <p className="text-[11px] text-accent-rose px-3 pb-1 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation" /> Please describe what you want to build first.
              </p>
            )}
            <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t px-2 ${promptError ? 'border-accent-rose/40' : 'border-dark-border'}`}>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-gray-400"><i className="fa-solid fa-cubes text-accent-cyan mr-1" /> Framework:</span>
                <select value={framework} onChange={(e) => setFramework(e.target.value)}
                  className="bg-dark-card text-xs text-white border border-dark-border rounded-lg px-2.5 py-1.5 focus:border-brand-500 outline-none">
                  {FRAMEWORKS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <button onClick={handleSynthesize} disabled={loading}
                className="bg-gradient-to-r from-brand-600 via-accent-purple to-accent-cyan hover:opacity-90 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50">
                {loading ? <><span>Creating...</span><i className="fa-solid fa-spinner fa-spin" /></> : <><span>Synthesize App</span><i className="fa-solid fa-bolt" /></>}
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => setShowImport(true)} className="bg-dark-card hover:bg-dark-hover p-4 rounded-xl border border-dark-border transition cursor-pointer flex items-center space-x-4 group">
            <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-white text-lg group-hover:border-accent-cyan transition">
              <i className="fa-brands fa-github" />
            </div>
            <div><h3 className="text-xs font-bold text-white">Import GitHub Repo</h3><p className="text-[11px] text-gray-400">Bring existing code into Architect</p></div>
          </div>
          <div onClick={() => navigate('/templates')} className="bg-dark-card hover:bg-dark-hover p-4 rounded-xl border border-dark-border transition cursor-pointer flex items-center space-x-4 group">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple text-lg group-hover:border-accent-purple transition">
              <i className="fa-solid fa-clone" />
            </div>
            <div><h3 className="text-xs font-bold text-white">Clone Starter Template</h3><p className="text-[11px] text-gray-400">RAG, Autonomous Search, or Chatbots</p></div>
          </div>
          <div onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setPromptError(true) }} className="bg-dark-card hover:bg-dark-hover p-4 rounded-xl border border-dark-border transition cursor-pointer flex items-center space-x-4 group">
            <div className="w-10 h-10 rounded-lg bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald text-lg group-hover:border-accent-emerald transition">
              <i className="fa-solid fa-robot" />
            </div>
            <div><h3 className="text-xs font-bold text-white">Custom Agent Builder</h3><p className="text-[11px] text-gray-400">Blank canvas orchestration</p></div>
          </div>
        </div>

        {/* Recent projects */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-brand-500" /><span>Recent Workspaces</span>
            </h2>
            <span className="text-xs text-gray-400">{projects.length} Active Projects</span>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border border-dashed border-dark-border rounded-2xl">
              <i className="fa-solid fa-robot text-3xl mb-3 block text-gray-600" />
              <p className="text-sm font-medium text-gray-400">No projects yet</p>
              <p className="text-xs mt-1">Type a prompt above and hit Synthesize App to create your first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {projects.map((p, i) => {
                const color = COLORS[i % COLORS.length]
                return (
                  <div key={p.id} onClick={() => confirmDeleteId === p.id ? null : openProject(p)}
                    className="bg-dark-card border border-dark-border hover:border-brand-500/50 rounded-2xl p-5 transition cursor-pointer flex flex-col justify-between space-y-4 group relative">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-white group-hover:text-brand-500 transition flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-accent-emerald" />{p.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${colorMap[color]}`}>{p.framework}</span>
                          {/* Delete button — appears on hover */}
                          {confirmDeleteId !== p.id && (
                            <button
                              onClick={(e) => deleteProject(e, p.id)}
                              disabled={deletingId === p.id}
                              className="opacity-0 group-hover:opacity-100 transition w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-accent-rose hover:bg-accent-rose/10"
                            >
                              <i className="fa-solid fa-trash text-[10px]" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{p.description || p.prompt || 'No description'}</p>
                    </div>

                    {/* Confirm delete overlay */}
                    {confirmDeleteId === p.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute inset-0 bg-dark-card/95 rounded-2xl flex flex-col items-center justify-center gap-3 p-4 border border-accent-rose/30"
                      >
                        <i className="fa-solid fa-triangle-exclamation text-accent-rose text-xl" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-white">Delete this project?</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">This cannot be undone.</p>
                        </div>
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={cancelDelete}
                            className="flex-1 py-1.5 text-xs text-gray-300 bg-dark-bg border border-dark-border rounded-lg hover:border-gray-500 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => deleteProject(e, p.id)}
                            disabled={deletingId === p.id}
                            className="flex-1 py-1.5 text-xs text-white bg-accent-rose/20 border border-accent-rose/40 rounded-lg hover:bg-accent-rose/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {deletingId === p.id
                              ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                              : <><i className="fa-solid fa-trash" /> Delete</>
                            }
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3 pt-3 border-t border-dark-border text-[10px] text-gray-400">
                      <div className="flex justify-between items-center">
                        <span>Branch: <strong className="text-gray-200">{p.git_branch}</strong></span>
                        <span className="text-accent-emerald"><i className="fa-solid fa-check-double mr-1" />{p.status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Tokens: <strong className="text-gray-200">{p.token_usage.toLocaleString()}</strong></span>
                        <span className="text-gray-500">{timeAgo(p.updated_at)}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button className="flex-1 py-1.5 bg-dark-panel hover:bg-dark-hover rounded text-xs text-gray-300 border border-dark-border">Open Canvas</button>
                        <button className="flex-1 py-1.5 bg-brand-600/20 hover:bg-brand-600 text-brand-500 hover:text-white rounded text-xs border border-brand-500/30 transition">Code Mode</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      {showImport && createPortal(<ImportGithubModal onClose={() => setShowImport(false)} />, document.body)}
      {showBuildMode && createPortal(
        <BuildModeModal
          prompt={prompt}
          onSelect={createProject}
          onClose={() => setShowBuildMode(false)}
        />,
        document.body
      )}
      {showClarification && createPortal(
        <ClarificationModal
          prompt={prompt}
          onConfirm={createProjectWithPrompt}
          onBack={() => { setShowClarification(false); setShowBuildMode(true) }}
        />,
        document.body
      )}
    </div>
  )
}
