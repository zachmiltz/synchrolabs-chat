"use client"

import {
  ChatContainerRoot,
  ChatContainerContent,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ResponseStream } from "@/components/prompt-kit/response-stream"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
} from "lucide-react"
import { useRef, useState } from "react"
import { nanoid } from "nanoid"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  stream?: AsyncIterable<string>
}

// Initial chat messages
const initialMessages: ChatMessage[] = []

function ChatContent() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState(initialMessages)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    const newUserMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: prompt.trim(),
    }

    setChatMessages([...chatMessages, newUserMessage])

    // Simulate API response
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt.trim() }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      // Create assistant message with streaming
      const assistantMessage: ChatMessage = {
        id: nanoid(),
        role: "assistant",
        content: "",
        isStreaming: true,
        stream: createStreamFromResponse(response),
      }

      setChatMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
        console.error("Error:", error)
        // Add error message
        setChatMessages((prev) => [...prev, {
            id: nanoid(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
        }])
    }
    finally {
      setIsLoading(false)
    }
  }

  async function* createStreamFromResponse(response: Response) {
    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "))
        
        for (const line of lines) {
          try {
            const jsonString = line.slice(6)
            const parsed = JSON.parse(jsonString)
            if (parsed.type === "token") {
              yield parsed.data
            }
          } catch {
            // Ignore parse errors for partial data
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const handleStreamComplete = (messageId: string, finalContent: string) => {
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: finalContent, isStreaming: false, stream: undefined }
          : msg
      )
    )
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <div className="text-foreground">Project roadmap discussion</div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {chatMessages.map((message, index) => {
              const isAssistant = message.role === "assistant"
              const isLastMessage = index === chatMessages.length - 1

              return (
                <div
                  key={message.id}
                  className="mx-auto w-full max-w-3xl px-6 py-2"
                >
                  <Message className={cn("w-full", isAssistant ? "justify-start" : "justify-end")}>
                    {isAssistant ? (
                      <>
                        <div className="group flex w-full flex-col gap-1">
                          <MessageContent className="text-foreground prose bg-transparent">
                            {message.isStreaming && message.stream ? (
                              <ResponseStream
                                textStream={message.stream}
                                onComplete={() => handleStreamComplete(message.id, message.content)}
                              />
                            ) : (
                              message.content
                            )}
                          </MessageContent>
                          <MessageActions
                            className={cn(
                              "flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                              isLastMessage && "opacity-100"
                            )}
                          >
                            <MessageAction tooltip="Copy">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      </>
                    ) : (
                      <div className="group flex flex-col items-end gap-1 max-w-[80%]">
                        <MessageContent className="bg-primary text-primary-foreground rounded-2xl px-4 py-2">
                          {message.content}
                        </MessageContent>
                        <MessageActions
                          className="flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        >
                          <MessageAction tooltip="Copy">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </MessageAction>
                        </MessageActions>
                      </div>
                    )}
                  </Message>
                </div>
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
            value={prompt}
            onValueChange={setPrompt}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            className="w-full"
          >
            <PromptInputTextarea placeholder="Ask me anything..." />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction
                tooltip={isLoading ? "Stop generation" : "Send message"}
              >
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={!prompt.trim() || isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <span className="size-3 rounded-xs bg-white" />
                  ) : (
                    <ArrowUp className="size-5" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </main>
  )
}

function FullChatApp() {
  return <ChatContent />
}

export default FullChatApp
