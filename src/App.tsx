import { useCallback, useMemo } from 'react'
import { DropZone } from './components/DropZone/DropZone'
import { FileList } from './components/FileList/FileList'
import { LogTable } from './components/LogTable/LogTable'
import { TimeHistogram } from './components/TimeHistogram/TimeHistogram'
import { useLoadedFiles } from './hooks/useLoadedFiles'
import { useLogTable } from './hooks/useLogTable'
import { useLogTableInstance } from './hooks/useLogTableInstance'
import { useColumnConfig } from './hooks/useColumnConfig'
import type { DateRangeFilterValue } from './components/LogTable/filters/filterFunctions'
import type { LogEntry } from './types/log'
import './App.css'

export function App() {
  const { files, addFiles, removeFile, clearAll } = useLoadedFiles()
  const { sorted, columns, hasNoTimestamp, allEntries } = useLogTable(files)
  const { config, presentIds, reorder, setVisible, merge, unmerge } = useColumnConfig(columns)
  const visibleConfig = useMemo(
    () => config.filter((c) => c.visible && presentIds.has(c.id)),
    [config, presentIds]
  )
  const table = useLogTableInstance(sorted, visibleConfig)

  const hasEntries = files.some((f) => f.entries.length > 0)
  const hasTimestamps = allEntries.some((e) => e._timestamp !== null)

  const timestampCol = table.getColumn('_timestamp')
  const filterValue = timestampCol?.getFilterValue() as DateRangeFilterValue | undefined
  const handleFilterChange = useCallback(
    (v: DateRangeFilterValue | undefined) => timestampCol?.setFilterValue(v),
    [timestampCol]
  )

  const filteredRows = table.getFilteredRowModel().rows
  const filteredEntries = useMemo(
    () => filteredRows.map((row) => row.original as LogEntry),
    [filteredRows]
  )

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Log Viewer</h1>
      </header>
      <main className="app__main">
        {files.length === 0 && <DropZone onFiles={addFiles} />}
        <FileList files={files} onRemove={removeFile} onClear={clearAll} onAdd={addFiles} />
        {hasEntries && hasTimestamps && (
          <TimeHistogram
            entries={allEntries}
            filteredEntries={filteredEntries}
            filterValue={filterValue}
            onFilterChange={handleFilterChange}
          />
        )}
        {hasEntries ? (
          <LogTable
            table={table}
            hasNoTimestamp={hasNoTimestamp}
            config={config}
            presentIds={presentIds}
            onReorder={reorder}
            onSetVisible={setVisible}
            onMerge={merge}
            onUnmerge={unmerge}
          />
        ) : files.length === 0 ? (
          <div className="app__empty">Load one or more log files to get started.</div>
        ) : null}
      </main>
    </div>
  )
}
