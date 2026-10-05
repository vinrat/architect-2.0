import { create } from 'zustand'
import type { AgentNode, ChatMessage } from '../types'

interface WorkspaceStore {
  projectId: string | null
  projectTitle: string
  nodes: AgentNode[]
  isStreaming: boolean
  streamedLines: string[]
  streamedCode: string
  chatMessages: ChatMessage[]
  terminalLines: string[]
  _streamKey: number
  setProject: (id: string, title: string) => void
  setNodes: (nodes: AgentNode[]) => void
  updateNode: (id: string, config: Partial<AgentNode>) => void
  setStreaming: (v: boolean) => void
  appendStreamLine: (line: string) => void
  clearStream: () => void
  restartStream: () => void
  addChatMessage: (msg: ChatMessage) => void
  addTerminalLine: (line: string) => void
  clearTerminal: () => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  projectId: null,
  projectTitle: '',
  nodes: [],
  isStreaming: false,
  streamedLines: [],
  streamedCode: '',
  chatMessages: [],
  terminalLines: ['architect-cli v2.0 initialized.'],
  _streamKey: 0,
  setProject: (projectId, projectTitle) => set({ projectId, projectTitle }),
  setNodes: (nodes) => set({ nodes }),
  updateNode: (id, config) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...config } : n)),
    })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamLine: (line) =>
    set((s) => ({
      streamedLines: [...s.streamedLines, line],
      streamedCode: s.streamedCode + line + '\n',
    })),
  clearStream: () => set({ streamedLines: [], streamedCode: '', isStreaming: false }),
  restartStream: () => set({ streamedLines: [], streamedCode: '', isStreaming: false, _streamKey: Date.now() }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  addTerminalLine: (line) =>
    set((s) => ({ terminalLines: [...s.terminalLines, line] })),
  clearTerminal: () => set({ terminalLines: [] }),
}))
