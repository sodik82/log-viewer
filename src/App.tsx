import { useState } from 'react';
import { DropZone } from './components/DropZone/DropZone';
import { FileList } from './components/FileList/FileList';
import { LogTable } from './components/LogTable/LogTable';
import { useLoadedFiles } from './hooks/useLoadedFiles';
import { useLogTable } from './hooks/useLogTable';
import './App.css';

export function App() {
  const { files, addFiles, removeFile, clearAll } = useLoadedFiles();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { columns, rows, hasNoTimestamp } = useLogTable(files, filters);

  function handleFilterChange(col: string, value: string) {
    setFilters((prev) => ({ ...prev, [col]: value }));
  }

  function handleClearAll() {
    clearAll();
    setFilters({});
  }

  function handleRemoveFile(id: string) {
    removeFile(id);
  }

  const hasEntries = files.some((f) => f.entries.length > 0);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Log Viewer</h1>
      </header>
      <main className="app__main">
        <DropZone onFiles={addFiles} />
        <FileList files={files} onRemove={handleRemoveFile} onClear={handleClearAll} />
        {hasEntries ? (
          <LogTable
            columns={columns}
            rows={rows}
            filters={filters}
            onFilterChange={handleFilterChange}
            hasNoTimestamp={hasNoTimestamp}
          />
        ) : files.length === 0 ? (
          <div className="app__empty">
            Load one or more log files to get started.
          </div>
        ) : null}
      </main>
    </div>
  );
}
