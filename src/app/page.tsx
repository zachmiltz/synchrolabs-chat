"use client"

import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputAction,
} from "@/components/ui/prompt-input"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ArrowUp, Copy } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { nanoid } from "nanoid"
import { cn } from "@/lib/utils"
import { Loader } from "@/components/ui/loader"
import { ResponseStream } from "@/components/ui/response-stream"
import { ScrollButton } from "@/components/ui/scroll-button"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

async function* streamToAsyncIterable(stream: ReadableStream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk
        .split("\n")
        .filter(line => line.startsWith("data: "))
      for (const line of lines) {
        const jsonString = line.slice(6)
        try {
          const parsed = JSON.parse(jsonString)
          if (parsed.type === "token") {
            yield parsed.data
          }
        } catch (_e) {
          // Ignore parse errors for partial data
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [stream, setStream] = useState<AsyncIterable<string> | null>(null)
  const isStreaming = useRef(false)

  // handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log(event)
    setInput(event.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isStreaming.current) return

    isStreaming.current = true
    setIsLoading(true)

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: input,
    }
    const currentInput = input
    setMessages(prev => [...prev, userMessage])
    setInput("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: currentInput,
          history: messages,
        }),
      })

      if (!response.body) {
        throw new Error("No response body")
      }

      const assistantMessageId = nanoid()
      setMessages(prev => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ])

      const iterableStream = streamToAsyncIterable(response.body)
      setStream(iterableStream)
    } catch (error) {
      console.error("Error fetching chat response:", error)
      setIsLoading(false)
      isStreaming.current = false
    }
  }

  useEffect(() => {
    const processStream = async () => {
      if (!stream) return

      let assistantResponse = ""
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role !== "assistant") {
        setIsLoading(false)
        isStreaming.current = false
        setStream(null)
        return
      }
      const assistantMessageId = lastMessage.id

      try {
        for await (const chunk of stream) {
          assistantResponse += chunk
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantResponse }
                : msg
            )
          )
        }
      } catch (error) {
        console.error("Error processing stream:", error)
      } finally {
        setStream(null)
        setIsLoading(false)
        isStreaming.current = false
      }
    }

    processStream()
  }, [stream, messages])

  return (
    <TooltipProvider>
      <ChatContainerRoot>
        <ChatContainerContent>
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1
            const isAssistant = message.role === "assistant"

            return (
              <Message
                key={message.id}
                className={cn(
                  "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6"
                )}
              >
                {isAssistant ? (
                  <div className="group flex w-full flex-col gap-0">
                    {isLastMessage && isLoading && stream ? (
                      <div
                        className={cn(
                          "text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                        )}
                      >
                        <ResponseStream textStream={stream} mode="fade" />
                      </div>
                    ) : message.content ? (
                      <MessageContent
                        markdown
                        className={cn(
                          "text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                        )}
                      >
                        {message.content}
                      </MessageContent>
                    ) : (
                      <Loader variant="circular" />
                    )}
                    <MessageActions
                      className={cn(
                        "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      )}
                    >
                      <MessageAction tooltip="Copy message">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigator.clipboard.writeText(message.content)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </MessageAction>
                    </MessageActions>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-foreground">You</div>
                    <div className="text-foreground">{message.content}</div>
                  </>
                )}
              </Message>
            )
          })}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <div className="mx-auto w-full max-w-3xl px-6 pb-4">
          <div className="flex items-center justify-end">
            <ScrollButton />
          </div>
          <form onSubmit={handleSubmit}>
            <PromptInput>
              <PromptInputTextarea
                placeholder="Ask a question"
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(
                      e as unknown as React.FormEvent<HTMLFormElement>
                    )
                  }
                }}
              />
              <PromptInputAction tooltip="Send message">
                <Button
                  type="submit"
                  aria-label="Send message"
                  disabled={isLoading || !input.trim()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </PromptInputAction>
            </PromptInput>
          </form>
        </div>
      </ChatContainerRoot>
    </TooltipProvider>
  )
}
