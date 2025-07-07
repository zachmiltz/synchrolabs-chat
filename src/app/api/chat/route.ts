import { NextRequest } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    console.log("API route called with question:", question)

    const flowiseUrl = process.env.FLOWISE_URL
    console.log("Flowise URL from env:", flowiseUrl ? "Loaded" : "Not Loaded")


    if (!flowiseUrl) {
      return new Response("FLOWISE_URL is not set in the environment.", {
        status: 500,
      })
    }

    console.log("Fetching from Flowise API...")
    const flowiseResponse = await fetch(flowiseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question,
        streaming: true,
      }),
    })

    console.log("Flowise response status:", flowiseResponse.status)

    if (!flowiseResponse.ok) {
      const errorText = await flowiseResponse.text()
      console.error("Error from Flowise API:", errorText)
      return new Response(`Error from Flowise API: ${errorText}`, {
        status: flowiseResponse.status,
      })
    }

    if (!flowiseResponse.body) {
      console.error("Flowise response has no body")
      return new Response("Flowise response has no body.", { status: 500 })
    }

    const { readable, writable } = new TransformStream()
    flowiseResponse.body.pipeTo(writable)

    return new Response(readable, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 