import { Suspense } from "react";
import DashboardClient from "@/components/dashboard-client";
import db from "@/db";
import {
  logEntries,
  complianceViolations,
  compliancePolicies,
  auditReports,
} from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import type {
  SessionMetrics,
  EventTypeMetrics,
  AgentPerformanceMetrics,
  ComplianceMetrics,
} from "@/types/logger";

// Server-side data fetching functions
async function getRecentLogs() {
  return await db
    .select()
    .from(logEntries)
    .orderBy(desc(logEntries.timestamp))
    .limit(1000);
}

async function getComplianceData() {
  try {
    // Get violations with policy information
    const violations = await db
      .select({
        id: complianceViolations.id,
        session_id: complianceViolations.session_id,
        log_entry_id: complianceViolations.log_entry_id,
        policy_id: complianceViolations.policy_id,
        violation_type: complianceViolations.violation_type,
        severity: complianceViolations.severity,
        description: complianceViolations.description,
        context: complianceViolations.context,
        resolved: complianceViolations.resolved,
        resolved_by: complianceViolations.resolved_by,
        resolved_at: complianceViolations.resolved_at,
        resolution_notes: complianceViolations.resolution_notes,
        detected_at: complianceViolations.detected_at,
      })
      .from(complianceViolations)
      .orderBy(desc(complianceViolations.detected_at))
      .limit(100);

    // Get all policies
    const policies = await db
      .select()
      .from(compliancePolicies)
      .orderBy(desc(compliancePolicies.created_at));

    // Get recent audit reports
    const reports = await db
      .select()
      .from(auditReports)
      .orderBy(desc(auditReports.created_at))
      .limit(20);

    // Calculate metrics
    const totalViolations = violations.length;
    const unresolvedViolations = violations.filter((v) => !v.resolved).length;

    const violationsBySeverity = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violationsByCategory = {}; // Would need to join with policies for this

    // Simple compliance score calculation
    const resolutionRate =
      totalViolations > 0
        ? (totalViolations - unresolvedViolations) / totalViolations
        : 1;
    const complianceScore = Math.round(resolutionRate * 100);

    const metrics: ComplianceMetrics = {
      total_policies: policies.length,
      active_policies: policies.filter((p) => p.is_active).length,
      total_violations: totalViolations,
      unresolved_violations: unresolvedViolations,
      violations_by_severity: violationsBySeverity,
      violations_by_category: violationsByCategory,
      compliance_score: complianceScore,
      trend:
        complianceScore >= 85
          ? "improving"
          : complianceScore >= 70
          ? "stable"
          : "declining",
    };

    return {
      violations: violations.map((v) => ({
        ...v,
        severity: v.severity as "low" | "medium" | "high" | "critical",
        log_entry_id: v.log_entry_id ?? undefined,
        resolved_by: v.resolved_by ?? undefined,
        resolved_at: v.resolved_at ?? undefined,
        resolution_notes: v.resolution_notes ?? undefined,
        context: (v.context as Record<string, unknown>) ?? undefined,
      })),
      policies: policies.map((p) => ({
        ...p,
        description: p.description ?? undefined,
        category: p.category as
          | "data_privacy"
          | "security"
          | "regulatory"
          | "operational",
        severity: p.severity as "low" | "medium" | "high" | "critical",
        rule_config: p.rule_config as Record<string, unknown>,
      })),
      auditReports: reports.map((r) => ({
        ...r,
        filters: (r.filters as Record<string, unknown>) ?? undefined,
        summary:
          (r.summary as {
            total_sessions: number;
            total_violations: number;
            violations_by_severity: Record<string, number>;
            violations_by_category: Record<string, number>;
            resolution_rate: number;
            compliance_score: number;
          }) ?? undefined,
        violations_count: r.violations_count ?? 0,
        generated_by: r.generated_by ?? undefined,
        file_path: r.file_path ?? undefined,
        report_type: r.report_type as
          | "compliance"
          | "security"
          | "performance"
          | "full_audit",
        status: r.status as "generated" | "exported" | "archived",
      })),
      metrics,
    };
  } catch (error) {
    console.error("Failed to fetch compliance data:", error);
    return {
      violations: [],
      policies: [],
      auditReports: [],
      metrics: {
        total_policies: 0,
        active_policies: 0,
        total_violations: 0,
        unresolved_violations: 0,
        violations_by_severity: {},
        violations_by_category: {},
        compliance_score: 100,
        trend: "stable" as const,
      },
    };
  }
}

async function getSessionMetrics(): Promise<SessionMetrics[]> {
  const sessions = await db
    .select({
      session_id: logEntries.session_id,
      agent_type: logEntries.agent_type,
      start_time: sql<Date>`MIN(${logEntries.timestamp})`,
      end_time: sql<Date>`MAX(${logEntries.timestamp})`,
      total_events: sql<number>`COUNT(*)`,
      error_count: sql<number>`COUNT(CASE WHEN ${logEntries.event_type} = 'error' THEN 1 END)`,
      tool_calls: sql<number>`COUNT(CASE WHEN ${logEntries.event_type} = 'tool_call' THEN 1 END)`,
      user_interactions: sql<number>`COUNT(CASE WHEN ${logEntries.event_type} = 'user_input' THEN 1 END)`,
      llm_calls: sql<number>`COUNT(CASE WHEN ${logEntries.event_type} IN ('prompt', 'response') THEN 1 END)`,
    })
    .from(logEntries)
    .groupBy(logEntries.session_id, logEntries.agent_type)
    .orderBy(desc(sql`MAX(${logEntries.timestamp})`))
    .limit(50);

  return sessions.map((session) => {
    // Ensure timestamps are Date objects
    const startTime = session.start_time ? new Date(session.start_time) : null;
    const endTime = session.end_time ? new Date(session.end_time) : null;

    return {
      session_id: session.session_id,
      start_time: startTime,
      end_time: endTime,
      duration:
        endTime && startTime
          ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
          : undefined,
      total_events: session.total_events,
      agent_type: session.agent_type || undefined,
      error_count: session.error_count,
      tool_calls: session.tool_calls,
      user_interactions: session.user_interactions,
      llm_calls: session.llm_calls,
      status:
        session.error_count > 0 ? ("error" as const) : ("completed" as const),
    };
  });
}

async function getEventTypeMetrics(): Promise<EventTypeMetrics[]> {
  const metrics = await db
    .select({
      event_type: logEntries.event_type,
      count: sql<number>`COUNT(*)`,
      avg_elapsed_time: sql<number>`AVG(${logEntries.elapsed_time})`,
      error_rate: sql<number>`COUNT(CASE WHEN ${logEntries.error} IS NOT NULL THEN 1 END)::float / COUNT(*) * 100`,
      last_occurrence: sql<Date>`MAX(${logEntries.timestamp})`,
    })
    .from(logEntries)
    .groupBy(logEntries.event_type)
    .orderBy(desc(sql`COUNT(*)`));

  return metrics.map((metric) => ({
    event_type: metric.event_type,
    count: metric.count,
    avg_elapsed_time: metric.avg_elapsed_time || undefined,
    error_rate: metric.error_rate || undefined,
    last_occurrence: new Date(metric.last_occurrence),
  }));
}

async function getAgentPerformanceMetrics(): Promise<
  AgentPerformanceMetrics[]
> {
  const metrics = await db
    .select({
      agent_type: logEntries.agent_type,
      total_sessions: sql<number>`COUNT(DISTINCT ${logEntries.session_id})`,
      success_rate: sql<number>`(COUNT(DISTINCT ${logEntries.session_id}) - COUNT(DISTINCT CASE WHEN ${logEntries.event_type} = 'error' THEN ${logEntries.session_id} END))::float / COUNT(DISTINCT ${logEntries.session_id}) * 100`,
      avg_tools_used: sql<number>`AVG(${logEntries.tools_count})`,
      avg_iterations: sql<number>`AVG(${logEntries.max_iterations})`,
      max_timestamp: sql<Date>`MAX(${logEntries.timestamp})`,
      min_timestamp: sql<Date>`MIN(${logEntries.timestamp})`,
    })
    .from(logEntries)
    .where(sql`${logEntries.agent_type} IS NOT NULL`)
    .groupBy(logEntries.agent_type);

  return metrics.map((metric) => {
    // Calculate duration in seconds on the JavaScript side
    const maxTime = metric.max_timestamp
      ? new Date(metric.max_timestamp)
      : null;
    const minTime = metric.min_timestamp
      ? new Date(metric.min_timestamp)
      : null;

    const avgSessionDuration =
      maxTime && minTime
        ? Math.round((maxTime.getTime() - minTime.getTime()) / 1000)
        : 0;

    return {
      agent_type: metric.agent_type!,
      total_sessions: metric.total_sessions,
      avg_session_duration: avgSessionDuration,
      success_rate: Math.round((metric.success_rate || 0) * 100) / 100,
      avg_tools_used: Math.round((metric.avg_tools_used || 0) * 100) / 100,
      avg_iterations: Math.round((metric.avg_iterations || 0) * 100) / 100,
    };
  });
}

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [logs, sessionMetrics, eventMetrics, agentMetrics, complianceData] =
    await Promise.all([
      getRecentLogs(),
      getSessionMetrics(),
      getEventTypeMetrics(),
      getAgentPerformanceMetrics(),
      getComplianceData(),
    ]);

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            Loading...
          </div>
        }
      >
        <DashboardClient
          initialLogs={logs}
          sessionMetrics={sessionMetrics}
          eventMetrics={eventMetrics}
          agentMetrics={agentMetrics}
          complianceData={complianceData}
        />
      </Suspense>
    </div>
  );
}
