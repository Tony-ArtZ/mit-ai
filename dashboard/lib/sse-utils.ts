// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

// Helper function to broadcast updates to all connected clients
export function broadcastUpdate(event: string, data: Record<string, unknown>) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  // Remove closed connections and send to active ones
  for (const controller of connections) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Connection is closed, remove it
      connections.delete(controller);
    }
  }
}

export { connections };
