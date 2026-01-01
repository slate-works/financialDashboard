'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext() {
  const context = React.useContext(PopoverContext)
  if (!context) {
    throw new Error('Popover components must be used within a Popover')
  }
  return context
}

interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Popover({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, onOpenChange])

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <div className="relative inline-block" data-slot="popover">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = usePopoverContext()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onOpenChange(!open)
    }
    
    const combinedRef = (node: HTMLButtonElement) => {
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
      ;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
    }
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref: combinedRef,
        onClick: handleClick,
        'aria-expanded': open,
        'data-state': open ? 'open' : 'closed',
      })
    }
    
    return (
      <button
        ref={combinedRef}
        type="button"
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        data-slot="popover-trigger"
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
PopoverTrigger.displayName = 'PopoverTrigger'

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => {
    const { open, onOpenChange } = usePopoverContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      if (!open) return
      
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          const popover = contentRef.current.closest('[data-slot="popover"]')
          if (popover && !popover.contains(event.target as Node)) {
            onOpenChange(false)
          }
        }
      }
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onOpenChange(false)
        }
      }
      
      // Delay to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [open, onOpenChange])
    
    if (!open) return null
    
    const alignClass = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    }[align]
    
    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        }}
        data-slot="popover-content"
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'bg-popover text-popover-foreground absolute z-50 w-72 rounded-md border p-4 shadow-md outline-none animate-in fade-in-0 zoom-in-95',
          alignClass,
          className,
        )}
        style={{ top: `calc(100% + ${sideOffset}px)` }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PopoverContent.displayName = 'PopoverContent'

const PopoverAnchor = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
)
PopoverAnchor.displayName = 'PopoverAnchor'

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
