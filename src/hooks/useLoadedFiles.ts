import { useState } from 'react'
import type { LoadedFile } from '../types/log'
import { getLoaderForFile } from '../loaders'

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) ?? '')
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function useLoadedFiles() {
  const [files, setFiles] = useState<LoadedFile[]>([])

  async function addFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList)

    const loaded = await Promise.all(
      arr.map(async (file): Promise<LoadedFile> => {
        let content: string
        try {
          content = await readFileAsText(file)
        } catch {
          return {
            id: generateId(),
            name: file.name,
            entries: [],
            timestampField: null,
            error: 'Failed to read file',
          }
        }

        if (!content.trim()) {
          return {
            id: generateId(),
            name: file.name,
            entries: [],
            timestampField: null,
            error: 'File is empty',
          }
        }

        const loader = getLoaderForFile(file.name, content)
        try {
          const { entries, timestampField } = loader.parse(content, file.name)
          return {
            id: generateId(),
            name: file.name,
            entries,
            timestampField,
            error: entries.length === 0 ? 'No valid entries found' : null,
          }
        } catch {
          return {
            id: generateId(),
            name: file.name,
            entries: [],
            timestampField: null,
            error: 'Parse error',
          }
        }
      })
    )

    setFiles((prev) => [...prev, ...loaded])
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function clearAll() {
    setFiles([])
  }

  return { files, addFiles, removeFile, clearAll }
}
