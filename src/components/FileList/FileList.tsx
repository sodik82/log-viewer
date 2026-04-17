import type { LoadedFile } from '../../types/log'
import './FileList.css'

interface Props {
  files: LoadedFile[]
  onRemove: (id: string) => void
  onClear: () => void
}

export function FileList({ files, onRemove, onClear }: Props) {
  if (files.length === 0) return null

  return (
    <div className="file-list">
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
    </div>
  )
}
