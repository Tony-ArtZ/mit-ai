"use client";

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
import { AlertTriangle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import type { DatabaseLogEntry } from "@/types/logger";

interface ErrorsSectionProps {
  logs: DatabaseLogEntry[];
  setSelectedLog: (log: DatabaseLogEntry) => void;
}

export default function ErrorsSection({
  logs,
  setSelectedLog,
}: ErrorsSectionProps) {
  const errorLogs = logs.filter((log) => log.error);
  const affectedSessions = new Set(errorLogs.map((log) => log.session_id)).size;
  const errorRate =
    logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Error Analysis
          </CardTitle>
          <CardDescription>
            Track and analyze errors across all sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Error Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {errorLogs.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Errors
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {affectedSessions}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Affected Sessions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {errorRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Error Rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {errorLogs
                      .sort((a, b) => {
                        if (!a.timestamp || !b.timestamp) return 0;
                        return b.timestamp.getTime() - a.timestamp.getTime();
                      })
                      .slice(0, 50)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="border border-red-200 rounded-lg p-4 bg-red-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">
                                  {log.event_type}
                                </Badge>
                                <Badge variant="outline">
                                  Session {log.session_id.slice(0, 8)}...
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {log.timestamp
                                    ? format(log.timestamp, "MMM dd, HH:mm:ss")
                                    : "No timestamp"}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-red-800 mb-1">
                                {log.error}
                              </p>
                              {log.user_input && (
                                <p className="text-xs text-muted-foreground">
                                  Context: {log.user_input.substring(0, 100)}...
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
