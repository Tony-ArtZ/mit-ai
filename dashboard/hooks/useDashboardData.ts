"use client";

import { useState, useCallback } from "react";
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

interface DashboardData {
  logs: DatabaseLogEntry[];
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

interface UseDashboardDataOptions {
  initialData: DashboardData;
}

export function useDashboardData({ initialData }: UseDashboardDataOptions) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Fetch fresh data from the API
      const response = await fetch("/api/dashboard-data", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const freshData: DashboardData = await response.json();
      setData(freshData);
      setLastUpdated(new Date());
      console.log("Dashboard data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const updateLogs = useCallback((newLog: DatabaseLogEntry) => {
    setData((prevData) => ({
      ...prevData,
      logs: [newLog, ...prevData.logs].slice(0, 1000), // Keep only latest 1000 logs
    }));
    setLastUpdated(new Date());
  }, []);

  const updateComplianceData = useCallback(() => {
    // Handle compliance updates - for now, trigger a full refresh
    refreshData();
  }, [refreshData]);

  return {
    data,
    isRefreshing,
    lastUpdated,
    refreshData,
    updateLogs,
    updateComplianceData,
  };
}
