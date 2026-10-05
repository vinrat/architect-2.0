import { useRef } from 'react'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useAppStore } from '../store/useAppStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useStreamingCode() {
  const { appendStreamLine, clearStream, setStreaming } = useWorkspaceStore()
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

  const start = async (prompt: string, framework: string) => {
    clearStream()
    setStreaming(true)

    const { activeModelId } = useAppStore.getState()

    try {
      const resp = await fetch(`${API_URL}/api/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, framework, model_id: activeModelId }),
      })

      if (!resp.ok || !resp.body) {
        appendStreamLine(`<span class="text-red-400">[ERROR] Backend returned ${resp.status}</span>`)
        setStreaming(false)
        return
      }

      const reader = resp.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6)
            if (content === '[DONE]') { setStreaming(false); return }
            if (content.startsWith('[ERROR]')) {
              appendStreamLine(`<span class="text-red-400">${content}</span>`)
              setStreaming(false)
              return
            }
            if (content) appendStreamLine(content)
          }
        }
      }
    } catch (err: any) {
      appendStreamLine(`<span class="text-red-400">[ERROR] ${err.message}</span>`)
      setStreaming(false)
      throw err  // re-throw so callers can catch
    } finally {
      setStreaming(false)
    }
  }

  const stop = () => {
    readerRef.current?.cancel()
    setStreaming(false)
  }

  return { start, stop }
}
