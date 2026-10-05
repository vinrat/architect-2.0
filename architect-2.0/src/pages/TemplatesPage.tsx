import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { STATIC_TEMPLATES } from '../api/templates'

const COLORS: Record<string, string> = {
  '1': 'cyan', '2': 'purple', '3': 'emerald', '4': 'amber', '5': 'brand', '6': 'gray',
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const { setProject } = useWorkspaceStore()

  const use = (t: typeof STATIC_TEMPLATES[0]) => {
    setProject(t.id, t.name)
    navigate(`/workspace/${t.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-dark-bg">
      <header className="h-16 border-b border-dark-border bg-dark-panel/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition text-xs flex items-center gap-1">
            <i className="fa-solid fa-arrow-left" /> Back
          </button>
          <div className="h-4 w-px bg-dark-border" />
          <span className="font-bold text-sm text-white">Starter Templates</span>
        </div>
        <input placeholder="Search templates..." className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-brand-500 w-56" />
      </header>

      <main className="max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        <div className="flex flex-wrap gap-2">
          {['All', 'RAG', 'Autonomous', 'Chatbot', 'Data Pipeline', 'Multi-Agent'].map((c) => (
            <button key={c} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${c === 'All' ? 'bg-brand-600 text-white' : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'}`}>{c}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATIC_TEMPLATES.map((t) => {
            const c = COLORS[t.id] || 'cyan'
            const isBlank = t.id === '6'
            return (
              <div key={t.id}
                className={`bg-dark-card border border-dark-border ${isBlank ? 'border-dashed hover:border-gray-500' : `hover:border-accent-${c}/50`} rounded-2xl p-5 flex flex-col justify-between space-y-4 transition group cursor-pointer`}
                onClick={() => use(t)}>
                {isBlank ? (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-3 py-4">
                    <div className="w-10 h-10 rounded-xl bg-dark-bg border border-dark-border flex items-center justify-center text-gray-500 group-hover:text-white transition">
                      <i className="fa-solid fa-plus" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-gray-400 group-hover:text-white transition block">Blank Canvas</span>
                      <p className="text-[11px] text-gray-500">Start from scratch</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className={`w-10 h-10 rounded-xl bg-accent-${c}/10 border border-accent-${c}/20 flex items-center justify-center text-accent-${c}`}>
                        <i className="fa-solid fa-robot" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{t.name}</span>
                          <span className={`text-[10px] bg-accent-${c}/10 text-accent-${c} px-2 py-0.5 rounded border border-accent-${c}/20`}>{t.framework}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{t.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-dark-bg px-2 py-0.5 rounded text-gray-400 border border-dark-border">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button className={`w-full py-2 bg-accent-${c}/10 hover:bg-accent-${c} text-accent-${c} hover:text-black text-xs font-semibold rounded-xl border border-accent-${c}/30 transition`}>
                      Use Template
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
