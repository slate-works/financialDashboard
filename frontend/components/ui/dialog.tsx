'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog')
  }
  return context
}

interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open: controlledOpen, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, onOpenChange])

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div data-slot="dialog">
        {children}
      </div>
    </DialogContext.Provider>
  )
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onOpenChange(true)
    }
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
      })
    }
    
    return (
      <button
        ref={ref}
        type="button"
        data-slot="dialog-trigger"
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
DialogTrigger.displayName = 'DialogTrigger'

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      onOpenChange(false)
    }
    
    return (
      <button
        ref={ref}
        type="button"
        data-slot="dialog-close"
        onClick={handleClick}
        {...props}
      />
    )
  }
)
DialogClose.displayName = 'DialogClose'

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { onOpenChange } = useDialogContext()
    
    return (
      <div
        ref={ref}
        data-slot="dialog-overlay"
        className={cn(
          'fixed inset-0 z-50 bg-black/50 animate-in fade-in-0',
          className,
        )}
        onClick={() => onOpenChange(false)}
        {...props}
      />
    )
  }
)
DialogOverlay.displayName = 'DialogOverlay'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext()
    
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false)
        }
      }
      
      if (open) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }, [open, onOpenChange])
    
    if (!open) return null
    
    return (
      <div data-slot="dialog-portal" className="fixed inset-0 z-50">
        <DialogOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          data-slot="dialog-content"
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg animate-in fade-in-0 zoom-in-95 sm:max-w-lg',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
          {showCloseButton && (
            <button
              type="button"
              data-slot="dialog-close"
              className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              onClick={() => onOpenChange(false)}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
)
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
