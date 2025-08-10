import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

export const logEntries = pgTable("log_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  session_id: varchar("session_id", { length: 255 }).notNull(),
  event_type: varchar("event_type", { length: 100 }).notNull(),
  call_id: varchar("call_id", { length: 255 }).notNull(),
  sequence_number: integer("sequence_number").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  elapsed_time: real("elapsed_time"),

  // LLM related fields
  model: varchar("model", { length: 100 }),
  prompt: varchar("prompt"),
  response: varchar("response"),

  // Agent related fields
  agent_type: varchar("agent_type", { length: 50 }),
  user_input: varchar("user_input"),
  tools_count: integer("tools_count"),
  max_iterations: integer("max_iterations"),

  // Tool related fields
  tool_name: varchar("tool_name", { length: 100 }),
  tool_input: jsonb("tool_input"),
  tool_output: jsonb("tool_output"),

  // Retrieval related fields
  query: varchar("query"),
  documents_count: integer("documents_count"),
  documents: jsonb("documents"),
  retriever_type: varchar("retriever_type", { length: 100 }),

  // Action related fields
  action: varchar("action"),
  reasoning: varchar("reasoning"),
  observation: varchar("observation"),

  // Error related fields
  error: varchar("error"),
  error_context: jsonb("error_context"),

  // LLM parameters and usage (stored as JSON for flexibility)
  llm_parameters: jsonb("llm_parameters"),
  llm_usage: jsonb("llm_usage"),

  // Custom data for flexible log entries
  custom_data: jsonb("custom_data"),

  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type LogEntry = typeof logEntries.$inferInsert;
export type SelectLogEntry = typeof logEntries.$inferSelect;
