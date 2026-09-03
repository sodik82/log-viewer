import { useRef, useState } from 'react'
import { PastePanel } from '../PastePanel/PastePanel'
import './DropZone.css'

interface Props {
  onFiles: (files: File[]) => void
  onPasteText: (content: string) => void
}

export function DropZone({ onFiles, onPasteText }: Props) {
  const [dragging, setDragging] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    onFiles(Array.from(e.dataTransfer.files))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    e.target.value = ''
  }

  function handleLoad(content: string) {
    onPasteText(content)
    setShowPaste(false)
  }

  return (
    <div
      className={`drop-zone${dragging ? ' drop-zone--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="drop-zone__text">
        Drop log files here or{' '}
        <button className="drop-zone__btn" onClick={() => inputRef.current?.click()}>
          browse
        </button>{' '}
        or{' '}
        <button className="drop-zone__btn" onClick={() => setShowPaste((s) => !s)}>
          paste text
        </button>
      </span>
      <span className="drop-zone__hint">.json · .ndjson · .log · .csv · .txt</span>
      {showPaste && <PastePanel onLoad={handleLoad} onCancel={() => setShowPaste(false)} />}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".json,.ndjson,.log,.csv,.txt"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  )
}
