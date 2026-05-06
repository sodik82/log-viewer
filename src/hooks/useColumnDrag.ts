import { useRef, useState } from 'react'
import type React from 'react'

export function useColumnDrag(onDrop: (srcId: string, dstId: string) => void): {
  dragOverId: string | null
  dragHandleProps: (id: string) => { draggable: true; onDragStart: () => void }
  dropTargetProps: (id: string) => {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: () => void
  }
} {
  const dragRef = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function dragHandleProps(id: string) {
    return {
      draggable: true as const,
      onDragStart: () => {
        dragRef.current = id
      },
    }
  }

  function dropTargetProps(id: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        setDragOverId(id)
      },
      onDragLeave: () => setDragOverId(null),
      onDrop: () => {
        const src = dragRef.current
        if (src && src !== id) onDrop(src, id)
        setDragOverId(null)
        dragRef.current = null
      },
    }
  }

  return { dragOverId, dragHandleProps, dropTargetProps }
}
