import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Option { value: string; label: string; desc: string }
interface Question { id: string; question: string; options: Option[] }

interface Props {
  prompt: string
  onConfirm: (enrichedPrompt: string) => void
  onBack: () => void
}

// ── Fallback: keyword-based questions (zero tokens) ──────────────────────────
function getFallbackQuestions(prompt: string): { interpretation: string; questions: Question[] } {
  const lower = prompt.toLowerCase()
  const questions: Question[] = []

  if (lower.includes('drive') || lower.includes('pdf') || lower.includes('document') || lower.includes('file')) {
    questions.push({
      id: 'scope', question: 'Which content should the agent work with?',
      options: [
        { value: 'individual files on demand', label: 'Individual files on demand', desc: 'User selects specific files each time' },
        { value: 'specific folders automatically', label: 'Specific folders', desc: 'Monitor and process a set folder automatically' },
        { value: 'entire drive or workspace', label: 'Entire drive or workspace', desc: 'Search and synthesize across all content' },
      ],
    })
  }
  if (lower.includes('search') || lower.includes('research') || lower.includes('web')) {
    questions.push({
      id: 'search_scope', question: 'What should the research agent search?',
      options: [
        { value: 'public web search', label: 'Public web search', desc: 'General web via DuckDuckGo / Tavily' },
        { value: 'specific websites', label: 'Specific websites', desc: 'Targeted domains only' },
        { value: 'academic papers', label: 'Academic papers', desc: 'arXiv and research sources' },
      ],
    })
  }
  if (lower.includes('summar') || lower.includes('report') || lower.includes('analys')) {
    questions.push({
      id: 'output', question: 'What should the agent produce?',
      options: [
        { value: 'concise summary', label: 'Concise summary', desc: 'Short, scannable key points' },
        { value: 'detailed structured report with citations', label: 'Detailed structured report', desc: 'Full report with sections and citations' },
        { value: 'key findings risks and action items', label: 'Key findings & action items', desc: 'Executive-style with risks and next steps' },
      ],
    })
  }
  if (lower.includes('email') || lower.includes('slack') || lower.includes('discord') || lower.includes('notify')) {
    questions.push({
      id: 'destination', question: 'Where should results be delivered?',
      options: [
        { value: 'email', label: 'Email', desc: 'Send formatted results via email' },
        { value: 'slack', label: 'Slack', desc: 'Post to a Slack channel' },
        { value: 'discord', label: 'Discord', desc: 'Post to a Discord channel' },
        { value: 'notion', label: 'Notion', desc: 'Save as a Notion page' },
      ],
    })
  }
  // Always ask persistence
  questions.push({
    id: 'persistence', question: 'Will this app need to save data across sessions?',
    options: [
      { value: 'no persistence, process on demand', label: 'No — process each request fresh', desc: 'Stateless, simpler architecture' },
      { value: 'save results and history to database', label: 'Yes — save results and history', desc: 'Persistent storage with Supabase' },
    ],
  })

  const interpretation = getFallbackInterpretation(prompt)
  return { interpretation, questions: questions.slice(0, 3) }
}

function getFallbackInterpretation(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes('drive') && lower.includes('pdf')) return 'A Google Drive research assistant that can search Drive content, analyse PDFs, and turn findings into useful summaries.'
  if (lower.includes('pdf')) return 'A PDF analysis agent that extracts, processes, and summarises document content automatically.'
  if (lower.includes('slack') || lower.includes('discord')) return 'An automated agent that processes data and delivers results directly to your team communication channel.'
  if (lower.includes('email') || lower.includes('gmail')) return 'An agent that processes information and delivers structured results via email on your schedule.'
  if (lower.includes('github') || lower.includes('code')) return 'A code intelligence agent that monitors your repository and automates code review or analysis tasks.'
  if (lower.includes('research') || lower.includes('search')) return 'A research agent that searches the web, synthesises findings, and produces structured reports.'
  return `An agentic application that ${prompt.replace(/^build\s+(me\s+)?a?\s*/i, '').slice(0, 100)}.`
}

function buildEnrichedPrompt(basePrompt: string, answers: Record<string, string>): string {
  const parts = [basePrompt]
  Object.values(answers).forEach(v => { if (v) parts.push(v) })
  return parts.join('. ')
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClarificationModal({ prompt, onConfirm, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [interpretation, setInterpretation] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/clarify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: AbortSignal.timeout(8000), // 8s timeout
        })
        const data = await resp.json()
        if (data.fallback || data.error || !data.questions?.length) throw new Error('fallback')
        setInterpretation(data.interpretation || '')
        setQuestions(data.questions.slice(0, 3))
      } catch {
        // Backend down or error — use keyword fallback silently
        const fb = getFallbackQuestions(prompt)
        setInterpretation(fb.interpretation)
        setQuestions(fb.questions)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [prompt])

  // Skip if no questions
  useEffect(() => {
    if (!loading && questions.length === 0) onConfirm(prompt)
  }, [loading, questions])

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="bg-dark-panel border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl p-8 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center">
          <i className="fa-solid fa-robot text-white text-sm" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white">Architect AI is thinking...</p>
          <p className="text-xs text-gray-400">Generating clarifying questions for your prompt</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (questions.length === 0) return null

  const current = questions[step]
  const isLast = step === questions.length - 1
  const answered = !!answers[current?.id]

  const next = () => {
    if (!answered) return
    if (isLast) onConfirm(buildEnrichedPrompt(prompt, answers))
    else setStep(s => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="bg-dark-panel border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-dark-border">
          {/* AI interpretation bubble */}
          <div className="flex items-start gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
              <i className="fa-solid fa-robot text-white text-[10px]" />
            </div>
            <div className="bg-dark-card border border-dark-border rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
              <p className="text-[10px] text-accent-purple font-bold mb-1">Architect AI</p>
              <p className="text-xs text-gray-200 leading-relaxed">{interpretation}</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-1.5 pl-9">
            {questions.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                i < step ? 'w-5 bg-accent-emerald' :
                i === step ? 'w-7 bg-accent-purple' :
                'w-5 bg-dark-border'
              }`} />
            ))}
            <span className="text-[10px] text-gray-500 ml-1">{step + 1} of {questions.length}</span>
          </div>
        </div>

        {/* Question */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-bold text-white">{current.question}</p>

          <div className="space-y-2">
            {current.options.map(opt => (
              <button
                key={opt.value}
                onClick={() => setAnswers(prev => ({ ...prev, [current.id]: opt.value }))}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  answers[current.id] === opt.value
                    ? 'border-accent-purple/60 bg-accent-purple/10'
                    : 'border-dark-border bg-dark-card hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    answers[current.id] === opt.value ? 'border-accent-purple bg-accent-purple' : 'border-gray-600'
                  }`}>
                    {answers[current.id] === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{opt.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={step === 0 ? onBack : () => setStep(s => s - 1)}
              className="px-4 py-2.5 text-xs text-gray-400 border border-dark-border rounded-xl hover:border-gray-500 hover:text-white transition">
              ← Back
            </button>
            <button onClick={next} disabled={!answered}
              className="flex-1 py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
              {isLast ? 'Build my agent →' : 'Next →'}
            </button>
          </div>

          <button onClick={() => onConfirm(prompt)}
            className="w-full text-[11px] text-gray-500 hover:text-gray-300 transition text-center">
            Skip and use my prompt as-is
          </button>
        </div>
      </div>
    </div>
  )
}
