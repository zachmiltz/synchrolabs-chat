"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PromptSuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  highlight?: string
}

const PromptSuggestion = React.forwardRef<
  HTMLButtonElement,
  PromptSuggestionProps
>(({ className, children, highlight, ...props }, ref) => {
  const highlightText = (text: string, highlightStr?: string) => {
    if (!highlightStr) {
      return text
    }

    const regex = new RegExp(`(${highlightStr})`, "gi")
    const newText = text.replace(
      regex,
      `<span class="prompt-suggestion-highlight">$1</span>`
    )
    return <span dangerouslySetInnerHTML={{ __html: newText }} />
  }

  const content =
    typeof children === "string" ? highlightText(children, highlight) : children

  return (
    <Button
      ref={ref}
      variant={highlight ? "ghost" : "outline"}
      size={highlight ? "sm" : "lg"}
      className={cn(
        "whitespace-nowrap",
        highlight && "w-full justify-start text-left",
        className
      )}
      {...props}
    >
      {content}
    </Button>
  )
})

PromptSuggestion.displayName = "PromptSuggestion"

export { PromptSuggestion } 