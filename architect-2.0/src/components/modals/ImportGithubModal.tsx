import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../api/auth'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Props { onClose: () => void }

type Step = 'input' | 'fetching' | 'analysing' | 'done' | 'error'

interface Analysis {
  owner: string
  repo: string
  file_count: number
  framework: string
  language: string
  is_agent_project: boolean
  main_files: string[]
  detected_tools: string[]
  summary: string
  suggested_prompt: string
  complexity: string
}

const FETCH_STEPS = [
  { label: 'Connecting to GitHub API',       icon: 'fa-brands fa-github' },
  { label: 'Fetching repository file tree',  icon: 'fa-folder-tree' },
  { label: 'Reading key source files',       icon: 'fa-file-code' },
  { label: 'Sending to Claude for analysis', icon: 'fa-microchip' },
  { label: 'Parsing agent patterns',         icon: 'fa-diagram-project' },
]

const FW_COLORS: Record<string, string> = {
  langgraph:  'text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10',
  crewai:     'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
  pydanticai: 'text-brand-500 border-brand-500/40 bg-brand-500/10',
  autogen:    'text-accent-amber border-accent-amber/40 bg-accent-amber/10',
  custom:     'text-gray-300 border-gray-600 bg-gray-800/30',
  unknown:    'text-gray-400 border-gray-700 bg-gray-800/20',
}


export default function ImportGithubModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { setProject } = useWorkspaceStore()
  const [repoUrl, setRepoUrl] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [stepIndex, setStepIndex] = useState(0)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const runScan = async () => {
    const url = repoUrl.trim()
    if (!url.includes('github.com')) { setError('Please enter a valid GitHub URL'); return }
    setError('')
    setStep('fetching')
    setStepIndex(0)

    // Animate first 3 steps while fetching
    let i = 0
    const ticker = setInterval(() => {
      i++
      setStepIndex(i)
      if (i >= 2) clearInterval(ticker)
    }, 700)

    try {
      setStep('analysing')
      setStepIndex(3)

      const resp = await fetch(`${API_URL}/api/analyze-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url }),
      })

      clearInterval(ticker)

      if (!resp.ok) throw new Error(`Backend returned ${resp.status}`)
      const data = await resp.json()

      if (data.error) throw new Error(data.error)

      setStepIndex(4)
      await new Promise(r => setTimeout(r, 400))
      setAnalysis(data)
      setStep('done')
    } catch (err: any) {
      clearInterval(ticker)
      setError(err.message || 'Failed to analyse repository')
      setStep('error')
    }
  }

  const handleImport = async () => {
    if (!analysis) return
    setImporting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { onClose(); return }

    const { data } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        name: analysis.repo,
        framework: analysis.framework === 'unknown' ? 'custom' : analysis.framework,
        prompt: analysis.suggested_prompt || `Imported from GitHub: ${repoUrl}`,
        status: 'active',
        persona: 'code',
      })
      .select()
      .single()

    if (data) {
      setProject(data.id, data.name)
      onClose()
      navigate(`/workspace/${data.id}`)
    }
    setImporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-dark-panel border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <i className="fa-brands fa-github text-white text-lg" />
            <span className="text-sm font-bold text-white">Import GitHub Repo</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-accent-emerald/30 text-accent-emerald bg-accent-emerald/10">
              Real LLM Analysis
            </span>
          </div>
          {step !== 'fetching' && step !== 'analysing' && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">

          {/* INPUT */}
          {step === 'input' && (
            <>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1.5">Repository URL</label>
                <input
                  value={repoUrl}
                  onChange={e => { setRepoUrl(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && runScan()}
                  placeholder="https://github.com/username/repo"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500 transition placeholder-gray-500"
                />
                {error && <p className="text-[11px] text-accent-rose mt-1.5 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation" />{error}</p>}
              </div>
              <div className="bg-dark-bg border border-dark-border rounded-xl p-3 flex items-start gap-2.5">
                <i className="fa-solid fa-circle-info text-accent-cyan text-xs mt-0.5 shrink-0" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Works with any <strong className="text-white">public</strong> GitHub repo. Claude will read the actual source files and detect the framework, tools, and agent patterns — no OAuth needed.
                </p>
              </div>
              <button
                onClick={runScan}
                disabled={!repoUrl.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass" /> Scan & Analyse with Claude
              </button>
            </>
          )}

          {/* SCANNING / ANALYSING */}
          {(step === 'fetching' || step === 'analysing') && (
            <div className="space-y-4 py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center shrink-0">
                  <i className="fa-brands fa-github text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{repoUrl}</p>
                  <p className="text-[11px] text-accent-purple">
                    {step === 'analysing' ? 'Claude is reading your code...' : 'Fetching repository...'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {FETCH_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i <= stepIndex ? 'opacity-100' : 'opacity-20'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      i < stepIndex  ? 'bg-accent-emerald/10 border-accent-emerald/40' :
                      i === stepIndex ? 'bg-accent-purple/10 border-accent-purple/40' :
                                        'bg-dark-card border-dark-border'
                    }`}>
                      {i < stepIndex
                        ? <i className="fa-solid fa-check text-accent-emerald text-[10px]" />
                        : i === stepIndex
                          ? <div className="w-3 h-3 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                          : <i className={`${s.icon} text-gray-600 text-[10px]`} />
                      }
                    </div>
                    <span className={`text-xs ${i <= stepIndex ? 'text-gray-200' : 'text-gray-600'}`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="bg-accent-rose/5 border border-accent-rose/20 rounded-xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-circle-exclamation text-accent-rose mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Analysis failed</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{error}</p>
                  {error.includes('Backend') && (
                    <code className="text-[10px] text-gray-500 mt-2 block font-mono bg-dark-bg px-2 py-1 rounded border border-dark-border">
                      uvicorn main:app --reload --port 8000
                    </code>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('input')} className="w-full py-2 text-xs text-gray-300 border border-dark-border rounded-xl hover:border-gray-500 transition">
                ← Try again
              </button>
            </div>
          )}

          {/* RESULTS */}
          {step === 'done' && analysis && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-dark-card border border-accent-emerald/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-accent-emerald text-sm" />
                  <span className="text-xs font-bold text-white">Analysis complete — {analysis.owner}/{analysis.repo}</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">{analysis.summary}</p>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-dark-bg rounded-lg p-2 border border-dark-border">
                    <p className="text-gray-500 mb-0.5">Framework</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${FW_COLORS[analysis.framework] || FW_COLORS.unknown}`}>
                      {analysis.framework}
                    </span>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-2 border border-dark-border">
                    <p className="text-gray-500 mb-0.5">Files</p>
                    <p className="text-white font-bold">{analysis.file_count}</p>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-2 border border-dark-border">
                    <p className="text-gray-500 mb-0.5">Complexity</p>
                    <p className={`font-bold capitalize ${
                      analysis.complexity === 'complex' ? 'text-accent-rose' :
                      analysis.complexity === 'moderate' ? 'text-accent-amber' :
                      'text-accent-emerald'
                    }`}>{analysis.complexity}</p>
                  </div>
                </div>

                {/* Detected tools */}
                {analysis.detected_tools?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1.5">Detected integrations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.detected_tools.map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-dark-border bg-dark-bg text-gray-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main files */}
                {analysis.main_files?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1.5">Key files read by Claude</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.main_files.map(f => (
                        <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-accent-purple/20 bg-accent-purple/5 text-accent-purple">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested prompt */}
              {analysis.suggested_prompt && (
                <div className="bg-dark-bg border border-dark-border rounded-xl p-3">
                  <p className="text-[10px] text-gray-500 mb-1">Architect will use this prompt</p>
                  <p className="text-[11px] text-gray-300 italic">"{analysis.suggested_prompt}"</p>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {importing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing...</>
                  : <><i className="fa-solid fa-file-import" /> Import into Architect</>
                }
              </button>
              <button onClick={() => setStep('input')} className="w-full text-xs text-gray-500 hover:text-white transition">
                ← Use a different URL
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
