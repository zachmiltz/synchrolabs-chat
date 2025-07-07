"use client"

import {
  ArrowUp,
  Copy,
  Pencil,
  Plus,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import {
  ChatContainerRoot,
  ChatContainerContent,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { ScrollButton } from "@/components/ui/scroll-button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ResponseStream } from "@/components/ui/response-stream"
import { cn } from "@/lib/utils"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatContentProps {
  messages: ChatMessage[]
  input: string
  onInputChange: (value: string) => void
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatContent({
  messages,
  input,
  onInputChange,
  onSendMessage,
  isLoading,
}: ChatContentProps) {
  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input)
    }
  }

  return (
    <TooltipProvider>
      <main className="flex h-screen flex-col overflow-hidden">
        <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
          <div className="text-lg font-semibold tracking-tight">
            FlowiseAI Agent
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="space-y-0 px-5 py-12">
              {messages.map((message, index) => {
                const isAssistant = message.role === "assistant"

                return (
                  <Message
                    key={message.id}
                    className={cn(
                      "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6",
                      isAssistant ? "items-start" : "items-end"
                    )}
                  >
                    <code className="text-xs text-zinc-500">
                      ID: {message.id}
                    </code>
                    {isAssistant ? (
                      <div className="group flex w-full flex-col gap-0">
                        <div
                          className={cn(
                            "text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                          )}
                        >
                          {isLoading && !message.content ? (
                            <Loader variant="circular" />
                          ) : (
                            <ResponseStream
                              textStream={message.content}
                              mode="fade"
                            />
                          )}
                        </div>
                        <MessageActions
                          className={cn(
                            "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                          )}
                        >
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <Copy />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Upvote" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <ThumbsUp />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Downvote" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <ThumbsDown />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    ) : (
                      <div className="group flex flex-col items-end gap-1">
                        <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                          {message.content}
                        </MessageContent>
                        <MessageActions
                          className={cn(
                            "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                          )}
                        >
                          <MessageAction tooltip="Edit" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <Pencil />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Delete" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <Trash />
                            </Button>
                          </MessageAction>
                          <MessageAction tooltip="Copy" delayDuration={100}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                            >
                              <Copy />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    )}
                  </Message>
                )
              })}
            </ChatContainerContent>
            <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
              <ScrollButton className="shadow-sm" />
            </div>
          </ChatContainerRoot>
        </div>

        <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
          <div className="mx-auto max-w-3xl">
            <PromptInput
              value={input}
              onValueChange={onInputChange}
              onSubmit={handleSend}
              className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Ask anything"
                  className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                />

                <PromptInputActions className="mt-5 flex w-full items-center justify-end gap-2 px-3 pb-3">
                  <Button
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    onClick={handleSend}
                    className="size-9 rounded-full"
                  >
                    {isLoading ? (
                      <Square className="size-3 animate-spin" />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </Button>
                </PromptInputActions>
              </div>
            </PromptInput>
          </div>
        </div>
      </main>
    </TooltipProvider>
  )
} 