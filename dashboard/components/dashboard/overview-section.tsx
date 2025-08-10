"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, AlertTriangle, CheckCircle } from "lucide-react";
import type {
  DatabaseLogEntry,
  SessionMetrics,
  EventTypeMetrics,
  AgentPerformanceMetrics,
} from "@/types/logger";

interface OverviewSectionProps {
  logs: DatabaseLogEntry[];
  sessionMetrics: SessionMetrics[];
  eventMetrics: EventTypeMetrics[];
  agentMetrics: AgentPerformanceMetrics[];
}

export default function OverviewSection({
  logs,
  sessionMetrics,
  eventMetrics,
  agentMetrics,
}: OverviewSectionProps) {
  const totalSessions = sessionMetrics.length;
  const totalEvents = logs.length;
  const errorCount = logs.filter((log) => log.error).length;
  const activeSessions = sessionMetrics.filter(
    (session) => session.status === "active"
  ).length;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {activeSessions} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {(totalEvents / totalSessions).toFixed(1)} avg per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((errorCount / totalEvents) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{errorCount} errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(((totalEvents - errorCount) / totalEvents) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalEvents - errorCount} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Performance metrics by agent type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentMetrics.map((agent) => (
                <div
                  key={agent.agent_type}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{agent.agent_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.total_sessions} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        agent.success_rate > 90 ? "default" : "secondary"
                      }
                    >
                      {agent.success_rate.toFixed(1)}% success
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {agent.avg_session_duration}s avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across all sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs
                .sort((a, b) => {
                  if (!a.timestamp || !b.timestamp) return 0;
                  return b.timestamp.getTime() - a.timestamp.getTime();
                })
                .slice(0, 5)
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-2 border-l-2 border-blue-200"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.event_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Session {log.session_id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleTimeString()
                          : "No timestamp"}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
