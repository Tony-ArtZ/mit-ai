import {
  pgTable,
  varchar,
  integer,
  timestamp,
  jsonb,
  real,
  boolean,
  text,
} from "drizzle-orm/pg-core";

// Compliance policies table
export const compliancePolicies = pgTable("compliance_policies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "data_privacy", "security", "regulatory"
  severity: varchar("severity", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  rule_config: jsonb("rule_config").notNull(), // JSON configuration for the rule
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Compliance violations table
export const complianceViolations = pgTable("compliance_violations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  session_id: varchar("session_id", { length: 255 }).notNull(),
  log_entry_id: integer("log_entry_id").references(() => logEntries.id),
  policy_id: integer("policy_id")
    .references(() => compliancePolicies.id)
    .notNull(),
  violation_type: varchar("violation_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  description: text("description").notNull(),
  context: jsonb("context"), // Additional context about the violation
  resolved: boolean("resolved").default(false).notNull(),
  resolved_by: varchar("resolved_by", { length: 255 }),
  resolved_at: timestamp("resolved_at"),
  resolution_notes: text("resolution_notes"),
  detected_at: timestamp("detected_at").defaultNow().notNull(),
});

// Audit reports table
export const auditReports = pgTable("audit_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  report_type: varchar("report_type", { length: 100 }).notNull(), // "compliance", "security", "performance"
  date_range_start: timestamp("date_range_start").notNull(),
  date_range_end: timestamp("date_range_end").notNull(),
  filters: jsonb("filters"), // JSON filters used to generate the report
  summary: jsonb("summary"), // Summary statistics
  violations_count: integer("violations_count").default(0),
  status: varchar("status", { length: 20 }).default("generated").notNull(), // "generated", "exported", "archived"
  generated_by: varchar("generated_by", { length: 255 }),
  file_path: varchar("file_path", { length: 500 }), // Path to exported file
  created_at: timestamp("created_at").defaultNow().notNull(),
});

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

export type CompliancePolicy = typeof compliancePolicies.$inferInsert;
export type SelectCompliancePolicy = typeof compliancePolicies.$inferSelect;

export type ComplianceViolation = typeof complianceViolations.$inferInsert;
export type SelectComplianceViolation =
  typeof complianceViolations.$inferSelect;

export type AuditReport = typeof auditReports.$inferInsert;
export type SelectAuditReport = typeof auditReports.$inferSelect;
