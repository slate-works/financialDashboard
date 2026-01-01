'use client'

import * as React from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  
  const currentValue = value ?? internalValue
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }, [value, onValueChange])

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative" data-slot="select">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} data-slot="select-group" className={cn('', className)} {...props} />
))
SelectGroup.displayName = 'SelectGroup'

interface SelectValueProps {
  placeholder?: string
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext()
  return (
    <span data-slot="select-value" className={cn(!value && 'text-muted-foreground')}>
      {value || placeholder}
    </span>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'default'
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = 'default', children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext()
    
    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        data-slot="select-trigger"
        data-size={size}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
          className,
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDownIcon className={cn("size-4 opacity-50 transition-transform", open && "rotate-180")} />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'popper' | 'item-aligned'
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = 'popper', ...props }, ref) => {
    const { open, setOpen } = useSelectContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      if (!open) return
      
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          const trigger = contentRef.current.parentElement?.querySelector('[data-slot="select-trigger"]')
          if (trigger && !trigger.contains(event.target as Node)) {
            setOpen(false)
          }
        }
      }
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpen(false)
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [open, setOpen])
    
    if (!open) return null
    
    return (
      <div
        ref={contentRef}
        data-slot="select-content"
        className={cn(
          'bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 max-h-96 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectContent.displayName = 'SelectContent'

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="select-label"
    className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useSelectContext()
    const isSelected = selectedValue === value
    
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        data-slot="select-item"
        data-disabled={disabled || undefined}
        className={cn(
          "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent/50",
          className,
        )}
        onClick={() => !disabled && onValueChange?.(value)}
        {...props}
      >
        <span className="absolute right-2 flex size-3.5 items-center justify-center">
          {isSelected && <CheckIcon className="size-4" />}
        </span>
        {children}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="select-separator"
    className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
    {...props}
  />
))
SelectSeparator.displayName = 'SelectSeparator'

const SelectScrollUpButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="select-scroll-up-button"
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  />
))
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

const SelectScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="select-scroll-down-button"
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  />
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
