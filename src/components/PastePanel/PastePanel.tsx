import { useEffect, useRef, useState } from 'react'
import './PastePanel.css'

interface Props {
  onLoad: (content: string) => void
  onCancel: () => void
}

export function PastePanel({ onLoad, onCancel }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function handleLoad() {
    const trimmed = text.trim()
    if (!trimmed) return
    onLoad(trimmed)
    setText('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="paste-panel">
      <textarea
        ref={textareaRef}
        className="paste-panel__textarea"
        placeholder="Paste log content here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="paste-panel__actions">
        <button className="paste-panel__load" onClick={handleLoad} disabled={!text.trim()}>
          Load
        </button>
        <button className="paste-panel__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
