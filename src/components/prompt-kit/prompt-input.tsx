"use client"

import * as React from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string
    onValueChange: (value: string) => void
    onSubmit: () => void
    isLoading?: boolean
    children?: React.ReactNode
}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, value, onValueChange, onSubmit, isLoading, children, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        if(onSubmit) onSubmit()
      }
    }

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full items-end", className)}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === PromptInputTextarea) {
              return React.cloneElement(child as React.ReactElement<React.TextareaHTMLAttributes<HTMLTextAreaElement>>, {
                value: value,
                onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onValueChange && onValueChange(e.target.value),
                onKeyDown: handleKeyDown,
                disabled: isLoading,
              })
            }
            if (child.type === PromptInputActions) {
                return React.cloneElement(child as React.ReactElement<{children?: React.ReactNode}>, {
                    children: React.Children.map((child.props as {children?: React.ReactNode}).children, (actionChild) => {
                        if (React.isValidElement(actionChild) && actionChild.type === PromptInputAction) {
                            return React.cloneElement(actionChild as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>, {
                                onClick: onSubmit,
                                disabled: isLoading,
                            })
                        }
                        return actionChild
                    })
                })
            }
          }
          return child
        })}
      </div>
    )
  }
)
PromptInput.displayName = "PromptInput"


const PromptInputTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
    <Textarea
        ref={ref}
        className={cn("flex-1 resize-none", className)}
        {...props}
    />
))
PromptInputTextarea.displayName = "PromptInputTextarea"


const PromptInputActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("absolute right-2 bottom-2 flex items-center", className)}
        {...props}
    />
))
PromptInputActions.displayName = "PromptInputActions"

const PromptInputAction = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <Button
        ref={ref}
        size="icon"
        className={cn("", className)}
        {...props}
    />
))
PromptInputAction.displayName = "PromptInputAction"


export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } 