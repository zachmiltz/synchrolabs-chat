import { NextRequest } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    console.log("Fallback API route called with question:", question)

    const flowiseUrl = process.env.FLOWISE_URL
    console.log("Flowise URL from env:", flowiseUrl ? "Loaded" : "Not Loaded")

    if (!flowiseUrl) {
      return new Response("FLOWISE_URL is not set in the environment.", {
        status: 500,
      })
    }

    console.log("Fetching from Flowise API (non-streaming)...")
    const flowiseResponse = await fetch(flowiseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question,
        streaming: false, // Explicitly disable streaming
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

    const responseData = await flowiseResponse.json()
    console.log("Flowise response data:", responseData)

    // Return the response as JSON
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Fallback API error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 