"use client"

import { useState } from "react"
import { nanoid } from "nanoid"
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from "@/components/prompt-kit/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input"
import { ResponseStream } from "@/components/prompt-kit/response-stream"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Copy, ArrowUp } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  stream?: AsyncIterable<string>
}

export default function FlowiseChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput }),
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

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      // Add error message
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Simple stream creator for FlowiseAI response
  async function* createStreamFromResponse(response: Response) {
    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        console.log("Received chunk:", chunk)
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "))
        
        for (const line of lines) {
          try {
            const jsonString = line.slice(6)
            const parsed = JSON.parse(jsonString)
            console.log("Parsed data:", parsed)
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
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: finalContent, isStreaming: false, stream: undefined }
          : msg
      )
    )
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex h-screen flex-col">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="p-4">
          {messages.map((message) => (
            <Message key={message.id} className="mb-4">
              <MessageContent className={
                message.role === "user" 
                  ? "bg-blue-50 ml-12" 
                  : "bg-gray-50 mr-12"
              }>
                {message.isStreaming && message.stream ? (
                  <ResponseStream
                    textStream={message.stream}
                    onComplete={(finalText) => handleStreamComplete(message.id, finalText)}
                  />
                ) : (
                  message.content
                )}
              </MessageContent>
              
              {message.role === "assistant" && !message.isStreaming && (
                <MessageActions>
                  <MessageAction
                    onClick={() => copyToClipboard(message.content)}
                  >
                    <Copy className="h-4 w-4" />
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>
        <ScrollButton />
      </ChatContainerRoot>

      <div className="border-t p-4">
        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        >
          <PromptInputTextarea
            placeholder="Ask me anything..."
            className="min-h-[60px]"
          />
          <PromptInputActions>
            <PromptInputAction type="submit">
              <ArrowUp className="h-4 w-4" />
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
} 