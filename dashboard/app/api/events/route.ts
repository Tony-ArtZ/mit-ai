import { NextRequest } from "next/server";
import { connections } from "@/lib/sse-utils";

export async function GET(request: NextRequest) {
  // Create a new ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      connections.add(controller);

      // Send initial connection message
      const welcomeMessage = `event: connected\ndata: ${JSON.stringify({
        message: "Connected to log updates",
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcomeMessage));

      // Send keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          const ping = `event: ping\ndata: ${JSON.stringify({
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(ping));
        } catch {
          // Connection is closed
          clearInterval(keepAlive);
          connections.delete(controller);
        }
      }, 30000);

      // Clean up when the connection is closed
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        connections.delete(controller);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      });
    },

    cancel() {
      // This is called when the client disconnects
      // connections.delete(controller) is handled in the abort listener
    },
  });

  // Return the stream with appropriate headers for SSE
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
