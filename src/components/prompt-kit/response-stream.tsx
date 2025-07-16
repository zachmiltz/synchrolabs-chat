"use client"

import * as React from "react"
import { useEffect, useState } from "react"

interface ResponseStreamProps {
  textStream: AsyncIterable<string>
  onComplete: (text: string) => void
}

const ResponseStream: React.FC<ResponseStreamProps> = ({ textStream, onComplete }) => {
  const [text, setText] = useState("")

  useEffect(() => {
    let isMounted = true
    let accumulatedText = ""

    async function processStream() {
      for await (const value of textStream) {
        if (!isMounted) break
        accumulatedText += value
        setText(accumulatedText)
      }
      if (isMounted) {
        onComplete(accumulatedText)
      }
    }

    processStream()

    return () => {
      isMounted = false
    }
  }, [textStream, onComplete])

  return <>{text}</>
}

export { ResponseStream } 