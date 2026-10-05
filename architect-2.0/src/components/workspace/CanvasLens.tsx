import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { supabase } from '../../api/auth'
import { parseIntent, nodesToSupabaseRows, rowToAgentNode } from '../../utils/intentParser'
import type { AgentNode } from '../../utils/intentParser'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Props {
  projectId: string
  projectName: string
  projectPrompt: string
  projectFramework: string
  onSwitchLens: (lens: 'hybrid') => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface NodeConfig {
  model_id: string
  system_prompt: string
  tools: string[]
  memory: boolean
  max_retries: number
}

const AVAILABLE_TOOLS = ['web_search', 'pdf_reader', 'slack', 'discord', 'email', 'google_drive', 'github', 'database', 'scheduler', 'vector_search']

const MODEL_OPTIONS = [
  { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 · Fastest' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 · Balanced' },
  { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 · Best' },
]






const TYPE_COLORS: Record<string, string> = {
  trigger:   'text-accent-cyan',
  processor: 'text-brand-500',
  analyzer:  'text-accent-purple',
  generator: 'text-accent-purple',
  evaluator: 'text-accent-amber',
  notifier:  'text-accent-emerald',
}

export default function CanvasLens({ projectId, projectName, projectPrompt, projectFramework, onSwitchLens }: Props) {
  const { activeModelId } = useAppStore()
  const [buildPhase, setBuildPhase] = useState<'building' | 'ready'>('building')
  const [visibleNodes, setVisibleNodes] = useState<AgentNode[]>([])
  const [allNodes, setAllNodes] = useState<AgentNode[]>([])
  const [detectedTools, setDetectedTools] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null)
  const [configPanelNode, setConfigPanelNode] = useState<AgentNode | null>(null)
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, NodeConfig>>({})
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

  // Load from DB first — only parse+save if no nodes exist yet
  useEffect(() => {
    if (!projectPrompt || !projectId) return

    const init = async () => {
      // 1. Load existing nodes from DB
      const { data: existingNodes } = await supabase
        .from('agent_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at')

      // 2. Load chat history from DB
      const { data: existingChat } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at')

      if (existingNodes && existingNodes.length > 0) {
        // Nodes already exist — reconstruct from DB, no LLM call needed
        const nodes = existingNodes.map((row, i) => rowToAgentNode(row, i))
        const { detectedTools: tools } = parseIntent(projectPrompt)
        setAllNodes(nodes)
        setDetectedTools(tools)
        setVisibleNodes(nodes) // show all at once, no animation
        setBuildPhase('ready')

        if (existingChat && existingChat.length > 0) {
          setChatMessages(existingChat.map(m => ({ id: m.id, role: m.role, content: m.content })))
        } else {
          setChatMessages([{ id: 'welcome', role: 'assistant', content: `Welcome back! Your ${nodes.length}-agent pipeline is ready. What would you like to change?` }])
        }
        return
      }

      // 3. First time — parse intent, animate, save to DB
      const { nodes, detectedTools: tools, summary } = parseIntent(projectPrompt)
      setAllNodes(nodes)
      setDetectedTools(tools)
      setVisibleNodes([])
      setBuildPhase('building')

      nodes.forEach((node, i) => {
        setTimeout(() => {
          setVisibleNodes(prev => [...prev, node])
          if (i === nodes.length - 1) {
            setTimeout(async () => {
              setBuildPhase('ready')
              // Save nodes to DB
              const rows = nodesToSupabaseRows(projectId, nodes)
              await supabase.from('agent_nodes').insert(rows)
              // Post welcome message
              const welcomeContent = `${summary}\n\nWhat would you like to add or change?`
              setChatMessages([{ id: 'welcome', role: 'assistant', content: welcomeContent }])
              await supabase.from('chat_messages').insert({ project_id: projectId, role: 'assistant', content: welcomeContent })
            }, 400)
          }
        }, i * 300)
      })
    }

    init()
  }, [projectId, projectPrompt])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, streamingText])

  const getNodeConfig = (nodeId: string): NodeConfig => nodeConfigs[nodeId] || {
    model_id: 'claude-haiku-4-5-20251001',
    system_prompt: '',
    tools: [],
    memory: false,
    max_retries: 3,
  }

  const updateNodeConfig = (nodeId: string, patch: Partial<NodeConfig>) => {
    setNodeConfigs(prev => ({ ...prev, [nodeId]: { ...getNodeConfig(nodeId), ...patch } }))
  }

  const saveNodeConfig = async (node: AgentNode) => {
    setSavingConfig(true)
    const config = getNodeConfig(node.id)
    await supabase.from('agent_nodes')
      .update({
        model_id: config.model_id,
        system_prompt: config.system_prompt,
        tools: config.tools,
        memory: config.memory,
        max_retries: config.max_retries,
      })
      .eq('project_id', projectId)
      .eq('name', node.label)
    setSavingConfig(false)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  const sendChat = async () => {
    const val = chatInput.trim()
    if (!val || streaming) return
    setChatInput('')

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: val }
    setChatMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setStreamingText('')

    // Save user message to Supabase
    await supabase.from('chat_messages').insert({ project_id: projectId, role: 'user', content: val })

    try {
      const resp = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: val,
          project_name: projectName,
          project_prompt: projectPrompt,
          framework: projectFramework,
          model_id: activeModelId,
          history: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!resp.ok || !resp.body) throw new Error(`Backend ${resp.status}`)

      const reader = resp.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const chunk = line.slice(6)
          if (chunk === '[DONE]') break
          if (chunk.startsWith('[ERROR]')) { full += '\n⚠️ ' + chunk.slice(8); break }
          full += chunk
          setStreamingText(full)
        }
      }

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: full }
      setChatMessages(prev => [...prev, aiMsg])
      setStreamingText('')
      await supabase.from('chat_messages').insert({ project_id: projectId, role: 'assistant', content: full })
    } catch (err: any) {
      const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `Sorry, I couldn't connect to the backend. ${err.message}` }
      setChatMessages(prev => [...prev, errMsg])
      setStreamingText('')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">

      {/* LEFT — Dynamic agent canvas */}
      <div className="w-full lg:w-72 border-r border-dark-border bg-dark-panel/60 flex flex-col shrink-0">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <i className="fa-solid fa-diagram-project mr-1.5 text-accent-cyan" />Agent Pipeline
          </p>
          {buildPhase === 'building' && (
            <span className="text-[10px] text-accent-purple flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />Building...
            </span>
          )}
          {buildPhase === 'ready' && (
            <span className="text-[10px] text-accent-emerald flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />Ready
            </span>
          )}
        </div>

        {/* Detected tools */}
        {detectedTools.length > 0 && buildPhase === 'ready' && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {detectedTools.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-card border border-dark-border text-gray-400">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Agent nodes */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {visibleNodes.map((node, i) => (
            <div key={node.id}>
              <button
                onClick={() => {
                  setSelectedNode(selectedNode?.id === node.id ? null : node)
                  setConfigPanelNode(configPanelNode?.id === node.id ? null : node)
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                  selectedNode?.id === node.id
                    ? node.color + ' border-opacity-80'
                    : 'border-dark-border bg-dark-card/60 hover:border-gray-600'
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{node.icon}</span>
                  <span className={`text-xs font-semibold ${TYPE_COLORS[node.type] || 'text-white'}`}>{node.label}</span>
                  <i className="fa-solid fa-sliders text-[9px] text-gray-500 ml-auto" />
                </div>
                <p className="text-[11px] text-gray-400 pl-6">{node.desc}</p>
              </button>

              {/* Connector arrow */}
              {i < visibleNodes.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <i className="fa-solid fa-arrow-down text-dark-border text-[10px]" />
                </div>
              )}
            </div>
          ))}

          {/* Placeholder skeleton nodes while building */}
          {buildPhase === 'building' && visibleNodes.length < (allNodes.length || 5) && (
            Array.from({ length: Math.max(0, (allNodes.length || 5) - visibleNodes.length) }).map((_, i) => (
              <div key={`sk-${i}`} className="p-3 rounded-xl border border-dark-border bg-dark-card/30 animate-pulse">
                <div className="h-3 bg-dark-border rounded w-3/4 mb-1.5" />
                <div className="h-2 bg-dark-border rounded w-full" />
              </div>
            ))
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-dark-border">
          <p className="text-[10px] text-gray-500 text-center">
            Curious about the code?{' '}
            <button onClick={() => onSwitchLens('hybrid')} className="text-accent-purple hover:underline">
              See the overview →
            </button>
          </p>
        </div>
      </div>

      {/* RIGHT — Chat + Node Config Panel */}
      <div className="flex-1 flex flex-col bg-dark-bg relative overflow-hidden">

        {/* Node Config Panel — slides in from right */}
        {configPanelNode && (() => {
          const config = getNodeConfig(configPanelNode.id)
          return (
            <div className="absolute inset-0 z-20 bg-dark-bg flex flex-col">
              {/* Panel header */}
              <div className="px-5 py-3 border-b border-dark-border bg-dark-panel/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{configPanelNode.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{configPanelNode.label}</p>
                    <p className="text-[10px] text-gray-400">Configure this agent</p>
                  </div>
                </div>
                <button onClick={() => setConfigPanelNode(null)} className="text-gray-400 hover:text-white transition">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Model selector */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">
                    <i className="fa-solid fa-microchip mr-1.5 text-accent-purple" />Model
                  </label>
                  <div className="space-y-1.5">
                    {MODEL_OPTIONS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => updateNodeConfig(configPanelNode.id, { model_id: m.id })}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition ${
                          config.model_id === m.id
                            ? 'border-accent-purple/50 bg-accent-purple/10 text-white'
                            : 'border-dark-border bg-dark-card text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{m.label}</span>
                          {config.model_id === m.id && <i className="fa-solid fa-check text-accent-purple text-[10px]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System prompt */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">
                    <i className="fa-solid fa-terminal mr-1.5 text-accent-cyan" />System Prompt
                  </label>
                  <textarea
                    value={config.system_prompt || configPanelNode.desc}
                    onChange={e => updateNodeConfig(configPanelNode.id, { system_prompt: e.target.value })}
                    rows={4}
                    placeholder={configPanelNode.desc}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent-cyan transition resize-none placeholder-gray-600"
                  />
                </div>

                {/* Tools */}
                <div>
                  <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">
                    <i className="fa-solid fa-plug mr-1.5 text-accent-amber" />Tools
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOOLS.map(tool => {
                      const active = config.tools.includes(tool)
                      return (
                        <button
                          key={tool}
                          onClick={() => updateNodeConfig(configPanelNode.id, {
                            tools: active
                              ? config.tools.filter(t => t !== tool)
                              : [...config.tools, tool]
                          })}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                            active
                              ? 'border-accent-amber/50 bg-accent-amber/10 text-accent-amber'
                              : 'border-dark-border bg-dark-card text-gray-500 hover:border-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {active && <i className="fa-solid fa-check text-[9px] mr-1" />}
                          {tool.replace('_', ' ')}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Memory + Retries */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">
                      <i className="fa-solid fa-brain mr-1.5 text-accent-purple" />Memory
                    </label>
                    <button
                      onClick={() => updateNodeConfig(configPanelNode.id, { memory: !config.memory })}
                      className={`w-full py-2 rounded-xl border text-xs font-semibold transition ${
                        config.memory
                          ? 'border-accent-purple/50 bg-accent-purple/10 text-accent-purple'
                          : 'border-dark-border bg-dark-card text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {config.memory ? '● Enabled' : '○ Disabled'}
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider block mb-2">
                      <i className="fa-solid fa-rotate-right mr-1.5 text-accent-emerald" />Max Retries
                    </label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateNodeConfig(configPanelNode.id, { max_retries: Math.max(0, config.max_retries - 1) })}
                        className="w-8 h-8 rounded-lg border border-dark-border bg-dark-card text-white hover:border-gray-500 transition text-sm">
                        −
                      </button>
                      <span className="flex-1 text-center text-sm font-bold text-white">{config.max_retries}</span>
                      <button onClick={() => updateNodeConfig(configPanelNode.id, { max_retries: Math.min(10, config.max_retries + 1) })}
                        className="w-8 h-8 rounded-lg border border-dark-border bg-dark-card text-white hover:border-gray-500 transition text-sm">
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="px-5 py-4 border-t border-dark-border shrink-0">
                <button
                  onClick={() => saveNodeConfig(configPanelNode)}
                  disabled={savingConfig}
                  className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingConfig
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    : configSaved
                      ? <><i className="fa-solid fa-check" /> Saved!</>
                      : <><i className="fa-solid fa-floppy-disk" /> Save Configuration</>
                  }
                </button>
              </div>
            </div>
          )
        })()}
        <div className="px-5 py-3 border-b border-dark-border bg-dark-panel/40 flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center">
            <i className="fa-solid fa-robot text-white text-[11px]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Architect AI</p>
            <p className="text-[10px] text-accent-emerald">● Online — ready to help</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Building state */}
          {buildPhase === 'building' && chatMessages.length === 0 && (
            <div className="flex gap-3 max-w-2xl">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
                <i className="fa-solid fa-robot text-white text-[10px]" />
              </div>
              <div className="bg-dark-card border border-dark-border rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
                <p className="text-xs font-bold text-accent-purple">Architect AI</p>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <div className="w-3 h-3 border-2 border-accent-purple border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Analysing your prompt and designing the agent pipeline...</span>
                </div>
                <div className="space-y-1 pt-1">
                  {['Parsing intent', 'Selecting agent types', 'Mapping tool integrations', 'Building workflow graph'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-[11px] text-gray-500">
                      <div className="w-3 h-3 border border-accent-purple/40 border-t-transparent rounded-full animate-spin" style={{ animationDelay: `${i * 200}ms` }} />
                      {step}...
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {chatMessages.map((m) => (
            <div key={m.id} className={`flex gap-3 max-w-2xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${m.role === 'user' ? 'bg-brand-600' : 'bg-gradient-to-tr from-accent-purple to-accent-cyan'}`}>
                <i className={`fa-solid ${m.role === 'user' ? 'fa-user' : 'fa-robot'} text-white`} />
              </div>
              <div className={`rounded-2xl px-4 py-3 max-w-sm ${m.role === 'user' ? 'bg-brand-600/20 border border-brand-500/30 rounded-tr-sm' : 'bg-dark-card border border-dark-border rounded-tl-sm'}`}>
                <p className={`text-xs font-bold mb-1 ${m.role === 'user' ? 'text-brand-500' : 'text-accent-purple'}`}>
                  {m.role === 'user' ? 'You' : 'Architect AI'}
                </p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {streaming && (
            <div className="flex gap-3 max-w-2xl">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent-purple to-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
                <i className="fa-solid fa-robot text-white text-[10px]" />
              </div>
              <div className="bg-dark-card border border-dark-border rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
                <p className="text-xs font-bold text-accent-purple mb-1">Architect AI</p>
                {streamingText ? (
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 bg-accent-purple animate-pulse ml-0.5 rounded-sm align-middle" />
                  </p>
                ) : (
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-dark-border bg-dark-panel/40 shrink-0">
          {buildPhase === 'ready' && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Add error handling', 'Add a retry mechanism', 'Make it run daily', 'Add Slack notifications'].map(s => (
                <button key={s} onClick={() => setChatInput(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-dark-bg border border-dark-border rounded-2xl px-4 py-2.5 focus-within:border-accent-purple transition">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder={buildPhase === 'building' ? 'Building your agent pipeline...' : 'Ask me to add, change, or improve anything...'}
                disabled={buildPhase === 'building'}
                className="w-full bg-transparent text-sm text-white outline-none placeholder-gray-500 disabled:opacity-40"
              />
            </div>
            <button onClick={sendChat} disabled={!chatInput.trim() || streaming || buildPhase === 'building'}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 disabled:opacity-40 flex items-center justify-center transition shrink-0">
              <i className="fa-solid fa-paper-plane text-white text-xs" />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center">Press Enter to send</p>
        </div>
      </div>
    </div>
  )
}
