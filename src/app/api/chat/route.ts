import { NextRequest } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()

    const flowiseUrl =
      "https://cloud.flowiseai.com/api/v1/prediction/50773b81-f178-4994-aa59-2ce1ff768baa"

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

    if (!flowiseResponse.ok) {
      const errorText = await flowiseResponse.text()
      return new Response(`Error from Flowise API: ${errorText}`, {
        status: flowiseResponse.status,
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        if (flowiseResponse.body) {
          const reader = flowiseResponse.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
} 