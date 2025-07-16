"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const ChatContainerRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col h-full", className)}
    {...props}
  />
))
ChatContainerRoot.displayName = "ChatContainerRoot"

const ChatContainerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto", className)}
    {...props}
  />
))
ChatContainerContent.displayName = "ChatContainerContent"

const ChatContainerScrollAnchor = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("h-0 w-0", className)}
        {...props}
    />
))
ChatContainerScrollAnchor.displayName = "ChatContainerScrollAnchor"


export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } 