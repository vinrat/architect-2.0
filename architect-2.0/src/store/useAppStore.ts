import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  persona: 'vibe' | 'code' | null
  currentLens: 'canvas' | 'hybrid' | 'code'
  activeModel: string
  activeModelId: string
  theme: 'dark' | 'light'
  setPersona: (p: 'vibe' | 'code') => void
  setLens: (l: 'canvas' | 'hybrid' | 'code') => void
  setModel: (label: string, id: string) => void
  setTheme: (t: 'dark' | 'light') => void
  resetPersona: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      persona: null,
      currentLens: 'canvas',
      activeModel: 'Claude Haiku 4.5',
      activeModelId: 'claude-haiku-4-5-20251001',
      theme: 'dark' as const,
      setPersona: (persona) => set({
        persona,
        currentLens: persona === 'code' ? 'code' : 'canvas',
      }),
      setLens: (currentLens) => set({ currentLens }),
      setModel: (activeModel, activeModelId) => set({ activeModel, activeModelId }),
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('light', theme === 'light')
      },
      resetPersona: () => set({ persona: null }),
    }),
    { name: 'architect-app-store' }
  )
)
