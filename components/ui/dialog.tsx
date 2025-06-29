"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Dialog = ({ children, open, onOpenChange }: DialogProps) => {
  if (!open) return null
  
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onOpenChange) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onOpenChange])
  
  return <>{children}</>
}

const DialogContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
    <div 
      className="fixed inset-0 bg-black/50" 
      onClick={() => {
        const dialog = document.querySelector('[role="dialog"]')
        if (dialog) {
          const event = new CustomEvent('close-dialog')
          dialog.dispatchEvent(event)
        }
      }}
    />
    <div 
      role="dialog"
      className={cn(
        "relative bg-background rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col",
        className
      )} 
      {...props}
    >
      <div className="overflow-y-auto flex-1 px-6 py-6">
        {children}
      </div>
    </div>
  </div>
)

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold", className)} {...props} />
)

const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 mt-4 border-t", className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
