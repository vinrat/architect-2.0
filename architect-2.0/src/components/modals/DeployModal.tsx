import { useState } from 'react'

interface Props {
  projectName: string
  onClose: () => void
}

type Target = 'lyzr' | 'bedrock' | 'selfhost'
type StepStatus = 'pending' | 'running' | 'done'

const TARGETS = [
  {
    id: 'lyzr' as Target,
    name: 'Lyzr Agent Studio',
    desc: 'Deploy to Lyzr\'s managed agent runtime. Monitor runs, traces, and memory in one place.',
    icon: '🟣',
    badge: 'Recommended',
    badgeColor: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
    borderActive: 'border-accent-purple/60 bg-accent-purple/5',
  },
  {
    id: 'bedrock' as Target,
    name: 'Amazon Bedrock Agents',
    desc: 'Deploy as a native Bedrock Agent. Best for enterprise AWS environments.',
    icon: '🟠',
    badge: 'AWS Native',
    badgeColor: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
    borderActive: 'border-accent-amber/60 bg-accent-amber/5',
  },
  {
    id: 'selfhost' as Target,
    name: 'Self-host (Railway / Docker)',
    desc: 'Export a Dockerfile and deploy anywhere. Full control for developers.',
    icon: '⚫',
    badge: 'Developer',
    badgeColor: 'bg-gray-700/50 text-gray-300 border-gray-600',
    borderActive: 'border-gray-500/60 bg-gray-800/30',
  },
]

const DEPLOY_STEPS: Record<Target, { label: string; icon: string; duration: number }[]> = {
  lyzr: [
    { label: 'Packaging agent definitions',     icon: 'fa-box',              duration: 900  },
    { label: 'Generating lyzr.config.json',     icon: 'fa-file-code',        duration: 1000 },
    { label: 'Uploading to Lyzr Studio',        icon: 'fa-cloud-arrow-up',   duration: 1400 },
    { label: 'Registering agent runtime',       icon: 'fa-microchip',        duration: 1000 },
    { label: 'Running health checks',           icon: 'fa-heart-pulse',      duration: 700  },
    { label: 'Agent live on Lyzr Studio',       icon: 'fa-rocket',           duration: 500  },
  ],
  bedrock: [
    { label: 'Packaging agent code',            icon: 'fa-box',              duration: 900  },
    { label: 'Creating Bedrock Agent resource', icon: 'fa-layer-group',      duration: 1400 },
    { label: 'Attaching action groups',         icon: 'fa-plug',             duration: 1000 },
    { label: 'Configuring knowledge base',      icon: 'fa-database',         duration: 1200 },
    { label: 'Deploying to AWS',                icon: 'fa-cloud-arrow-up',   duration: 1000 },
    { label: 'Agent live on Bedrock',           icon: 'fa-rocket',           duration: 500  },
  ],
  selfhost: [
    { label: 'Generating Dockerfile',           icon: 'fa-file-code',        duration: 700  },
    { label: 'Building container image',        icon: 'fa-layer-group',      duration: 1800 },
    { label: 'Pushing to registry',             icon: 'fa-cloud-arrow-up',   duration: 1200 },
    { label: 'Deploying to Railway',            icon: 'fa-server',           duration: 1400 },
    { label: 'Running health checks',           icon: 'fa-heart-pulse',      duration: 700  },
    { label: 'Container live',                  icon: 'fa-rocket',           duration: 500  },
  ],
}

const LIVE_URLS: Record<Target, (slug: string) => string> = {
  lyzr:     (slug) => `https://studio.lyzr.ai/agents/${slug}`,
  bedrock:  (slug) => `https://bedrock.aws.amazon.com/agents/${slug}-prod`,
  selfhost: (slug) => `https://${slug}.up.railway.app`,
}

const LIVE_LABELS: Record<Target, string> = {
  lyzr:     'View in Lyzr Studio',
  bedrock:  'Open in AWS Console',
  selfhost: 'Open Live App',
}

const LIVE_ICONS: Record<Target, string> = {
  lyzr:     'fa-arrow-up-right-from-square',
  bedrock:  'fa-aws',
  selfhost: 'fa-server',
}

export default function DeployModal({ projectName, onClose }: Props) {
  const [stage, setStage] = useState<'select' | 'deploying' | 'live'>('select')
  const [target, setTarget] = useState<Target>('lyzr')
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([])
  const [copied, setCopied] = useState(false)

  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const liveUrl = LIVE_URLS[target](slug)

  const startDeploy = () => {
    const steps = DEPLOY_STEPS[target]
    setStepStatuses(steps.map(() => 'pending'))
    setStage('deploying')

    let i = 0
    const runStep = () => {
      if (i >= steps.length) { setStage('live'); return }
      setStepStatuses(prev => { const n = [...prev]; n[i] = 'running'; return n })
      setTimeout(() => {
        setStepStatuses(prev => { const n = [...prev]; n[i] = 'done'; return n })
        i++
        runStep()
      }, steps[i].duration)
    }
    runStep()
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(liveUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = DEPLOY_STEPS[target]
  const doneCount = stepStatuses.filter(s => s === 'done').length
  const selectedTarget = TARGETS.find(t => t.id === target)!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-dark-panel border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-rocket text-accent-purple text-base" />
            <div>
              <p className="text-sm font-bold text-white">Deploy Agent</p>
              <p className="text-[11px] text-gray-400 truncate max-w-[280px]">{projectName}</p>
            </div>
          </div>
          {stage !== 'deploying' && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">

          {/* ── STAGE: SELECT TARGET ── */}
          {stage === 'select' && (
            <>
              <p className="text-xs text-gray-400">Choose where to deploy your agent:</p>
              <div className="space-y-2.5">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTarget(t.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      target === t.id
                        ? t.borderActive + ' border'
                        : 'border-dark-border bg-dark-card hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-bold text-white">{t.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${t.badgeColor}`}>
                            {t.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{t.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        target === t.id ? 'border-accent-purple bg-accent-purple' : 'border-gray-600'
                      }`}>
                        {target === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Lyzr config preview hint */}
              {target === 'lyzr' && (
                <div className="bg-dark-bg border border-accent-purple/20 rounded-xl p-3 flex items-start gap-2">
                  <i className="fa-solid fa-file-code text-accent-purple text-xs mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-400">
                    A <span className="text-accent-purple font-mono">lyzr.config.json</span> will be generated from your agent nodes and uploaded to Lyzr Studio automatically.
                  </p>
                </div>
              )}

              <button
                onClick={startDeploy}
                className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rocket" />
                Deploy to {selectedTarget.name}
              </button>
            </>
          )}

          {/* ── STAGE: DEPLOYING ── */}
          {(stage === 'deploying' || stage === 'live') && (
            <>
              {/* Target badge */}
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedTarget.icon}</span>
                <span className="text-xs font-semibold text-white">{selectedTarget.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${selectedTarget.badgeColor}`}>
                  {selectedTarget.badge}
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                {steps.map((step, i) => {
                  const status = stepStatuses[i] ?? 'pending'
                  return (
                    <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${status === 'pending' ? 'opacity-25' : 'opacity-100'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        status === 'done'    ? 'bg-accent-emerald/10 border-accent-emerald/40' :
                        status === 'running' ? 'bg-accent-purple/10 border-accent-purple/40' :
                                              'bg-dark-card border-dark-border'
                      }`}>
                        {status === 'done'
                          ? <i className="fa-solid fa-check text-accent-emerald text-xs" />
                          : status === 'running'
                            ? <div className="w-3.5 h-3.5 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                            : <i className={`fa-solid ${step.icon} text-gray-600 text-xs`} />
                        }
                      </div>
                      <p className={`text-xs font-medium flex-1 ${
                        status === 'done'    ? 'text-white' :
                        status === 'running' ? 'text-accent-purple' :
                                              'text-gray-600'
                      }`}>
                        {step.label}
                      </p>
                      {status === 'done' && <span className="text-[10px] text-accent-emerald">✓</span>}
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              {stage === 'deploying' && (
                <div className="w-full bg-dark-bg rounded-full h-1 border border-dark-border overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-600 to-accent-purple transition-all duration-500 rounded-full"
                    style={{ width: `${(doneCount / steps.length) * 100}%` }}
                  />
                </div>
              )}

              {/* Live section */}
              {stage === 'live' && (
                <div className="space-y-3 pt-1 border-t border-dark-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                    <span className="text-xs font-bold text-accent-emerald">
                      {target === 'lyzr' ? 'Agent live on Lyzr Studio!' :
                       target === 'bedrock' ? 'Agent live on Amazon Bedrock!' :
                       'Container deployed successfully!'}
                    </span>
                  </div>

                  <div className="bg-dark-bg border border-accent-emerald/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-accent-cyan truncate font-mono">{liveUrl}</span>
                    <button
                      onClick={copyUrl}
                      className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg border border-dark-border text-gray-300 hover:text-white hover:border-gray-500 transition flex items-center gap-1.5"
                    >
                      <i className={`fa-solid ${copied ? 'fa-check text-accent-emerald' : 'fa-copy'}`} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {target === 'lyzr' && (
                    <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
                      <p className="text-accent-purple font-semibold text-xs">What's available in Lyzr Studio:</p>
                      <div className="grid grid-cols-2 gap-1 mt-1.5">
                        {['Live execution logs', 'Tool call traces', 'Memory state', 'Re-prompt agent'].map(f => (
                          <div key={f} className="flex items-center gap-1.5">
                            <i className="fa-solid fa-check text-accent-emerald text-[10px]" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-center bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <i className={`fa-solid ${LIVE_ICONS[target]}`} />
                      {LIVE_LABELS[target]}
                    </a>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 bg-dark-card border border-dark-border hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition"
                    >
                      Back to Workspace
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
