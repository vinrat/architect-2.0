interface Props {
  prompt: string
  onSelect: (mode: 'vibe' | 'code') => void
  onClose: () => void
}

const MODES = [
  {
    id: 'vibe' as const,
    emoji: '🪄',
    title: 'Guide me through it',
    subtitle: 'Non-technical / Vibe mode',
    desc: 'Chat with AI to build and change your agent. See it visually — no code required.',
    perks: ['Visual agent pipeline', 'Chat-first interface', 'Plain English controls'],
    border: 'border-accent-cyan/50',
    activeBg: 'bg-accent-cyan/5',
    badge: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
    cta: 'Build with AI Chat',
    ctaStyle: 'from-accent-cyan/80 to-brand-600',
  },
  {
    id: 'code' as const,
    emoji: '💻',
    title: "I'll write the code",
    subtitle: 'Technical / Developer mode',
    desc: 'Full IDE, terminal, file explorer, and raw access to every agent and model.',
    perks: ['Full IDE + terminal', 'Real-time code generation', 'Git & file structure'],
    border: 'border-brand-500/50',
    activeBg: 'bg-brand-500/5',
    badge: 'bg-brand-500/20 text-brand-500 border-brand-500/30',
    cta: 'Open the IDE',
    ctaStyle: 'from-brand-600 to-accent-purple',
  },
]

export default function BuildModeModal({ prompt, onSelect, onClose }: Props) {
  const short = prompt.length > 72 ? prompt.slice(0, 72) + '...' : prompt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="bg-dark-panel border border-dark-border rounded-2xl w-full max-w-xl shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-dark-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-extrabold text-white">How do you want to build this?</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                <i className="fa-solid fa-wand-magic-sparkles text-accent-purple mr-1" />
                "{short}"
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition shrink-0 mt-0.5">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Mode cards */}
        <div className="p-5 grid grid-cols-2 gap-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={`group text-left rounded-xl border ${m.border} ${m.activeBg} hover:border-opacity-80 p-4 flex flex-col gap-3 transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{m.emoji}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${m.badge}`}>{m.subtitle.split(' / ')[1]}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white">{m.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{m.desc}</p>
              </div>
              <ul className="space-y-1">
                {m.perks.map(p => (
                  <li key={p} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                    <i className="fa-solid fa-check text-accent-emerald text-[9px] shrink-0" />{p}
                  </li>
                ))}
              </ul>
              <div className={`mt-auto w-full py-2 rounded-lg bg-gradient-to-r ${m.ctaStyle} text-white text-xs font-semibold text-center group-hover:opacity-90 transition`}>
                {m.cta} →
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-gray-600 pb-4">
          You can switch modes anytime inside the workspace
        </p>
      </div>
    </div>
  )
}
