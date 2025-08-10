// Base interface that all log entries extend
export interface BaseLogEntry {
  session_id: string;
  event_type: string;
  call_id: string;
  sequence_number: number;
  timestamp?: string; // ISO 8601 format
  elapsed_time?: number; // seconds
}

// LLM usage statistics
interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: string | number | boolean | undefined;
}

// LLM parameters
interface LLMParameters {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  [key: string]: string | number | boolean | undefined;
}

// Document structure for retrieval operations
interface RetrievalDocument {
  content: string;
  metadata?: Record<string, string | number | boolean>;
  score?: number;
  source?: string;
}

// Error context object
interface ErrorContext {
  component?: string;
  agent_type?: string;
  user_input?: string;
  context?: string;
  [key: string]: string | number | boolean | undefined;
}

// Tool input/output can be various structured types
type ToolInput =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];
type ToolOutput =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null;

// Specific event types
interface AgentInitLogEntry extends BaseLogEntry {
  event_type: "agent_init";
  agent_type: "customer_service" | "workflow_automation";
  tools_count: number;
  model: string;
  max_iterations: number;
}

interface UserInputLogEntry extends BaseLogEntry {
  event_type: "user_input";
  input: string;
  agent_type: "customer_service" | "workflow_automation";
}

interface PromptLogEntry extends BaseLogEntry {
  event_type: "prompt";
  prompt: string;
  model?: string;
  parameters?: LLMParameters;
}

interface ResponseLogEntry extends BaseLogEntry {
  event_type: "response";
  response: string;
  model?: string;
  usage?: LLMUsage;
}

interface AgentResponseLogEntry extends BaseLogEntry {
  event_type: "agent_response";
  response: string;
  agent_type: "customer_service" | "workflow_automation";
  user_input: string;
}

interface ToolCallLogEntry extends BaseLogEntry {
  event_type: "tool_call";
  tool_name: string;
  tool_input: ToolInput;
  tool_output?: ToolOutput;
  error?: string;
}

interface AgentActionLogEntry extends BaseLogEntry {
  event_type: "agent_action";
  action: string;
  reasoning?: string;
  observation?: string;
}

interface RetrievalLogEntry extends BaseLogEntry {
  event_type: "retrieval";
  query: string;
  documents_count: number;
  documents: RetrievalDocument[];
  retriever_type?: string;
}

interface ErrorLogEntry extends BaseLogEntry {
  event_type: "error";
  error: string;
  context: ErrorContext;
}

// For custom log entries, we define a more structured approach
interface CustomLogEntry extends BaseLogEntry {
  event_type: Exclude<
    string,
    | "agent_init"
    | "user_input"
    | "prompt"
    | "response"
    | "agent_response"
    | "tool_call"
    | "agent_action"
    | "retrieval"
    | "error"
  >;
  data: Record<string, string | number | boolean | object | null>;
}

// Union type for all possible log entries
export type LogEntry =
  | AgentInitLogEntry
  | UserInputLogEntry
  | PromptLogEntry
  | ResponseLogEntry
  | AgentResponseLogEntry
  | ToolCallLogEntry
  | AgentActionLogEntry
  | RetrievalLogEntry
  | ErrorLogEntry
  | CustomLogEntry;

// API endpoint types
export interface LoggerPushRequest {
  body: LogEntry;
}

export interface LoggerPushResponse {
  received: boolean;
  session_id?: string;
  error?: string;
}

// Type guards for runtime type checking
function isAgentInitLogEntry(entry: LogEntry): entry is AgentInitLogEntry {
  return entry.event_type === "agent_init";
}

function isUserInputLogEntry(entry: LogEntry): entry is UserInputLogEntry {
  return entry.event_type === "user_input";
}

function isToolCallLogEntry(entry: LogEntry): entry is ToolCallLogEntry {
  return entry.event_type === "tool_call";
}

function isErrorLogEntry(entry: LogEntry): entry is ErrorLogEntry {
  return entry.event_type === "error";
}

// Example Express.js handler with proper typing
interface LoggerEndpointHandler {
  (
    req: { body: LogEntry },
    res: {
      status: (code: number) => { json: (data: LoggerPushResponse) => void };
      json: (data: LoggerPushResponse) => void;
    }
  ): void;
}
