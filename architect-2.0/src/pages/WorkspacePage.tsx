import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store/useAppStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useStreamingCode } from '../hooks/useStreamingCode'
import { supabase } from '../api/auth'
import { buildFileTree } from '../utils/intentParser'
import DeployModal from '../components/modals/DeployModal'
import CodeBlock from '../components/workspace/CodeBlock'
import CanvasLens from '../components/workspace/CanvasLens'
import OverviewLens from '../components/workspace/OverviewLens'

const ALL_LENSES = [
  { id: 'canvas', label: 'Assistant',  badge: 'Vibe', icon: 'fa-wand-magic-sparkles', color: 'text-accent-cyan' },
  { id: 'hybrid', label: 'Overview',   badge: 'Both', icon: 'fa-layer-group',          color: 'text-accent-purple' },
  { id: 'code',   label: 'Code',       badge: 'Dev',  icon: 'fa-code',                 color: 'text-brand-500' },
]

export default function WorkspacePage() {
  const { id } = useParams()
  const { currentLens, setLens, persona } = useAppStore()
  const { projectTitle, setProject, streamedCode, isStreaming, terminalLines, addTerminalLine, _streamKey } = useWorkspaceStore()
  const { start: startStream, stop: stopStream } = useStreamingCode()
  const [project, setProjectData] = useState<{ prompt?: string; framework?: string; name?: string; persona?: string } | null>(null)
  const [showDeploy, setShowDeploy] = useState(false)
  const [streamError, setStreamError] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; indent: number; desc: string } | null>(null)

  const projectPersona = project?.persona || persona
  const LENSES = projectPersona === 'vibe' ? ALL_LENSES.filter(l => l.id !== 'code') : ALL_LENSES

  // Load project
  useEffect(() => {
    if (!id) return
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setProject(data.id, data.name)
          setProjectData(data)
          // Set lens based on project-level persona
          const projectPersona = data.persona || persona
          setLens(projectPersona === 'code' ? 'code' : 'canvas')
        }
      })
  }, [id])

  // Stream code when switching to Code Lens — only if no code yet
  useEffect(() => {
    if (currentLens === 'code' && project && !streamedCode && !isStreaming) {
      setStreamError(false)
      startStream(project.prompt || projectTitle, project.framework || 'langgraph')
        .catch(() => setStreamError(true))
    }
    return () => { if (currentLens !== 'code') stopStream() }
  }, [currentLens, project, _streamKey])

  const runTerminal = () => {
    addTerminalLine('<span class="text-accent-cyan">[LOG]</span> Executing agent suite... <span class="text-accent-emerald">Passed (0.42s)</span>')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-dark-bg">

      {/* Sub-header */}
      <div className="h-12 border-b border-dark-border bg-dark-panel px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-white truncate max-w-[160px]">{projectTitle || 'Workspace'}</span>
          <span className="text-[10px] bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 px-1.5 py-0.5 rounded">Live</span>
          {projectPersona === 'vibe' && (
            <span className="text-[10px] bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 px-1.5 py-0.5 rounded">
              <i className="fa-solid fa-wand-magic-sparkles mr-1" />Vibe Mode
            </span>
          )}
        </div>

        {/* Lens switcher */}
        <div className="flex items-center bg-dark-bg p-1 rounded-xl border border-dark-border">
          {LENSES.map((l) => (
            <button key={l.id} onClick={() => setLens(l.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentLens === l.id ? 'bg-dark-card text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
              <i className={`fa-solid ${l.icon} ${l.color}`} />
              <span className="hidden sm:inline">{l.label}</span>
            </button>
          ))}
        </div>

        <button onClick={() => setShowDeploy(true)}
          className="bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-1.5">
          <i className="fa-solid fa-rocket" /><span>Deploy</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* ── CANVAS LENS ── */}
        {currentLens === 'canvas' && project && (
          <CanvasLens
            projectId={id!}
            projectName={project.name || projectTitle}
            projectPrompt={project.prompt || projectTitle}
            projectFramework={project.framework || 'langgraph'}
            onSwitchLens={(lens) => setLens(lens)}
          />
        )}
        {currentLens === 'canvas' && !project && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── CODE LENS ── */}
        {currentLens === 'code' && (() => {
          const fw = project?.framework || 'langgraph'
          const prompt = project?.prompt || projectTitle
          const tree = buildFileTree(prompt, fw)
          const activeFile = tree.find(f => f.active)
          const resolvedFile = selectedFile || activeFile || tree.find(f => f.type === 'file') || tree[0]
          const codePhase: 'plan' | 'generating' | 'done' =
            isStreaming ? 'generating' : streamedCode ? 'done' : 'plan'

          return (
            <div className="w-full h-full flex flex-col lg:flex-row">

              {/* File explorer */}
              <div className="w-full lg:w-60 border-r border-dark-border bg-dark-bg flex flex-col shrink-0">
                <div className="px-3 py-2.5 border-b border-dark-border flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <i className="fa-solid fa-folder-tree mr-1 text-brand-500" /> Explorer
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-brand-500/30 text-brand-500 bg-brand-500/10">{fw}</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {tree.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => item.type === 'file' && setSelectedFile(item)}
                      style={{ paddingLeft: `${8 + (item.indent || 0) * 14}px` }}
                      className={`flex items-center gap-1.5 py-1 pr-3 text-xs font-mono transition ${
                        item.type === 'file' ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        selectedFile?.name === item.name && item.type === 'file'
                          ? 'bg-brand-500/10 text-brand-500'
                          : item.type === 'folder'
                            ? 'text-accent-amber'
                            : item.name === 'lyzr.config.json'
                              ? 'text-accent-purple hover:text-white'
                              : item.name === 'Dockerfile'
                                ? 'text-accent-cyan hover:text-white'
                                : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <i className={`text-[10px] shrink-0 fa-solid ${
                        item.type === 'folder' ? 'fa-folder' :
                        item.name.endsWith('.json') ? 'fa-brackets-curly' :
                        item.name === 'Dockerfile' ? 'fa-docker fa-brands' :
                        item.name.endsWith('.txt') ? 'fa-list' :
                        item.name.startsWith('.') ? 'fa-gear' :
                        'fa-file-code'
                      }`} />
                      <span className="truncate">{item.name}</span>
                      {codePhase === 'done' && item.type === 'file' && (
                        <i className="fa-solid fa-check text-accent-emerald text-[9px] ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor area */}
              <div className="flex-1 flex flex-col bg-dark-card min-w-0">

                {/* Tab bar */}
                <div className="h-9 bg-dark-bg border-b border-dark-border px-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1">
                    {resolvedFile && (
                      <span className="text-xs font-mono text-brand-500 bg-dark-card px-3 py-1 rounded-t border-t border-brand-500">
                        {resolvedFile.name}
                      </span>
                    )}
                  </div>
                  {isStreaming && (
                    <span className="text-[10px] text-accent-purple flex items-center gap-1.5 pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />Generating...
                    </span>
                  )}
                </div>

                {/* Main content area */}
                <div className="flex-1 bg-[#1e1e1e] overflow-y-auto relative">

                  {/* PHASE 1: PLAN — show file structure approval */}
                  {codePhase === 'plan' && !streamError && (
                    <div className="p-6 space-y-5">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Ready to generate code</p>
                        <p className="text-xs text-gray-400">
                          Based on your prompt, here's what will be generated. Review the structure then approve.
                        </p>
                      </div>

                      {/* File plan cards */}
                      <div className="space-y-1.5">
                        {tree.filter(f => f.type === 'file').map((f, i) => (
                          <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-dark-panel border border-dark-border hover:border-gray-600 transition">
                            <i className={`fa-solid ${
                              f.name.endsWith('.json') ? 'fa-brackets-curly text-accent-purple' :
                              f.name === 'Dockerfile' ? 'fa-docker fa-brands text-accent-cyan' :
                              f.name.endsWith('.txt') ? 'fa-list text-gray-400' :
                              f.name.startsWith('.') ? 'fa-gear text-gray-500' :
                              'fa-file-code text-brand-500'
                            } text-xs mt-0.5 shrink-0 w-4`} />
                            <div className="min-w-0">
                              <p className="text-xs font-mono text-white truncate">
                                {'  '.repeat(f.indent)}{f.name}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-0.5">{f.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Approve button */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setStreamError(false)
                            startStream(prompt, fw).catch(() => setStreamError(true))
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-purple hover:opacity-90 text-white text-sm font-semibold rounded-xl transition shadow-lg"
                        >
                          <i className="fa-solid fa-bolt" />
                          Generate {tree.filter(f => f.type === 'file').length} files with Claude
                        </button>
                        <p className="text-[11px] text-gray-500">
                          Uses <span className="text-white">{fw}</span> · Claude Bedrock
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PHASE 1 error state */}
                  {codePhase === 'plan' && streamError && (
                    <div className="p-6 flex flex-col items-center justify-center gap-4 text-center h-full">
                      <div className="w-12 h-12 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-center">
                        <i className="fa-solid fa-plug-circle-xmark text-accent-rose text-lg" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Backend not reachable</p>
                        <p className="text-xs text-gray-400 mt-1">Start the FastAPI server first</p>
                        <code className="text-[11px] text-gray-500 mt-2 block font-mono bg-dark-panel px-3 py-1.5 rounded-lg border border-dark-border">
                          uvicorn main:app --reload --port 8000
                        </code>
                      </div>
                      <button
                        onClick={() => {
                          setStreamError(false)
                          startStream(prompt, fw).catch(() => setStreamError(true))
                        }}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-rotate-right" /> Retry
                      </button>
                    </div>
                  )}

                  {/* PHASE 2: GENERATING */}
                  {codePhase === 'generating' && (
                    <div className="p-4">
                      {!streamedCode && (
                        <div className="flex items-center gap-2 text-accent-purple text-xs mb-4">
                          <div className="w-3 h-3 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                          <span>Generating {fw} agent code with Claude...</span>
                        </div>
                      )}
                      {streamedCode && <CodeBlock code={streamedCode} isStreaming={true} />}
                    </div>
                  )}

                  {/* PHASE 3: DONE */}
                  {codePhase === 'done' && (
                    <div className="p-4">
                      <CodeBlock code={streamedCode} isStreaming={false} />
                    </div>
                  )}
                </div>

                {/* Terminal */}
                <div className="h-36 border-t border-dark-border bg-dark-bg p-3 flex flex-col font-mono text-xs shrink-0">
                  <div className="flex justify-between items-center pb-2 border-b border-dark-border text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-terminal text-[10px]" /> Terminal
                    </span>
                    <button onClick={runTerminal} className="px-2 py-0.5 bg-brand-600 text-white rounded text-[10px] hover:bg-brand-500 transition">Run</button>
                  </div>
                  <div className="flex-1 overflow-y-auto mt-2 text-gray-400 space-y-1">
                    {terminalLines.map((line, i) => <div key={i} dangerouslySetInnerHTML={{ __html: line }} />)}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── HYBRID / OVERVIEW LENS ── */}
        {currentLens === 'hybrid' && project && (
          <OverviewLens
            projectName={project.name || projectTitle}
            projectPrompt={project.prompt || projectTitle}
            projectFramework={project.framework || 'langgraph'}
            onSwitchToCode={() => setLens('code')}
            onDeploy={() => setShowDeploy(true)}
          />
        )}
        {currentLens === 'hybrid' && !project && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}

      </div>
      {showDeploy && createPortal(
        <DeployModal
          projectName={projectTitle || project?.name || 'my-agent'}
          onClose={() => setShowDeploy(false)}
        />,
        document.body
      )}
    </div>
  )
}
