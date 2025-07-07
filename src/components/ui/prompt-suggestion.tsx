"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

const promptSuggestionVariants = cva(
  "flex items-center justify-center gap-2",
  {
    variants: {
      variant: {
        default: "",
      },
      size: {
        default: "h-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface PromptSuggestionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof promptSuggestionVariants> {
  highlight?: boolean
}

const PromptSuggestion = React.forwardRef<
  HTMLDivElement,
  PromptSuggestionProps
>(({ className, variant, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(promptSuggestionVariants({ variant, size, className }))}
    {...props}
  />
))
PromptSuggestion.displayName = "PromptSuggestion"

export interface PromptSuggestionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const PromptSuggestionButton = React.forwardRef<
  HTMLButtonElement,
  PromptSuggestionButtonProps
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      className={cn("text-zinc-500", className)}
      {...props}
    />
  )
})
PromptSuggestionButton.displayName = "PromptSuggestionButton"

export { PromptSuggestion, PromptSuggestionButton }
