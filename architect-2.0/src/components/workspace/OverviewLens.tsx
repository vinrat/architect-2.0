import { useState, useEffect } from 'react'
import { parseIntent } from '../../utils/intentParser'
import { buildFileTree } from '../../utils/intentParser'

interface Props {
  projectName: string
  projectPrompt: string
  projectFramework: string
  onSwitchToCode: () => void
  onDeploy: () => void
}

const TYPE_COLORS: Record<string, { text: string; border: string; bg: string; dot: string }> = {
  trigger:   { text: 'text-accent-cyan',    border: 'border-accent-cyan/40',    bg: 'bg-accent-cyan/5',    dot: 'bg-accent-cyan' },
  processor: { text: 'text-brand-500',      border: 'border-brand-500/40',      bg: 'bg-brand-500/5',      dot: 'bg-brand-500' },
  analyzer:  { text: 'text-accent-purple',  border: 'border-accent-purple/40',  bg: 'bg-accent-purple/5',  dot: 'bg-accent-purple' },
  generator: { text: 'text-accent-purple',  border: 'border-accent-purple/40',  bg: 'bg-accent-purple/5',  dot: 'bg-accent-purple' },
  evaluator: { text: 'text-accent-amber',   border: 'border-accent-amber/40',   bg: 'bg-accent-amber/5',   dot: 'bg-accent-amber' },
  notifier:  { text: 'text-accent-emerald', border: 'border-accent-emerald/40', bg: 'bg-accent-emerald/5', dot: 'bg-accent-emerald' },
}

export default function OverviewLens({ projectName, projectPrompt, projectFramework, onSwitchToCode, onDeploy }: Props) {
  const [visibleNodes, setVisibleNodes] = useState(0)
  const [visibleFiles, setVisibleFiles] = useState(0)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'files' | 'stack' | 'preview'>('pipeline')
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  const [previewRunning, setPreviewRunning] = useState(false)
  const [previewLogs, setPreviewLogs] = useState<{ text: string; type: 'info' | 'tool' | 'output' | 'success' }[]>([])
  const [previewDone, setPreviewDone] = useState(false)

  const { nodes, detectedTools } = parseIntent(projectPrompt)
  const tree = buildFileTree(projectPrompt, projectFramework)
  const files = tree.filter(f => f.type === 'file')

  // Animate nodes in on mount
  useEffect(() => {
    setVisibleNodes(0)
    setVisibleFiles(0)
    const timer = setInterval(() => {
      setVisibleNodes(n => {
        if (n >= nodes.length) { clearInterval(timer); return n }
        return n + 1
      })
    }, 120)
    return () => clearInterval(timer)
  }, [projectPrompt])

  // Animate files after nodes
  useEffect(() => {
    if (visibleNodes < nodes.length) return
    const timer = setInterval(() => {
      setVisibleFiles(n => {
        if (n >= files.length) { clearInterval(timer); return n }
        return n + 1
      })
    }, 60)
    return () => clearInterval(timer)
  }, [visibleNodes, nodes.length])

  const runPreview = () => {
    setPreviewRunning(true)
    setPreviewLogs([])
    setPreviewDone(false)

    const logs: { text: string; type: 'info' | 'tool' | 'output' | 'success' }[] = [
      { text: `[INFO] Starting ${projectName} agent pipeline...`, type: 'info' },
      { text: `[INFO] Loading framework: ${projectFramework}`, type: 'info' },
      { text: `[INFO] Connecting to Amazon Bedrock (Claude Haiku 4.5)...`, type: 'info' },
      ...nodes.slice(0, 3).map(n => ({ text: `[AGENT] Initialising ${n.label}...`, type: 'info' as const })),
      ...detectedTools.slice(0, 2).map(t => ({ text: `[TOOL] Loading ${t} integration...`, type: 'tool' as const })),
      { text: `[AGENT] ${nodes[0]?.label || 'Trigger Agent'} — received input, starting workflow`, type: 'info' },
      { text: `[TOOL] Executing tool call: ${detectedTools[0] || 'web_search'}(query="${projectPrompt.slice(0, 40)}...")`, type: 'tool' },
      { text: `[TOOL] Tool returned 3 results (1.2s)`, type: 'tool' },
      { text: `[AGENT] ${nodes.find(n => n.type === 'analyzer')?.label || 'Analysis Agent'} — processing results with Claude...`, type: 'info' },
      { text: `[LLM] Bedrock invoke: 847 input tokens, streaming response...`, type: 'info' },
      { text: `[AGENT] Analysis complete. Confidence: 0.94`, type: 'info' },
      { text: `[EVAL] Quality evaluator — score: 0.91 ✓ (threshold: 0.7)`, type: 'info' },
      { text: `[OUTPUT] ${nodes.find(n => n.type === 'notifier')?.label || 'Notification Agent'} — delivering result...`, type: 'output' },
      { text: `[SUCCESS] Pipeline completed in 4.3s · 1,204 tokens · $0.0003`, type: 'success' },
    ]

    logs.forEach((log, i) => {
      setTimeout(() => {
        setPreviewLogs(prev => [...prev, log])
        if (i === logs.length - 1) {
          setPreviewRunning(false)
          setPreviewDone(true)
        }
      }, i * 350)
    })
  }

  const STACK_ITEMS = [
    { label: 'Framework',  value: projectFramework,          icon: 'fa-cubes',         color: 'text-accent-cyan' },
    { label: 'Model',      value: 'Claude Haiku 4.5',        icon: 'fa-microchip',     color: 'text-accent-purple' },
    { label: 'Runtime',    value: 'Lyzr Agent Studio',       icon: 'fa-rocket',        color: 'text-brand-500' },
    { label: 'Streaming',  value: 'SSE via FastAPI',         icon: 'fa-bolt',          color: 'text-accent-amber' },
    { label: 'Database',   value: 'Supabase Postgres',       icon: 'fa-database',      color: 'text-accent-emerald' },
    { label: 'Auth',       value: 'Supabase Auth',           icon: 'fa-shield-halved', color: 'text-accent-cyan' },
    ...detectedTools.slice(0, 3).map(t => ({ label: 'Integration', value: t, icon: 'fa-plug', color: 'text-gray-300' })),
  ]

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-dark-bg">

      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border bg-dark-panel/60 flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm font-bold text-white">{projectName}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 max-w-lg truncate">{projectPrompt}</p>
        </div>
        <div className="flex items-center gap-2">
          {detectedTools.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-dark-border bg-dark-card text-gray-400">{t}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
        {([
          { id: 'pipeline', label: 'Agent Pipeline', icon: 'fa-diagram-project' },
          { id: 'files',    label: 'File Structure', icon: 'fa-folder-tree' },
          { id: 'stack',    label: 'Tech Stack',     icon: 'fa-layer-group' },
          { id: 'preview',  label: 'Live Preview',   icon: 'fa-play' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === t.id
                ? 'bg-dark-card text-white border border-dark-border'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${t.icon} text-[10px]`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0 p-4 pt-3">

        {/* ── PIPELINE TAB ── */}
        {activeTab === 'pipeline' && (
          <>
            {/* Left: animated pipeline */}
            <div className="w-full lg:w-72 shrink-0 overflow-y-auto pr-4 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">
                {nodes.length} agents · {detectedTools.length} integrations
              </p>
              {nodes.map((node, i) => {
                const c = TYPE_COLORS[node.type] || TYPE_COLORS.processor
                const visible = i < visibleNodes
                return (
                  <div key={node.id}>
                    <button
                      onClick={() => setSelectedNode(selectedNode === i ? null : i)}
                      className={`w-full text-left rounded-xl border p-3 transition-all duration-300 ${
                        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                      } ${
                        selectedNode === i
                          ? `${c.border} ${c.bg}`
                          : 'border-dark-border bg-dark-card hover:border-gray-600'
                      }`}
                      style={{ transitionDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                        <span className="text-xs font-semibold text-white flex-1">{node.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.border} ${c.text} ${c.bg}`}>
                          {node.type}
                        </span>
                      </div>
                      {selectedNode === i && (
                        <p className="text-[11px] text-gray-400 mt-2 pl-4">{node.desc}</p>
                      )}
                    </button>
                    {i < nodes.length - 1 && visible && (
                      <div className="flex items-center justify-start pl-4 py-0.5">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="w-px h-2 bg-dark-border" />
                          <i className="fa-solid fa-chevron-down text-dark-border text-[8px]" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right: flow diagram */}
            <div className="flex-1 bg-dark-card rounded-2xl border border-dark-border overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400">
                  <i className="fa-solid fa-share-nodes mr-1.5 text-accent-purple" />Workflow Graph
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
                  <span className="text-[10px] text-accent-emerald">Ready to deploy</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-2">
                {nodes.map((node, i) => {
                  const c = TYPE_COLORS[node.type] || TYPE_COLORS.processor
                  const visible = i < visibleNodes
                  return (
                    <div key={node.id} className="w-full max-w-sm flex flex-col items-center">
                      <div
                        className={`w-full rounded-xl border p-3 transition-all duration-500 ${c.border} ${c.bg} ${
                          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                        style={{ transitionDelay: `${i * 80}ms` }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{node.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${c.text}`}>{node.label}</p>
                            <p className="text-[10px] text-gray-500 truncate">{node.desc}</p>
                          </div>
                          {i < visibleNodes - 1 && (
                            <i className="fa-solid fa-check text-accent-emerald text-[10px] shrink-0" />
                          )}
                          {i === visibleNodes - 1 && visibleNodes < nodes.length && (
                            <div className="w-3 h-3 border-2 border-accent-purple border-t-transparent rounded-full animate-spin shrink-0" />
                          )}
                        </div>
                      </div>
                      {i < nodes.length - 1 && visible && (
                        <div className="flex flex-col items-center py-1 gap-0.5">
                          <div className="w-px h-3 bg-dark-border" />
                          <i className="fa-solid fa-arrow-down text-gray-600 text-[10px]" />
                        </div>
                      )}
                    </div>
                  )
                })}
                {visibleNodes === nodes.length && (
                  <div className="mt-4 flex gap-2">
                    <button onClick={onDeploy}
                      className="px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5">
                      <i className="fa-solid fa-rocket" /> Deploy to Lyzr Studio
                    </button>
                    <button onClick={onSwitchToCode}
                      className="px-4 py-2 bg-dark-panel border border-dark-border hover:border-gray-500 text-gray-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5">
                      <i className="fa-solid fa-code" /> View Code
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── FILES TAB ── */}
        {activeTab === 'files' && (
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Tree */}
            <div className="w-64 shrink-0 bg-dark-card rounded-2xl border border-dark-border overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-dark-border">
                <p className="text-xs font-semibold text-gray-400">
                  <i className="fa-solid fa-folder-tree mr-1.5 text-accent-amber" />
                  {files.length} files · {projectFramework}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {tree.map((item, i) => (
                  <div
                    key={i}
                    style={{ paddingLeft: `${10 + (item.indent || 0) * 14}px`, transitionDelay: `${i * 30}ms` }}
                    className={`flex items-center gap-1.5 py-1 pr-3 text-xs font-mono transition-all duration-300 ${
                      i < visibleFiles + tree.filter(f => f.type === 'folder').length
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2'
                    } ${
                      item.type === 'folder' ? 'text-accent-amber cursor-default' :
                      item.name === 'lyzr.config.json' ? 'text-accent-purple cursor-pointer hover:text-white' :
                      item.name === 'Dockerfile' ? 'text-accent-cyan cursor-pointer hover:text-white' :
                      'text-gray-400 cursor-pointer hover:text-white'
                    }`}
                  >
                    <i className={`text-[10px] shrink-0 ${
                      item.type === 'folder' ? 'fa-solid fa-folder' :
                      item.name.endsWith('.json') ? 'fa-solid fa-brackets-curly' :
                      item.name === 'Dockerfile' ? 'fa-brands fa-docker' :
                      item.name.endsWith('.txt') ? 'fa-solid fa-list' :
                      item.name.startsWith('.') ? 'fa-solid fa-gear' :
                      'fa-solid fa-file-code'
                    }`} />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* File descriptions */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">What each file does</p>
              {files.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border border-dark-border bg-dark-card hover:border-gray-600 transition-all duration-300 ${
                    i < visibleFiles ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <i className={`text-xs mt-0.5 shrink-0 w-4 ${
                    f.name.endsWith('.json') ? 'fa-solid fa-brackets-curly text-accent-purple' :
                    f.name === 'Dockerfile' ? 'fa-brands fa-docker text-accent-cyan' :
                    f.name.endsWith('.txt') ? 'fa-solid fa-list text-gray-400' :
                    f.name.startsWith('.') ? 'fa-solid fa-gear text-gray-500' :
                    'fa-solid fa-file-code text-brand-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-white">{f.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STACK TAB ── */}
        {activeTab === 'stack' && (
          <div className="flex-1 overflow-y-auto">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-4">Services & technologies</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {STACK_ITEMS.map((s, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border border-dark-border bg-dark-card hover:border-gray-600 transition-all duration-300 ${
                    i < visibleNodes ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <i className={`fa-solid ${s.icon} ${s.color} text-sm`} />
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-xs font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* lyzr.config.json preview */}
            <div className="mt-5 bg-dark-card rounded-xl border border-accent-purple/20 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-dark-border flex items-center gap-2">
                <i className="fa-solid fa-brackets-curly text-accent-purple text-xs" />
                <span className="text-xs font-mono text-accent-purple">lyzr.config.json</span>
                <span className="text-[10px] text-gray-500 ml-auto">Auto-generated on deploy</span>
              </div>
              <pre className="p-4 text-[11px] font-mono text-gray-300 overflow-x-auto leading-relaxed">{`{
  "name": "${projectName}",
  "framework": "${projectFramework}",
  "runtime": "lyzr-studio",
  "model": {
    "provider": "bedrock",
    "model_id": "us.anthropic.claude-haiku-4-5-20251001-v1:0"
  },
  "agents": [${nodes.slice(0, 2).map(n => `
    { "id": "${n.id}", "name": "${n.label}", "type": "${n.type}" }`).join(',')}
  ],
  "integrations": [${detectedTools.slice(0, 2).map(t => `"${t}"`).join(', ')}]
}`}</pre>
            </div>
          </div>
        )}
        {/* ── PREVIEW TAB ── */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Controls */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs font-bold text-white">Agent Execution Preview</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Simulates a live run of your agent pipeline</p>
              </div>
              <button
                onClick={runPreview}
                disabled={previewRunning}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
              >
                {previewRunning
                  ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running...</>
                  : <><i className="fa-solid fa-play" /> Run Agent</>
                }
              </button>
            </div>

            {/* Terminal output */}
            <div className="flex-1 bg-[#0d1117] rounded-2xl border border-dark-border overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-dark-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-accent-rose/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-amber/60" />
                  <div className="w-3 h-3 rounded-full bg-accent-emerald/60" />
                </div>
                <span className="text-[11px] text-gray-500 font-mono ml-2">architect-agent — zsh</span>
                {previewRunning && (
                  <span className="ml-auto text-[10px] text-accent-purple flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" /> executing
                  </span>
                )}
                {previewDone && (
                  <span className="ml-auto text-[10px] text-accent-emerald flex items-center gap-1">
                    <i className="fa-solid fa-check" /> completed
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                {previewLogs.length === 0 && !previewRunning && (
                  <p className="text-gray-600">$ Click "Run Agent" to simulate execution</p>
                )}
                {previewLogs.map((log, i) => (
                  <div key={i} className={`${
                    log.type === 'success' ? 'text-accent-emerald' :
                    log.type === 'tool'    ? 'text-accent-amber' :
                    log.type === 'output'  ? 'text-accent-cyan' :
                    'text-gray-300'
                  }`}>
                    {log.text}
                  </div>
                ))}
                {previewRunning && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <span className="animate-pulse">█</span>
                  </div>
                )}
              </div>
            </div>

            {/* Result card */}
            {previewDone && (
              <div className="bg-dark-card border border-accent-emerald/20 rounded-xl p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 flex items-center justify-center">
                    <i className="fa-solid fa-circle-check text-accent-emerald" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Pipeline executed successfully</p>
                    <p className="text-[11px] text-gray-400">4.3s · 1,204 tokens · $0.0003 · eval score: 0.91</p>
                  </div>
                </div>
                <button onClick={onDeploy}
                  className="px-3 py-1.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-xs font-semibold rounded-xl transition">
                  Deploy Now
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
