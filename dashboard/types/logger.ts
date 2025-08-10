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
export function isAgentInitLogEntry(
  entry: LogEntry
): entry is AgentInitLogEntry {
  return entry.event_type === "agent_init";
}

export function isUserInputLogEntry(
  entry: LogEntry
): entry is UserInputLogEntry {
  return entry.event_type === "user_input";
}

export function isToolCallLogEntry(entry: LogEntry): entry is ToolCallLogEntry {
  return entry.event_type === "tool_call";
}

export function isErrorLogEntry(entry: LogEntry): entry is ErrorLogEntry {
  return entry.event_type === "error";
}

// Database-compatible log entry (what we get from SELECT queries)
export interface DatabaseLogEntry {
  id: number;
  session_id: string;
  event_type: string;
  call_id: string;
  sequence_number: number;
  timestamp: Date | null;
  elapsed_time: number | null;
  model: string | null;
  prompt: string | null;
  response: string | null;
  agent_type: string | null;
  user_input: string | null;
  tools_count: number | null;
  max_iterations: number | null;
  tool_name: string | null;
  tool_input: unknown;
  tool_output: unknown;
  query: string | null;
  documents_count: number | null;
  documents: unknown;
  retriever_type: string | null;
  action: string | null;
  reasoning: string | null;
  observation: string | null;
  error: string | null;
  error_context: unknown;
  llm_parameters: unknown;
  llm_usage: unknown;
  custom_data: unknown;
  created_at: Date;
}

// Dashboard-specific types
export interface SessionMetrics {
  session_id: string;
  start_time: Date | null;
  end_time: Date | null;
  duration?: number;
  total_events: number;
  agent_type?: string;
  error_count: number;
  tool_calls: number;
  user_interactions: number;
  llm_calls: number;
  status: "active" | "completed" | "error";
}

export interface EventTypeMetrics {
  event_type: string;
  count: number;
  avg_elapsed_time?: number;
  error_rate?: number;
  last_occurrence: Date;
}

export interface AgentPerformanceMetrics {
  agent_type: string;
  total_sessions: number;
  avg_session_duration: number;
  success_rate: number;
  avg_tools_used: number;
  avg_iterations: number;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface DashboardFilters {
  session_id?: string;
  agent_type?: string;
  event_type?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  error_only?: boolean;
}

export interface SessionReplayStep {
  sequence_number: number;
  event_type: string;
  timestamp: Date;
  data: LogEntry;
  duration?: number;
  status: "success" | "error" | "pending";
}

export interface CounterfactualExperiment {
  id: string;
  original_session_id: string;
  name: string;
  description: string;
  modified_parameters: Record<string, string | number | boolean>;
  status: "draft" | "running" | "completed" | "failed";
  created_at: Date;
  results?: {
    original_outcome: Record<string, unknown>;
    modified_outcome: Record<string, unknown>;
    differences: Record<string, string | number | boolean>;
  };
}

// Compliance-related types
export interface CompliancePolicy {
  id: number;
  name: string;
  description?: string;
  category: "data_privacy" | "security" | "regulatory" | "operational";
  severity: "low" | "medium" | "high" | "critical";
  rule_config: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ComplianceViolation {
  id: number;
  session_id: string;
  log_entry_id?: number;
  policy_id: number;
  violation_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  context?: Record<string, unknown>;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: Date;
  resolution_notes?: string;
  detected_at: Date;
  policy?: CompliancePolicy; // For joins
}

export interface AuditReport {
  id: number;
  name: string;
  report_type: "compliance" | "security" | "performance" | "full_audit";
  date_range_start: Date;
  date_range_end: Date;
  filters?: Record<string, unknown>;
  summary?: {
    total_sessions: number;
    total_violations: number;
    violations_by_severity: Record<string, number>;
    violations_by_category: Record<string, number>;
    resolution_rate: number;
    compliance_score: number;
  };
  violations_count: number;
  status: "generated" | "exported" | "archived";
  generated_by?: string;
  file_path?: string;
  created_at: Date;
}

export interface ComplianceMetrics {
  total_policies: number;
  active_policies: number;
  total_violations: number;
  unresolved_violations: number;
  violations_by_severity: Record<string, number>;
  violations_by_category: Record<string, number>;
  compliance_score: number;
  trend: "improving" | "declining" | "stable";
}

export interface PolicyRuleConfig {
  type: "pattern_match" | "data_detection" | "threshold" | "custom";
  parameters: Record<string, unknown>;
  conditions?: Array<{
    field: string;
    operator: "equals" | "contains" | "matches" | "gt" | "lt" | "gte" | "lte";
    value: string | number | boolean;
  }>;
}
