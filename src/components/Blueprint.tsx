import type { ReactNode } from 'react'

type BlueprintProps = {
  as?: 'div' | 'section' | 'article'
  children: ReactNode
  className?: string
  cell?: boolean
}

export function Blueprint({
  as: Tag = 'div',
  children,
  className = '',
  cell = false,
}: BlueprintProps) {
  return (
    <Tag className={`${cell ? 'blueprint blueprint-cell' : 'blueprint'} ${className}`}>
      {children}
    </Tag>
  )
}
