import db from "@/db";
import { logEntries } from "@/db/schema";
import { complianceChecker } from "@/lib/compliance-checker";
import { broadcastUpdate } from "@/lib/sse-utils";
import type { LogEntry } from "@/types/logger";

export async function GET() {
  return new Response("Method Not Allowed!", {
    status: 405,
  });
}

export async function POST(request: Request) {
  try {
    const logEntry: LogEntry = await request.json();

    console.log("Received log entry:", JSON.stringify(logEntry, null, 2));

    // Create a flexible entry object that can accommodate all log types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry: any = {
      session_id: logEntry.session_id,
      event_type: logEntry.event_type,
      call_id: logEntry.call_id,
      sequence_number: logEntry.sequence_number,
      timestamp: logEntry.timestamp ? new Date(logEntry.timestamp) : new Date(),
      elapsed_time: logEntry.elapsed_time,
    };

    // Extract additional fields based on the log entry content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logData = logEntry as any;

    // Map common fields that might exist
    if (logData.agent_type) entry.agent_type = logData.agent_type;
    if (logData.model) entry.model = logData.model;
    if (logData.prompt) entry.prompt = logData.prompt;
    if (logData.response) entry.response = logData.response;
    if (logData.input) entry.user_input = logData.input;
    if (logData.user_input) entry.user_input = logData.user_input;
    if (logData.tools_count) entry.tools_count = logData.tools_count;
    if (logData.max_iterations) entry.max_iterations = logData.max_iterations;
    if (logData.tool_name) entry.tool_name = logData.tool_name;
    if (logData.tool_input) entry.tool_input = logData.tool_input;
    if (logData.tool_output) entry.tool_output = logData.tool_output;
    if (logData.query) entry.query = logData.query;
    if (logData.documents_count)
      entry.documents_count = logData.documents_count;
    if (logData.documents) entry.documents = logData.documents;
    if (logData.retriever_type) entry.retriever_type = logData.retriever_type;
    if (logData.action) entry.action = logData.action;
    if (logData.reasoning) entry.reasoning = logData.reasoning;
    if (logData.observation) entry.observation = logData.observation;
    if (logData.error) entry.error = logData.error;
    if (logData.context) entry.error_context = logData.context;
    if (logData.parameters) entry.llm_parameters = logData.parameters;
    if (logData.usage) entry.llm_usage = logData.usage;
    if (logData.data) entry.custom_data = logData.data;

    // Insert into database
    const result = await db.insert(logEntries).values(entry).returning();

    console.log("Successfully inserted log entry with ID:", result[0].id);

    // Broadcast the new log entry to connected SSE clients
    broadcastUpdate("log_entry", {
      type: "new_log",
      data: result[0],
      session_id: logEntry.session_id,
      event_type: logEntry.event_type,
    });

    // Run compliance check asynchronously
    complianceChecker.checkLogEntry(logEntry).catch((error) => {
      console.error("Compliance check failed:", error);
    });

    return Response.json({
      received: true,
      session_id: logEntry.session_id,
    });
  } catch (error) {
    console.error("Error processing log entry:", error);

    return Response.json(
      {
        received: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
