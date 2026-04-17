import { useRef, useState } from 'react';
import './DropZone.css';

interface Props {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  }

  return (
    <div
      className={`drop-zone${dragging ? ' drop-zone--active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className="drop-zone__text">
        Drop log files here or{' '}
        <button className="drop-zone__btn" onClick={() => inputRef.current?.click()}>
          browse
        </button>
      </span>
      <span className="drop-zone__hint">.json · .ndjson · .log · .csv</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".json,.ndjson,.log,.csv"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </div>
  );
}
