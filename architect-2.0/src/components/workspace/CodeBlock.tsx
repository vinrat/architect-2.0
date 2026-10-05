import { useEffect, useRef } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

interface Props {
  code: string
  isStreaming?: boolean
}

export default function CodeBlock({ code, isStreaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [code, isStreaming])

  if (!code.trim()) return null

  return (
    <Highlight theme={themes.vsDark} code={code} language="python">
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} text-xs leading-relaxed overflow-x-auto`}
          style={{ ...style, background: 'transparent', margin: 0, padding: 0 }}
        >
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line })
            return (
              <div
                key={i}
                {...lineProps}
                className="flex hover:bg-white/[0.03] transition-colors group"
              >
                {/* Line number */}
                <span className="select-none w-10 shrink-0 text-right pr-4 text-dark-border group-hover:text-gray-600 transition-colors font-mono">
                  {i + 1}
                </span>
                {/* Code tokens */}
                <span className="flex-1">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            )
          })}
          {/* Streaming cursor */}
          {isStreaming && (
            <div className="flex">
              <span className="w-10 shrink-0" />
              <span className="inline-block w-2 h-4 bg-accent-purple animate-pulse rounded-sm" />
            </div>
          )}
          <div ref={bottomRef} />
        </pre>
      )}
    </Highlight>
  )
}
