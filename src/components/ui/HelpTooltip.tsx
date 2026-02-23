'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function HelpTooltip({ content, side = 'top', className = '' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 ltr:mr-2 rtl:ml-2',
    right: 'left-full top-1/2 -translate-y-1/2 ltr:ml-2 rtl:mr-2',
  }

  // Swap left/right for RTL
  const effectiveSide = side

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-text-muted hover:text-accent transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-[264px] rounded-lg border border-border-default bg-bg-elevated shadow-modal p-3 ${positionClasses[effectiveSide]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-text-secondary leading-relaxed">{content}</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-sm p-0.5 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
