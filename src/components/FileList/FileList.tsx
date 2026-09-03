import { useRef, useState } from 'react'
import type { LoadedFile } from '../../types/log'
import { PastePanel } from '../PastePanel/PastePanel'
import './FileList.css'

interface Props {
  files: LoadedFile[]
  onRemove: (id: string) => void
  onClear: () => void
  onAdd: (files: File[]) => void
  onPasteText: (content: string) => void
}

export function FileList({ files, onRemove, onClear, onAdd, onPasteText }: Props) {
  const [dragCount, setDragCount] = useState(0)
  const [showPaste, setShowPaste] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDragging = dragCount > 0

  if (files.length === 0) return null

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    setDragCount((c) => c + 1)
  }

  function handleDragLeave() {
    setDragCount((c) => c - 1)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragCount(0)
    onAdd(Array.from(e.dataTransfer.files))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length > 0) onAdd(picked)
    e.target.value = ''
  }

  function handleLoad(content: string) {
    onPasteText(content)
    setShowPaste(false)
  }

  return (
    <div
      className="file-list"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {files.map((f) => (
        <div key={f.id} className={`file-chip${f.error ? ' file-chip--error' : ''}`}>
          <span className="file-chip__name">{f.name}</span>
          <span className="file-chip__count">
            {f.error ? `⚠ ${f.error}` : `${f.entries.length.toLocaleString()} entries`}
          </span>
          <button className="file-chip__remove" onClick={() => onRemove(f.id)} title="Remove file">
            ×
          </button>
        </div>
      ))}
      {files.length > 1 && (
        <button className="file-list__clear" onClick={onClear}>
          Clear all
        </button>
      )}
      <div className={`file-list__add-zone${isDragging ? ' file-list__add-zone--active' : ''}`}>
        <button className="file-list__add-btn" onClick={() => inputRef.current?.click()}>
          + Add files
        </button>
        <button className="file-list__add-btn" onClick={() => setShowPaste((s) => !s)}>
          Paste text
        </button>
        {isDragging && <span className="file-list__drop-hint">Drop here</span>}
      </div>
      {showPaste && (
        <div className="file-list__paste-panel">
          <PastePanel onLoad={handleLoad} onCancel={() => setShowPaste(false)} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".json,.ndjson,.log,.csv,.txt"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
    </div>
  )
}
