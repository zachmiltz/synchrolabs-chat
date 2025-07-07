"use client"

import { useEffect, useState } from "react"
import { Message } from "@/components/ui/message"
import { ResponseStream } from "@/components/ui/response-stream"
import { Loader } from "@/components/ui/loader"
import { cn } from "@/lib/utils"

async function* streamable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      let boundary
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const messageChunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const lines = messageChunk.split("\n")
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.substring(5).trim()
            if (data === "[DONE]") continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.event === "token" && typeof parsed.data === "string") {
                yield parsed.data
              }
            } catch (e) {
              console.error("Failed to parse SSE data in streamable:", data, e)
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

interface AssistantResponseProps {
  question: string
  onComplete: (content: string) => void
}

export function AssistantResponse({
  question,
  onComplete,
}: AssistantResponseProps) {
  const [stream, setStream] = useState<AsyncIterable<string> | null>(null)
  const [finalContent, setFinalContent] = useState("")

  useEffect(() => {
    let isCancelled = false

    const fetchStream = async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        })

        if (!response.ok || !response.body) {
          throw new Error("Failed to fetch stream")
        }

        if (isCancelled) return

        const [streamForDisplay, streamForData] = response.body.tee()
        setStream(streamable(streamForDisplay))

        const reader = streamForData.getReader()
        const decoder = new TextDecoder()
        let fullContent = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullContent += decoder.decode(value)
        }
        setFinalContent(fullContent)
      } catch (error) {
        console.error("Error fetching assistant response:", error)
        onComplete("Sorry, an error occurred.")
      }
    }

    fetchStream()

    return () => {
      isCancelled = true
    }
  }, [question, onComplete])

  const handleStreamComplete = () => {
    let parsedContent = ""
    try {
      const lines = finalContent
        .split("\n\n")
        .map((line) => line.trim())
        .filter(Boolean)

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = line.substring(5).trim()
          if (data === "[DONE]") continue
          const parsed = JSON.parse(data)
          if (parsed.event === "token") {
            parsedContent += parsed.data
          }
        }
      }
    } catch (e) {
      console.error("Error parsing final content:", e)
      parsedContent = "Sorry, there was an issue processing the response."
    }
    onComplete(parsedContent || "Sorry, the response was empty.")
  }

  return (
    <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6 items-start">
      <div className="group flex w-full flex-col gap-0">
        <div
          className={cn(
            "text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
          )}
        >
          {stream ? (
            <ResponseStream
              textStream={stream}
              onComplete={handleStreamComplete}
              mode="fade"
            />
          ) : (
            <Loader variant="circular" />
          )}
        </div>
      </div>
    </Message>
  )
} 