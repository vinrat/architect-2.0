import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { supabase } from '../api/auth'

const OPTIONS = [
  {
    persona: 'vibe' as const,
    emoji: '🪄',
    title: 'I describe what I want',
    subtitle: 'Let AI do the building',
    desc: 'You talk, Architect builds. No code, no setup — just describe your idea and watch it come to life.',
    perks: [
      'Chat with your AI assistant to build & change anything',
      'See your app visually — no code required',
      'One-click deploy when you\'re ready',
    ],
    cta: 'Start Building with Words',
    accent: 'accent-cyan',
    border: 'border-accent-cyan/40',
    glow: 'shadow-accent-cyan/10',
  },
  {
    persona: 'code' as const,
    emoji: '💻',
    title: 'I write code myself',
    subtitle: 'Full control, full power',
    desc: 'Full IDE, terminal, Git sync, and raw access to every agent, model, and token trace.',
    perks: [
      'Full IDE with embedded ZSH terminal',
      'Bi-directional GitHub branching',
      'Agent AST steering & token traces',
    ],
    cta: 'Open the IDE',
    accent: 'brand-500',
    border: 'border-brand-500/40',
    glow: 'shadow-brand-500/10',
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { setPersona } = useAppStore()
  const [loading, setLoading] = useState<'vibe' | 'code' | null>(null)

  const select = async (p: 'vibe' | 'code') => {
    setLoading(p)
    setPersona(p)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('profiles').update({ persona: p }).eq('id', session.user.id)
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-3xl w-full space-y-10 my-auto">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 bg-dark-card/80 px-4 py-2 rounded-full border border-dark-border">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-accent-purple via-brand-500 to-accent-cyan flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-white text-[10px]" />
            </div>
            <span className="font-bold text-sm text-white">
              Architect <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-500 border border-brand-500/30">2.0</span>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            How do you usually build things?
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Pick your style — you can always switch later from Settings.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {OPTIONS.map((o) => (
            <button
              key={o.persona}
              onClick={() => select(o.persona)}
              disabled={!!loading}
              className={`group text-left rounded-2xl p-px bg-gradient-to-br from-dark-border via-dark-border to-dark-border hover:from-accent-cyan/30 hover:via-brand-500/30 hover:to-accent-purple/30 transition-all duration-300 shadow-xl ${o.glow} disabled:opacity-60`}
            >
              <div className="bg-dark-panel rounded-2xl p-7 h-full flex flex-col space-y-5">
                {/* Icon + title */}
                <div className="space-y-3">
                  <span className="text-4xl">{o.emoji}</span>
                  <div>
                    <p className="text-lg font-extrabold text-white">{o.title}</p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">{o.subtitle}</p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{o.desc}</p>
                </div>

                {/* Perks */}
                <ul className="space-y-2 flex-1">
                  {o.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-gray-300">
                      <i className="fa-solid fa-check text-accent-emerald mt-0.5 shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`w-full py-3 rounded-xl border ${o.border} text-center text-xs font-bold text-white group-hover:bg-white/5 transition flex items-center justify-center gap-2`}>
                  {loading === o.persona
                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Setting up...</span></>
                    : <><span>{o.cta}</span><i className="fa-solid fa-arrow-right" /></>
                  }
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
