"use client"

import {
  ChatContainerRoot,
  ChatContainerContent,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
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
import { PromptSuggestion } from "@/components/prompt-kit/prompt-suggestion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Sparkles,
  BrainCircuit,
  ArrowLeft,
  Users,
  User,
} from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { nanoid } from "nanoid"
import { motion, AnimatePresence } from "framer-motion"

// Import translations
import en from "@/messages/en.json"
import es from "@/messages/es.json"
import pt from "@/messages/pt.json"

// Translation helper
const translations = { en, es, pt }
type Locale = keyof typeof translations

function useTranslation() {
  const [locale, setLocale] = useState<Locale>('en')
  
  useEffect(() => {
    // Detect browser language
    const browserLang = navigator.language.split('-')[0] as Locale
    if (translations[browserLang]) {
      setLocale(browserLang)
    }
  }, [])
  
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: unknown = translations[locale]
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k]
      }
    }
    return (typeof value === 'string' ? value : key)
  }
  
  return { t, locale, setLocale }
}

// Global fallback tracker that persists across component re-renders and hot reloads
const globalFallbackTracker = new Set<string>()

// Global timeout tracker to prevent duplicate timeouts across hot reloads
declare global {
  var __globalTimeoutTracker: Set<string> | undefined
  var __globalFallbackTracker: Set<string> | undefined
}

if (typeof window !== 'undefined') {
  if (!globalThis.__globalTimeoutTracker) {
    globalThis.__globalTimeoutTracker = new Set<string>()
  }
  if (!globalThis.__globalFallbackTracker) {
    globalThis.__globalFallbackTracker = new Set<string>()
  }
}

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
  console.log("ChatContent component rendered/mounted")
  const { t, locale, setLocale } = useTranslation()
  
  const suggestionGroups = [
    {
      label: t('categories.ourVision'),
      icon: Sparkles,
      highlight: t('highlights.vision'),
      items: [
        t('suggestions.vision.item1'),
        t('suggestions.vision.item2'),
        t('suggestions.vision.item3'),
        t('suggestions.vision.item4'),
      ],
    },
    {
      label: t('categories.forOrganizations'),
      icon: BrainCircuit,
      highlight: t('highlights.organization'),
      items: [
        t('suggestions.organizations.item1'),
        t('suggestions.organizations.item2'),
        t('suggestions.organizations.item3'),
        t('suggestions.organizations.item4'),
        t('suggestions.organizations.item5'),
      ],
    },
    {
      label: t('categories.forTeams'),
      icon: Users,
      highlight: t('highlights.team'),
      items: [
        t('suggestions.teams.item1'),
        t('suggestions.teams.item2'),
        t('suggestions.teams.item3'),
        t('suggestions.teams.item4'),
        t('suggestions.teams.item5'),
      ],
    },
    {
      label: t('categories.forIndividuals'),
      icon: User,
      highlight: t('highlights.purpose'),
      items: [
        t('suggestions.individuals.item1'),
        t('suggestions.individuals.item2'),
        t('suggestions.individuals.item3'),
        t('suggestions.individuals.item4'),
      ],
    },
  ]
  
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState(initialMessages)
  const [isChatActive, setIsChatActive] = useState(false)
  const [activeCategory, setActiveCategory] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const fallbackTriggered = useRef<Set<string>>(new Set())
  const agentTimeoutSet = useRef<Set<string>>(new Set())
  const fallbackInProgress = useRef<Set<string>>(new Set())
  const activeMessageIds = useRef<Set<string>>(new Set())

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clean up all active message IDs when component unmounts
      const globalTimeoutTracker = globalThis.__globalTimeoutTracker
             if (globalTimeoutTracker) {
         activeMessageIds.current.forEach(messageId => {
           globalTimeoutTracker.delete(messageId)
           globalFallbackTracker.delete(messageId)
           globalThis.__globalFallbackTracker?.delete(messageId)
           globalThis.__globalFallbackTracker?.delete(messageId + "_api_called")
         })
       }
    }
  }, [])

  const handleSubmit = async (value?: string) => {
    const message = (typeof value === "string" ? value : prompt).trim()
    if (!message) return

    if (!isChatActive) {
      setIsChatActive(true)
    }

    console.log("handleSubmit called with prompt:", message)
    
    setPrompt("")
    setIsLoading(true)

    // Add user message immediately
    const newUserMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: message,
    }

    setChatMessages((prev) => [...prev, newUserMessage])

    // Simulate API response
    try {
      console.log("Making API call to /api/chat with question:", message)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: message }),
      })

      console.log("API response received, status:", response.status)
      if (!response.ok) throw new Error("Failed to get response")

      // Create assistant message with streaming
      const assistantMessageId = nanoid()
      console.log("Creating assistant message with ID:", assistantMessageId)
      
      // Track this message ID for cleanup
      activeMessageIds.current.add(assistantMessageId)
      
      // Clear any old fallback tracking (cleanup)
      fallbackTriggered.current.clear()
      agentTimeoutSet.current.clear()
      fallbackInProgress.current.clear()
      
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        stream: createStreamFromResponse(response, assistantMessageId),
      }

      setChatMessages((prev) => [...prev, assistantMessage])

      // Set a timeout to trigger fallback if streaming takes too long
      setTimeout(async () => {
        console.log("Timeout reached, checking message status...")
        
        // Use setChatMessages to access current state
        setChatMessages(prev => {
          const currentMessage = prev.find(msg => msg.id === assistantMessageId)
          
          if (currentMessage && !currentMessage.content.trim() && currentMessage.isStreaming && 
              !fallbackTriggered.current.has(assistantMessageId)) {
            
            // Double-check global tracker before making API call
            const globalFallback = globalThis.__globalFallbackTracker
            if (globalFallback && globalFallback.has(assistantMessageId + "_api_called")) {
              console.log("Main timeout: API call already made for this message, skipping...")
              return prev
            }
            
            fallbackTriggered.current.add(assistantMessageId)
            if (globalFallback) {
              globalFallback.add(assistantMessageId + "_api_called")
            }
            console.log("Streaming timeout reached, triggering fallback...")
            
            // Trigger fallback API call
            fetch("/api/chat-fallback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: message }),
            })
            .then(async (fallbackResponse) => {
              if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json()
                console.log("Timeout fallback response received:", fallbackData)
                
                // Extract the response text from various possible fields
                let responseText = ""
                if (typeof fallbackData === 'string') {
                  responseText = fallbackData
                } else if (fallbackData.text) {
                  responseText = fallbackData.text
                } else if (fallbackData.response) {
                  responseText = fallbackData.response
                } else if (fallbackData.answer) {
                  responseText = fallbackData.answer
                } else if (fallbackData.content) {
                  responseText = fallbackData.content
                } else {
                  responseText = JSON.stringify(fallbackData)
                }
                
                if (responseText.trim()) {
                  setChatMessages(prevMessages => 
                    prevMessages.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: responseText.trim(), isStreaming: false, stream: undefined }
                        : msg
                    )
                  )
                }
              }
            })
            .catch((fallbackError) => {
              console.error("Timeout fallback API failed:", fallbackError)
            })
          } else {
            console.log("Message has content or is not streaming, skipping fallback")
          }
          
          return prev // Don't modify state in this call
        })
      }, 5000) // Reduced to 5 seconds
    } catch (error) {
        console.error("Error:", error)
        // Add error message
        setChatMessages((prev) => [...prev, {
            id: nanoid(),
            role: "assistant",
            content: t('common.error'),
        }])
    }
    finally {
      setIsLoading(false)
    }
  }

      async function* createStreamFromResponse(response: Response, messageId: string) {
    console.log("Starting stream for message ID:", messageId)
    if (!response.body) return

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let accumulatedContent = ""
    let lastTokenTime = Date.now()
    const TIMEOUT_MS = 10000 // 10 seconds timeout
    
    try {
      while (true) {
        // Add timeout check
        if (Date.now() - lastTokenTime > TIMEOUT_MS) {
          console.log("Stream timeout - no meaningful tokens received in", TIMEOUT_MS, "ms")
          break
        }
        
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine.startsWith('data:')) {
            const dataContent = trimmedLine.slice(5).trim()
            if (dataContent) {
              try {
                const parsed = JSON.parse(dataContent)
                
                // Handle different Flowise event types
                console.log("Parsed event:", parsed.event, "Data:", parsed.data)
                
                                 if (parsed.event === "token" && parsed.data !== undefined) {
                   // Handle both string and empty string tokens
                   accumulatedContent += parsed.data
                   // Reset timeout if we get meaningful content
                   if (parsed.data.trim()) {
                     lastTokenTime = Date.now()
                   }
                   // Update the message content in real time
                   setChatMessages(prev => 
                     prev.map(msg => 
                       msg.id === messageId 
                         ? { ...msg, content: accumulatedContent }
                         : msg
                     )
                   )
                   yield parsed.data
                 } else if (parsed.event === "nextAgentFlow" && parsed.data?.status === "FINISHED") {
                   console.log("Agent flow finished for node:", parsed.data.nodeLabel)
                   // Check if this is the agent finishing and might have a response
                   if (parsed.data.nodeLabel?.includes("Agent")) {
                     console.log("Main agent finished, checking for response...")
                   }
                 } else if (parsed.event === "nextAgentFlow" && parsed.data?.status === "INPROGRESS") {
                   console.log("Agent flow started for node:", parsed.data.nodeLabel)
                   
                                       // If this is the main agent starting, set a shorter timeout
                    if (parsed.data.nodeLabel?.includes("Agent")) {
                                            // Only set timeout once per message (not per agent node) and across hot reloads
                      const globalTimeoutTracker = globalThis.__globalTimeoutTracker
                      if (!agentTimeoutSet.current.has(messageId) && 
                          globalTimeoutTracker && !globalTimeoutTracker.has(messageId)) {
                        agentTimeoutSet.current.add(messageId)
                        globalTimeoutTracker.add(messageId)
                        console.log("Setting agent timeout for message:", messageId)
                        
                        setTimeout(async () => {
                          console.log("Timeout callback fired for message:", messageId)
                          
                          // Use global tracker to prevent race conditions across re-renders
                          const globalFallback = globalThis.__globalFallbackTracker
                          if (globalFallback && globalFallback.has(messageId)) {
                            console.log("Fallback already triggered globally, skipping...")
                            return
                          }
                          
                          if (globalTimeoutTracker.has(messageId)) {
                            console.log("Fallback already triggered locally, skipping...")
                            return
                          }
                          
                          // Mark fallback as triggered globally and locally
                          if (globalFallback) {
                            globalFallback.add(messageId)
                          }
                          globalTimeoutTracker.add(messageId)
                          
                          // Use a synchronous check to prevent race conditions
                          if (fallbackInProgress.current.has(messageId)) {
                            console.log("Fallback already in progress, skipping duplicate timeout...")
                            return
                          }
                          
                          // Check if fallback already completed
                          if (fallbackTriggered.current.has(messageId)) {
                            console.log("Fallback already triggered for this message, skipping agent timeout...")
        return
                          }
                          
                          // Mark fallback as in progress immediately
                          fallbackInProgress.current.add(messageId)
                          
                          console.log("Agent timeout - main agent has been running too long")
                          
                          setChatMessages(prev => {
                            const currentMessage = prev.find(msg => msg.id === messageId)
                            if (currentMessage && !currentMessage.content.trim()) {
                              // Double-check global tracker before making API call
                              const globalFallback = globalThis.__globalFallbackTracker
                              if (globalFallback && globalFallback.has(messageId + "_api_called")) {
                                console.log("API call already made for this message, skipping...")
                                return prev
                              }
                              
                              // Mark as triggered only when we actually trigger it
                              fallbackTriggered.current.add(messageId)
                              if (globalFallback) {
                                globalFallback.add(messageId + "_api_called")
                              }
                              console.log("Triggering immediate fallback due to agent timeout...")
                            
                            fetch("/api/chat-fallback", {
                              method: "POST", 
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ question: "test" }), // We'll need to get this properly
                            })
                            .then(async (fallbackResponse) => {
                              if (fallbackResponse.ok) {
                                const fallbackData = await fallbackResponse.json()
                                console.log("Agent timeout fallback response:", fallbackData)
                                
                                let responseText = ""
                                if (typeof fallbackData === 'string') {
                                  responseText = fallbackData
                                } else if (fallbackData.text) {
                                  responseText = fallbackData.text
                                } else if (fallbackData.response) {
                                  responseText = fallbackData.response
                                } else if (fallbackData.answer) {
                                  responseText = fallbackData.answer
                                } else if (fallbackData.content) {
                                  responseText = fallbackData.content
                                } else {
                                  responseText = JSON.stringify(fallbackData)
                                }
                                
                                if (responseText.trim()) {
                                  setChatMessages(prevMessages => 
                                    prevMessages.map(msg => 
                                      msg.id === messageId 
                                        ? { ...msg, content: responseText.trim(), isStreaming: false, stream: undefined }
                                        : msg
                                    )
                                  )
                                }
                              }
                            })
                            .catch(console.error)
                          }
                          return prev
                        })
                                              }, 3000) // 3 seconds after agent starts
                      }
                    }
                 } else if (parsed.event === "agentFlowEvent") {
                   console.log("Agent flow event:", parsed.data)
                   if (parsed.data === "FINISHED") {
                     console.log("Overall agent flow completed!")
                   }
                   // Don't treat status messages as text responses
                 } else if (parsed.event === "end" && parsed.data) {
                   console.log("End event with data:", parsed.data)
                   // Do not process the [DONE] message as part of the content
                 } else if (parsed.event === "agentResponse" && parsed.data && typeof parsed.data === 'string') {
                   console.log("Agent response:", parsed.data)
                   accumulatedContent += parsed.data
                   setChatMessages(prev => 
                     prev.map(msg => 
                       msg.id === messageId 
                         ? { ...msg, content: accumulatedContent }
                         : msg
                     )
                   )
                   yield parsed.data
                 } else if (parsed.event === "finalResponse" && parsed.data && typeof parsed.data === 'string') {
                   console.log("Final response:", parsed.data)
                   accumulatedContent += parsed.data
                   setChatMessages(prev => 
                     prev.map(msg => 
                       msg.id === messageId 
                         ? { ...msg, content: accumulatedContent }
                         : msg
                     )
                   )
                   yield parsed.data
                 }
              } catch (error) {
                console.log("Failed to parse SSE data:", dataContent, "Error:", error)
              }
            }
          }
        }
      }
      
      // Mark streaming as complete
      console.log("Stream ended. Final accumulated content:", accumulatedContent)
      
      // If we got no meaningful content, try fallback API
      if (!accumulatedContent.trim()) {
        console.log("No content received via streaming, trying fallback non-streaming API...")
        try {
          // Get the original question from the user message
          const userMessages = chatMessages.filter(msg => msg.role === 'user')
          const lastUserMessage = userMessages[userMessages.length - 1]
          
          if (lastUserMessage) {
            const fallbackResponse = await fetch("/api/chat-fallback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ question: lastUserMessage.content }),
            })
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              console.log("Fallback response received:", fallbackData)
              
              // Extract the response text from various possible fields
              let responseText = ""
              if (typeof fallbackData === 'string') {
                responseText = fallbackData
              } else if (fallbackData.text) {
                responseText = fallbackData.text
              } else if (fallbackData.response) {
                responseText = fallbackData.response
              } else if (fallbackData.answer) {
                responseText = fallbackData.answer
              } else if (fallbackData.content) {
                responseText = fallbackData.content
              } else {
                responseText = JSON.stringify(fallbackData)
              }
              
              if (responseText.trim()) {
                setChatMessages(prev => 
            prev.map(msg =>
                    msg.id === messageId 
                      ? { ...msg, content: responseText.trim(), isStreaming: false, stream: undefined }
                : msg
            )
          )
                return // Exit early since we got a fallback response
              }
            }
          }
        } catch (fallbackError) {
          console.error("Fallback API also failed:", fallbackError)
        }
      }
      
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isStreaming: false, stream: undefined }
            : msg
        )
      )
    } finally {
      reader.releaseLock()
    }
  }

  const handleStreamComplete = (messageId: string) => {
    // Clean up tracking for this message
    activeMessageIds.current.delete(messageId)
    fallbackTriggered.current.delete(messageId)
    agentTimeoutSet.current.delete(messageId)
    fallbackInProgress.current.delete(messageId)
    globalFallbackTracker.delete(messageId)
    globalThis.__globalTimeoutTracker?.delete(messageId)
    globalThis.__globalFallbackTracker?.delete(messageId)
    globalThis.__globalFallbackTracker?.delete(messageId + "_api_called")
    
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false, stream: undefined }
          : msg
      )
    )
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
    handleSubmit(suggestion)
  }

  const handleCategoryClick = (categoryLabel: string) => {
    setActiveCategory(categoryLabel)
    setPrompt("") // Clear input when a category is selected
  }
  
  const handlePromptChange = (value: string) => {
    setPrompt(value)
    if (activeCategory) {
      setActiveCategory("") // Reset category if user types
    }
  }

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  )

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="text-foreground">{t('common.brandName')}</div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale('en')}
            className={locale === 'en' ? 'bg-accent' : ''}
          >
            EN
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale('es')}
            className={locale === 'es' ? 'bg-accent' : ''}
          >
            ES
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale('pt')}
            className={locale === 'pt' ? 'bg-accent' : ''}
          >
            PT
          </Button>
        </div>
      </header>

      <motion.div
        className={cn("flex flex-1 flex-col min-h-0", isChatActive ? "justify-between" : "justify-center")}
        initial={{ justifyContent: "center" }}
      >
        <motion.div
          ref={chatContainerRef}
          className="relative min-h-0 w-full overflow-y-auto"
          animate={{
            height: isChatActive ? "100%" : "auto",
            flexGrow: isChatActive ? 1 : 0,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {isChatActive ? (
            <ChatContainerRoot className="h-full">
              <ChatContainerContent className="space-y-0 px-5 py-12">
                {chatMessages.map((message) => {
            const isAssistant = message.role === "assistant"

            return (
                    <div
                key={message.id}
                      className="mx-auto w-full max-w-3xl px-6 py-2"
              >
                      <Message
                        className={cn(
                          "w-full",
                          isAssistant ? "justify-start" : "justify-end"
                        )}
                      >
                        {isAssistant ? (
                          <>
                            <div className="group flex w-full flex-col gap-1">
                              <MessageContent className="text-foreground prose bg-transparent">
                                {message.isStreaming && message.stream ? (
                                  <ResponseStream
                                    textStream={message.stream}
                                    onComplete={() =>
                                      handleStreamComplete(message.id)
                                    }
                                  />
                                ) : (
                                  message.content
                                )}
                              </MessageContent>
                              {/* MessageActions removed since no children */}
        </div>
                          </>
                        ) : (
                          <div className="group flex w-full flex-col items-end gap-1">
                            <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                        {message.content}
                      </MessageContent>
                            {/* MessageActions removed since no children */}
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
          ) : (
            <div className="flex flex-col items-center justify-center gap-8">
              <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-medium tracking-tight text-transparent mb-8">
                {t('landing.mainHeading')}
              </h1>
          </div>
          )}
        </motion.div>

        <motion.div
          className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5"
          layout="position"
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="mx-auto max-w-3xl">
            <PromptInput
              value={prompt}
              onValueChange={handlePromptChange}
              isLoading={isLoading}
              onSubmit={() => handleSubmit()}
              className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-sm"
            >
              <div className="flex flex-col">
              <PromptInputTextarea
                  placeholder={t('common.askAnything')}
                  className="font-sans min-h-[44px] pt-3 pl-4 text-base leading-[1.3] placeholder:text-base"
                />
                <PromptInputActions className="flex w-full items-center justify-end gap-2 px-3 pb-3 pt-2">
                  <PromptInputAction
                    tooltip={isLoading ? t('common.stopGeneration') : t('common.sendMessage')}
                  >
                <Button
                      variant="default"
                      size="icon"
                      className="size-9 rounded-full"
                      disabled={!prompt.trim() || isLoading}
                  type="submit"
                    >
                      {isLoading ? (
                        <span className="size-3 rounded-xs bg-white" />
                      ) : (
                        <ArrowUp size={18} />
                      )}
                </Button>
              </PromptInputAction>
                </PromptInputActions>
              </div>
            </PromptInput>
            {!isChatActive && (
              <div className="relative h-28">
                <AnimatePresence mode="wait">
                  <motion.div
                  key={activeCategory ? "suggestions" : "categories"}
                  className="mt-4 flex flex-wrap justify-center gap-2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {!activeCategory ? (
                    suggestionGroups.map((suggestion) => (
                      <PromptSuggestion
                        key={suggestion.label}
                        onClick={() => handleCategoryClick(suggestion.label)}
                      >
                        <suggestion.icon className="mr-2" size={16} />
                        {suggestion.label}
                      </PromptSuggestion>
                    ))
                  ) : (
                    <div className="flex w-full flex-col items-center space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveCategory("")}
                        className="self-start text-muted-foreground"
                      >
                        <ArrowLeft className="mr-2" size={16} />
                        {t('common.back')}
                      </Button>
                      {activeCategoryData?.items.map((item) => (
                        <PromptSuggestion
                          key={item}
                          highlight={activeCategoryData.highlight}
                          onClick={() => handleSuggestionClick(item)}
                          className="w-full"
                        >
                          {item}
                        </PromptSuggestion>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            )}
    </div>
        </motion.div>
      </motion.div>
    </main>
  )
}

function FullChatApp() {
  return <ChatContent />
}

export default FullChatApp
