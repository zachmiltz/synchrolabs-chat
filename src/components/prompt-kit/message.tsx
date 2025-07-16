"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Message = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-start", className)}
    {...props}
  />
))
Message.displayName = "Message"

const MessageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 rounded-lg", className)}
    {...props}
  />
))
MessageContent.displayName = "MessageContent"

const MessageActions = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center ml-4", className)}
        {...props}
    />
))
MessageActions.displayName = "MessageActions"

const MessageAction = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <button
        ref={ref}
        className={cn("p-2 text-gray-500 hover:text-gray-700", className)}
        {...props}
    />
))
MessageAction.displayName = "MessageAction"


export { Message, MessageContent, MessageActions, MessageAction } 