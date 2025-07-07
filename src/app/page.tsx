"use client"

import { useState } from "react"
import { ArrowUpIcon, BrainIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import {
  PromptSuggestionButton,
} from "@/components/ui/prompt-suggestion"
import { ChatContent, ChatMessage } from "@/components/chat-content"
import { AssistantResponse } from "@/components/assistant-response"

const suggestionGroups = [
  {
    label: "Summary",
    items: ["Summarize a document", "Summarize a video"],
  },
  {
    label: "Code",
    items: ["Help me write React components", "Help me debug code"],
  },
]

function PromptSuggestionsView({
  onSend,
}: {
  onSend: (prompt: string) => void
}) {
  const [inputValue, setInputValue] = useState("")
  const [activeCategory, setActiveCategory] = useState("")

  const handleSend = () => {
    if (inputValue.trim()) {
      onSend(inputValue)
      setInputValue("")
      setActiveCategory("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      // The form's onSubmit will handle the send
    }
  }

  const handlePromptInputValueChange = (value: string) => {
    setInputValue(value)
    if (value.trim() === "") {
      setActiveCategory("")
    }
  }

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  )

  const showCategorySuggestions = activeCategory !== ""

  return (
    <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-4">
      <PromptInput
        className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
        value={inputValue}
        onValueChange={handlePromptInputValueChange}
        onSubmit={handleSend}
      >
        <PromptInputTextarea
          placeholder="Ask anything..."
          className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
          onKeyDown={handleKeyDown}
        />
        <PromptInputActions className="mt-5 flex w-full items-end justify-end gap-2 px-3 pb-3">
          <Button
            size="sm"
            className="h-9 w-9 rounded-full"
            type="submit"
            disabled={!inputValue.trim()}
          >
            <ArrowUpIcon className="h-4 w-4" />
          </Button>
        </PromptInputActions>
      </PromptInput>

      <div className="relative flex w-full flex-col items-center justify-center space-y-2">
        <div className="relative flex w-full flex-wrap items-stretch justify-start gap-2">
          {showCategorySuggestions
            ? activeCategoryData?.items.map((suggestion) => (
                <PromptSuggestionButton
                  key={suggestion}
                  onClick={() => {
                    setInputValue(suggestion)
                  }}
                >
                  {suggestion}
                </PromptSuggestionButton>
              ))
            : suggestionGroups.map((suggestion) => (
                <PromptSuggestionButton
                  key={suggestion.label}
                  onClick={() => {
                    setActiveCategory(suggestion.label)
                    setInputValue("")
                  }}
                  className="capitalize"
                >
                  <BrainIcon className="mr-2 h-4 w-4" />
                  {suggestion.label}
                </PromptSuggestionButton>
              ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState("")

  const handleSend = async (message: string) => {
    if (isLoading) return

    if (!showChat) {
      setShowChat(true)
    }

    setIsLoading(true)
    setCurrentQuestion(message)

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    }
    setMessages((prev) => [...prev, userMessage])
  }

  const handleStreamingComplete = (content: string) => {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
    }
    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
    setCurrentQuestion("")
  }

  if (showChat) {
    return (
      <ChatContent
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSendMessage={handleSend}
        isLoading={isLoading}
        currentQuestion={currentQuestion}
        onStreamingComplete={handleStreamingComplete}
      />
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <PromptSuggestionsView onSend={handleSend} />
    </main>
  )
}
