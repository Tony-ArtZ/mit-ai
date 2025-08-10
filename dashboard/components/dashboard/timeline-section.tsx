"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  Users,
  MessageSquare,
  Brain,
  Clock,
  Eye,
  RotateCcw,
  XCircle,
  Database,
  ToolCase as Tool,
} from "lucide-react";
import { format } from "date-fns";
import type { DatabaseLogEntry } from "@/types/logger";

interface TimelineSectionProps {
  logs: DatabaseLogEntry[];
}

export default function TimelineSection({ logs }: TimelineSectionProps) {
  // Component state
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<[number, number] | null>(null); // Will be set to actual timestamps
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<
    string | null
  >(null);

  // Utility functions
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "agent_init":
        return <Users className="h-3 w-3" />;
      case "user_input":
        return <MessageSquare className="h-3 w-3" />;
      case "agent_action":
        return <Brain className="h-3 w-3" />;
      case "agent_response":
        return <MessageSquare className="h-3 w-3" />;
      case "tool_call":
        return <Tool className="h-3 w-3" />;
      case "retrieval":
        return <Database className="h-3 w-3" />;
      case "error":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
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

  // Process logs for timeline visualization
  const processedLogs = useMemo(() => {
    const validLogs = logs.filter((log) => log.timestamp);
    if (validLogs.length === 0)
      return {
        timelineLogs: [],
        filteredLogs: [],
        timeExtent: [0, 0],
        minTime: 0,
        maxTime: 0,
      };

    const timestamps = validLogs.map((log) => log.timestamp!.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeExtent = [minTime, maxTime];

    // Initialize timeRange to full extent if not set
    if (timeRange === null) {
      setTimeRange([minTime, maxTime]);
    }

    // Filter logs based on actual timestamp range
    const filtered = validLogs.filter((log) => {
      const matchesSession =
        sessionFilter === "all" || log.session_id === sessionFilter;
      const matchesAgent =
        agentFilter === "all" || log.agent_type === agentFilter;
      const matchesEventType =
        eventTypeFilter === "all" || log.event_type === eventTypeFilter;
      const matchesSearch =
        searchTerm === "" ||
        log.user_input?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.response?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.error?.toLowerCase().includes(searchTerm.toLowerCase());

      // Time range filter using actual timestamps
      const logTime = log.timestamp!.getTime();
      const inTimeRange =
        timeRange === null ||
        (logTime >= timeRange[0] && logTime <= timeRange[1]);

      return (
        matchesSession &&
        matchesAgent &&
        matchesEventType &&
        matchesSearch &&
        inTimeRange
      );
    });

    // Group by agent/session for timeline layers
    const timelineLogs = filtered.reduce((acc, log) => {
      const key = `${log.agent_type || "unknown"}-${log.session_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(log);
      return acc;
    }, {} as Record<string, DatabaseLogEntry[]>);

    return {
      timelineLogs,
      filteredLogs: filtered,
      timeExtent,
      minTime,
      maxTime,
    };
  }, [
    logs,
    sessionFilter,
    agentFilter,
    eventTypeFilter,
    searchTerm,
    timeRange,
  ]);

  const uniqueSessions = [...new Set(logs.map((log) => log.session_id))];
  const uniqueAgents = [
    ...new Set(logs.map((log) => log.agent_type).filter(Boolean)),
  ];
  const uniqueEventTypes = [...new Set(logs.map((log) => log.event_type))];

  // Simple event position calculation with padding
  const calculateEventPosition = (timestamp: Date) => {
    if (!timeRange || processedLogs.minTime === processedLogs.maxTime)
      return 50;

    const eventTime = timestamp.getTime();
    const [rangeStart, rangeEnd] = timeRange;
    const position = ((eventTime - rangeStart) / (rangeEnd - rangeStart)) * 100;

    // Add padding to prevent events from being cut off (5% padding on each side)
    return 5 + position * 0.9;
  };

  // Generate timeline ruler ticks with padding
  const generateTimeRulerTicks = () => {
    if (!timeRange) return [];

    const ticks = [];
    const tickCount = 10;
    const [rangeStart, rangeEnd] = timeRange;

    for (let i = 0; i <= tickCount; i++) {
      const progress = i / tickCount;
      const tickTime = rangeStart + (rangeEnd - rangeStart) * progress;
      // Apply same padding as events (5% padding on each side)
      const position = 5 + progress * 90;

      ticks.push({
        position,
        timestamp: new Date(tickTime),
        label: format(new Date(tickTime), "HH:mm:ss.SSS"),
      });
    }

    return ticks;
  };

  // Reset function
  const resetTimeRange = useCallback(() => {
    if (processedLogs.minTime && processedLogs.maxTime) {
      setTimeRange([processedLogs.minTime, processedLogs.maxTime]);
    }
  }, [processedLogs.minTime, processedLogs.maxTime]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return; // Only handle when no input is focused

      switch (e.key) {
        case "0":
          e.preventDefault();
          resetTimeRange();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [resetTimeRange]);
  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline View
              </CardTitle>
              <CardDescription>
                Interactive timeline of agent events across sessions. Press 0 to
                reset time range.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetTimeRange}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Session</label>
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {uniqueSessions.map((session) => (
                    <SelectItem key={session} value={session}>
                      {session.slice(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Agent</label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {uniqueAgents
                    .filter((agent) => agent !== null)
                    .map((agent) => (
                      <SelectItem key={agent} value={agent!}>
                        {agent}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Event Type
              </label>
              <Select
                value={eventTypeFilter}
                onValueChange={setEventTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEventTypes.map((eventType) => (
                    <SelectItem key={eventType} value={eventType}>
                      {eventType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search in messages, prompts, errors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Range Selection</label>
            <div className="px-4">
              {timeRange && processedLogs.minTime !== processedLogs.maxTime && (
                <>
                  <Slider
                    value={[
                      ((timeRange[0] - processedLogs.minTime) /
                        (processedLogs.maxTime - processedLogs.minTime)) *
                        100,
                      ((timeRange[1] - processedLogs.minTime) /
                        (processedLogs.maxTime - processedLogs.minTime)) *
                        100,
                    ]}
                    onValueChange={(value) => {
                      const [start, end] = value;
                      const duration =
                        processedLogs.maxTime - processedLogs.minTime;
                      setTimeRange([
                        processedLogs.minTime + (duration * start) / 100,
                        processedLogs.minTime + (duration * end) / 100,
                      ]);
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{format(new Date(timeRange[0]), "HH:mm:ss")}</span>
                    <span>{format(new Date(timeRange[1]), "HH:mm:ss")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Visual Timeline</CardTitle>
          <CardDescription>
            Interactive timeline of agent events across sessions. Use arrow keys
            to pan, +/- to zoom, 0 to reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden">
            {timeRange && (
              <>
                {/* Time ruler */}
                <div className="h-8 border-b border-border mb-4 relative bg-background">
                  {generateTimeRulerTicks().map((tick, i) => (
                    <div
                      key={i}
                      className="absolute top-0 border-l border-border"
                      style={{
                        left: `${tick.position}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                        {tick.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline tracks */}
                <div className="space-y-3">
                  {Object.entries(processedLogs.timelineLogs).map(
                    ([key, sessionLogs]) => {
                      const [agentType, sessionId] = key.split("-");
                      const agentColor = (() => {
                        switch (agentType) {
                          case "customer_service":
                            return "blue";
                          case "workflow_automation":
                            return "red";
                          case "data_analysis":
                            return "green";
                          case "content_generation":
                            return "purple";
                          default:
                            return "gray";
                        }
                      })();

                      return (
                        <div key={key} className="relative">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-3 h-3 rounded-full bg-${agentColor}-500`}
                            ></div>
                            <span className="text-sm font-medium">
                              {agentType} - {sessionId.slice(0, 8)}...
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {sessionLogs.length} events
                            </Badge>
                          </div>

                          <div className="relative h-12 bg-muted rounded border border-border overflow-hidden">
                            {sessionLogs
                              .filter((log) => {
                                const eventTime = log.timestamp!.getTime();
                                return (
                                  eventTime >= timeRange[0] &&
                                  eventTime <= timeRange[1]
                                );
                              })
                              .map((log) => {
                                const position = calculateEventPosition(
                                  log.timestamp!
                                );
                                const isSelected =
                                  selectedTimelineEvent === log.id.toString();

                                return (
                                  <div
                                    key={log.id}
                                    className={`absolute top-1 cursor-pointer transition-all hover:scale-110 z-10 ${
                                      isSelected ? "ring-2 ring-ring" : ""
                                    }`}
                                    style={{
                                      left: `${position}%`,
                                      transform: "translateX(-50%)",
                                    }}
                                    onClick={() => {
                                      setSelectedTimelineEvent(
                                        log.id.toString()
                                      );
                                    }}
                                    title={`${log.event_type} at ${format(
                                      log.timestamp!,
                                      "HH:mm:ss.SSS"
                                    )}`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded ${getEventColor(
                                        log.event_type
                                      )} flex items-center justify-center text-white shadow-sm border border-background`}
                                    >
                                      {getEventIcon(log.event_type)}
                                    </div>
                                    {log.error && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-background"></div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {processedLogs.filteredLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No events match the current filters
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Detailed list view of filtered events (
            {processedLogs.filteredLogs.length} events)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {processedLogs.filteredLogs
                .sort(
                  (a, b) =>
                    (a.timestamp?.getTime() || 0) -
                    (b.timestamp?.getTime() || 0)
                )
                .map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedTimelineEvent === log.id.toString()
                        ? "bg-accent border-accent-foreground/20"
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedTimelineEvent(log.id.toString());
                      // setSelectedLog(log); // Reserved for future detail panel
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded ${getEventColor(
                            log.event_type
                          )} flex items-center justify-center text-white`}
                        >
                          {getEventIcon(log.event_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.event_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              Session {log.session_id.slice(0, 8)}...
                            </span>
                            {log.agent_type && (
                              <Badge variant="secondary">
                                {log.agent_type}
                              </Badge>
                            )}
                            {log.sequence_number && (
                              <Badge variant="outline" className="text-xs">
                                #{log.sequence_number}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1 text-muted-foreground">
                            {log.user_input &&
                              `Input: ${log.user_input.substring(0, 100)}${
                                log.user_input.length > 100 ? "..." : ""
                              }`}
                            {log.response &&
                              `Response: ${log.response.substring(0, 100)}${
                                log.response.length > 100 ? "..." : ""
                              }`}
                            {log.tool_name && `Tool: ${log.tool_name}`}
                            {log.error &&
                              `Error: ${log.error.substring(0, 100)}${
                                log.error.length > 100 ? "..." : ""
                              }`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {log.timestamp
                            ? format(log.timestamp, "HH:mm:ss.SSS")
                            : "No timestamp"}
                        </div>
                        {log.elapsed_time && (
                          <div className="text-xs text-muted-foreground">
                            {log.elapsed_time.toFixed(2)}s
                          </div>
                        )}
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="sm" className="mt-1">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[600px] sm:w-[800px]">
                            <SheetHeader>
                              <SheetTitle>Event Details</SheetTitle>
                              <SheetDescription>
                                Complete information for this event
                              </SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 space-y-4 px-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">
                                    Event Type
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {log.event_type}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Timestamp
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {log.timestamp
                                      ? format(log.timestamp, "PPpp")
                                      : "No timestamp"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Session ID
                                  </label>
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {log.session_id}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Agent Type
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {log.agent_type || "Unknown"}
                                  </p>
                                </div>
                                {log.sequence_number && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      Sequence Number
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                      {log.sequence_number}
                                    </p>
                                  </div>
                                )}
                                {log.elapsed_time && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      Elapsed Time
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                      {log.elapsed_time.toFixed(3)}s
                                    </p>
                                  </div>
                                )}
                              </div>

                              {log.user_input && (
                                <div>
                                  <label className="text-sm font-medium">
                                    User Input
                                  </label>
                                  <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded border max-h-32 overflow-y-auto">
                                    {log.user_input}
                                  </div>
                                </div>
                              )}

                              {log.prompt && (
                                <div>
                                  <label className="text-sm font-medium">
                                    Prompt
                                  </label>
                                  <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded border max-h-32 overflow-y-auto">
                                    {log.prompt}
                                  </div>
                                </div>
                              )}

                              {log.response && (
                                <div>
                                  <label className="text-sm font-medium">
                                    Response
                                  </label>
                                  <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded border max-h-32 overflow-y-auto">
                                    {log.response}
                                  </div>
                                </div>
                              )}

                              {log.tool_name && (
                                <div>
                                  <label className="text-sm font-medium">
                                    Tool Used
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {log.tool_name}
                                  </p>
                                </div>
                              )}

                              {log.error && (
                                <div>
                                  <label className="text-sm font-medium">
                                    Error
                                  </label>
                                  <div className="text-sm text-destructive mt-1 p-3 bg-destructive/10 rounded border max-h-32 overflow-y-auto">
                                    {log.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
