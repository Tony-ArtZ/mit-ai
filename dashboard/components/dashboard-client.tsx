"use client";

import { useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";

import type {
  DatabaseLogEntry,
  SessionMetrics,
  EventTypeMetrics,
  AgentPerformanceMetrics,
  ComplianceViolation,
  CompliancePolicy,
  AuditReport,
  ComplianceMetrics,
} from "@/types/logger";

// Import modular components
import Sidebar from "./dashboard/sidebar";
import OverviewSection from "./dashboard/overview-section";
import TimelineSection from "./dashboard/timeline-section";
import SessionsSection from "./dashboard/sessions-section";
import ReplaySection from "./dashboard/replay-section";
import ErrorsSection from "./dashboard/errors-section";
import AnalyticsSection from "./dashboard/analytics-section";
import ComplianceSection from "./dashboard/compliance-section";

interface DashboardClientProps {
  initialLogs: DatabaseLogEntry[];
  sessionMetrics: SessionMetrics[];
  eventMetrics: EventTypeMetrics[];
  agentMetrics: AgentPerformanceMetrics[];
  complianceData?: {
    violations: ComplianceViolation[];
    policies: CompliancePolicy[];
    auditReports: AuditReport[];
    metrics: ComplianceMetrics;
  };
}

export default function DashboardClient({
  initialLogs,
  sessionMetrics,
  eventMetrics,
  agentMetrics,
  complianceData,
}: DashboardClientProps) {
  const [selectedLog, setSelectedLog] = useState<DatabaseLogEntry | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");

  // Initialize dashboard data management
  const { data, refreshData, updateLogs } = useDashboardData({
    initialData: {
      logs: initialLogs,
      sessionMetrics,
      eventMetrics,
      agentMetrics,
      complianceData,
    },
  });

  // Set up SSE connection for real-time updates
  useSSE({
    onLogEntry: (eventData) => {
      console.log("Received new log entry:", eventData);
      // If the event contains the full log entry, add it directly
      if (eventData.data && typeof eventData.data === "object") {
        updateLogs(eventData.data as DatabaseLogEntry);
      } else {
        // Otherwise, trigger a full refresh
        refreshData();
      }
    },
    onComplianceUpdate: () => {
      console.log("Received compliance update, refreshing data...");
      refreshData();
    },
    onConnect: () => {
      console.log("Connected to real-time updates");
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  const logs = data.logs;

  // Get unique sessions
  const uniqueSessions = [...new Set(logs.map((log) => log.session_id))];

  const errorCount = logs.filter((log) => log.error).length;
  const totalSessions = data.sessionMetrics.length;
  const violationsCount =
    data.complianceData?.violations.filter((v) => !v.resolved).length || 0;

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection
            logs={logs}
            sessionMetrics={data.sessionMetrics}
            eventMetrics={data.eventMetrics}
            agentMetrics={data.agentMetrics}
          />
        );
      case "timeline":
        return <TimelineSection logs={logs} />;
      case "sessions":
        return (
          <SessionsSection
            logs={logs}
            uniqueSessions={uniqueSessions}
            setSelectedLog={setSelectedLog}
          />
        );
      case "replay":
        return <ReplaySection logs={logs} uniqueSessions={uniqueSessions} />;
      case "compliance":
        return data.complianceData ? (
          <ComplianceSection
            violations={data.complianceData.violations || []}
            policies={data.complianceData.policies || []}
            auditReports={data.complianceData.auditReports || []}
            metrics={data.complianceData.metrics}
          />
        ) : (
          <div className="p-6">
            <h2 className="text-2xl font-bold">
              Compliance Data Not Available
            </h2>
            <p className="text-muted-foreground">
              Compliance data is currently not loaded.
            </p>
          </div>
        );
      case "errors":
        return <ErrorsSection logs={logs} setSelectedLog={setSelectedLog} />;
      case "analytics":
        return (
          <AnalyticsSection
            logs={logs}
            sessionMetrics={data.sessionMetrics}
            eventMetrics={data.eventMetrics}
            agentMetrics={data.agentMetrics}
          />
        );
      default:
        return (
          <OverviewSection
            logs={logs}
            sessionMetrics={data.sessionMetrics}
            eventMetrics={data.eventMetrics}
            agentMetrics={data.agentMetrics}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        errorCount={errorCount}
        totalSessions={totalSessions}
        violationsCount={violationsCount}
      />{" "}
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">{renderActiveSection()}</div>
      </div>
      {/* Log Details Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
            <SheetDescription>
              {selectedLog?.event_type} - #{selectedLog?.sequence_number}
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 px-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Session ID</label>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.session_id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Event Type</label>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.event_type}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Timestamp</label>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.timestamp
                    ? format(selectedLog.timestamp, "PPpp")
                    : "No timestamp"}
                </p>
              </div>
              {selectedLog.elapsed_time && (
                <div>
                  <label className="text-sm font-medium">Elapsed Time</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.elapsed_time}s
                  </p>
                </div>
              )}
              {selectedLog.user_input && (
                <div>
                  <label className="text-sm font-medium">User Input</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.user_input}
                  </p>
                </div>
              )}
              {selectedLog.prompt && (
                <div>
                  <label className="text-sm font-medium">Prompt</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedLog.prompt}
                  </p>
                </div>
              )}
              {selectedLog.response && (
                <div>
                  <label className="text-sm font-medium">Response</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedLog.response}
                  </p>
                </div>
              )}
              {selectedLog.tool_name && (
                <div>
                  <label className="text-sm font-medium">Tool Name</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.tool_name}
                  </p>
                </div>
              )}
              {selectedLog.tool_input != null && (
                <div>
                  <label className="text-sm font-medium">Tool Input</label>
                  <pre className="text-xs text-muted-foreground p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(
                      selectedLog.tool_input as Record<string, unknown>,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
              {selectedLog.tool_output != null && (
                <div>
                  <label className="text-sm font-medium">Tool Output</label>
                  <pre className="text-xs text-muted-foreground p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(
                      selectedLog.tool_output as Record<string, unknown>,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
              {selectedLog.error && (
                <div>
                  <label className="text-sm font-medium">Error</label>
                  <p className="text-sm text-red-600">{selectedLog.error}</p>
                </div>
              )}
              {selectedLog.llm_usage != null && (
                <div>
                  <label className="text-sm font-medium">LLM Usage</label>
                  <pre className="text-xs text-muted-foreground p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(
                      selectedLog.llm_usage as Record<string, unknown>,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
