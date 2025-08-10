"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Users,
  MessageSquare,
  Brain,
  ToolCase as ToolIcon,
  Database,
  XCircle,
  Activity,
} from "lucide-react";
import type { DatabaseLogEntry } from "@/types/logger";

interface SessionsSectionProps {
  logs: DatabaseLogEntry[];
  uniqueSessions: string[];
  setSelectedLog: (log: DatabaseLogEntry) => void;
}

export default function SessionsSection({
  logs,
  uniqueSessions,
  setSelectedLog,
}: SessionsSectionProps) {
  const [selectedSessionForDetails, setSelectedSessionForDetails] =
    useState<string>("");

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "agent_init":
        return <Users className="h-4 w-4" />;
      case "user_input":
        return <MessageSquare className="h-4 w-4" />;
      case "agent_action":
        return <Brain className="h-4 w-4" />;
      case "agent_response":
        return <MessageSquare className="h-4 w-4" />;
      case "tool_call":
        return <ToolIcon className="h-4 w-4" />;
      case "retrieval":
        return <Database className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "agent_init":
        return "bg-blue-500";
      case "user_input":
        return "bg-green-500";
      case "agent_action":
        return "bg-purple-500";
      case "agent_response":
        return "bg-indigo-500";
      case "tool_call":
        return "bg-orange-500";
      case "retrieval":
        return "bg-cyan-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {selectedSessionForDetails ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedSessionForDetails("")}
            >
              ← Back to Sessions
            </Button>
            <h2 className="text-lg font-semibold">
              Session Details: {selectedSessionForDetails.slice(0, 8)}...
            </h2>
          </div>

          {/* Session Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Session Timeline</CardTitle>
              <CardDescription>
                Chronological view of all events in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {logs
                    .filter(
                      (log) => log.session_id === selectedSessionForDetails
                    )
                    .sort((a, b) => a.sequence_number - b.sequence_number)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getEventColor(
                              log.event_type
                            )}`}
                          >
                            {getEventIcon(log.event_type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{log.event_type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                #{log.sequence_number}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {log.timestamp
                                ? format(log.timestamp, "HH:mm:ss.SSS")
                                : "No timestamp"}
                            </span>
                          </div>

                          <div className="mt-2">
                            {log.user_input && (
                              <p className="text-sm">
                                <strong>Input:</strong> {log.user_input}
                              </p>
                            )}
                            {log.prompt && (
                              <p className="text-sm">
                                <strong>Prompt:</strong>{" "}
                                {log.prompt.substring(0, 100)}...
                              </p>
                            )}
                            {log.response && (
                              <p className="text-sm">
                                <strong>Response:</strong>{" "}
                                {log.response.substring(0, 100)}...
                              </p>
                            )}
                            {log.tool_name && (
                              <p className="text-sm">
                                <strong>Tool:</strong> {log.tool_name}
                              </p>
                            )}
                            {log.error && (
                              <p className="text-sm text-red-600">
                                <strong>Error:</strong> {log.error}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => setSelectedLog(log)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          {uniqueSessions.map((sessionId) => {
            const sessionLogs = logs.filter(
              (log) => log.session_id === sessionId
            );
            const validTimestamps = sessionLogs
              .map((log) => log.timestamp)
              .filter((ts): ts is Date => ts !== null);

            if (validTimestamps.length === 0) return null;

            const sessionStart = new Date(
              Math.min(...validTimestamps.map((ts) => ts.getTime()))
            );
            const sessionEnd = new Date(
              Math.max(...validTimestamps.map((ts) => ts.getTime()))
            );
            const duration = sessionEnd.getTime() - sessionStart.getTime();
            const agentType = sessionLogs.find(
              (log) => log.agent_type
            )?.agent_type;
            const hasErrors = sessionLogs.some((log) => log.error);

            return (
              <Card
                key={sessionId}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSessionForDetails(sessionId)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Session {sessionId.slice(0, 8)}...
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {hasErrors && <Badge variant="destructive">Errors</Badge>}
                      <Badge variant="outline">{agentType || "unknown"}</Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {sessionLogs.length} events • {(duration / 1000).toFixed(1)}
                    s duration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Started: {format(sessionStart, "HH:mm:ss")}</span>
                    <span>Ended: {format(sessionEnd, "HH:mm:ss")}</span>
                    <span>Events: {sessionLogs.length}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
