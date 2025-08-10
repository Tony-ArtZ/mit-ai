"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, BarChart3, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import type {
  DatabaseLogEntry,
  SessionMetrics,
  EventTypeMetrics,
  AgentPerformanceMetrics,
} from "@/types/logger";

interface AnalyticsSectionProps {
  logs: DatabaseLogEntry[];
  sessionMetrics: SessionMetrics[];
  eventMetrics: EventTypeMetrics[];
  agentMetrics: AgentPerformanceMetrics[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function AnalyticsSection({
  logs,
  sessionMetrics,
  eventMetrics,
  agentMetrics,
}: AnalyticsSectionProps) {
  // Process data for charts
  const timelineData = logs
    .filter((log) => log.timestamp)
    .map((log) => ({
      timestamp: log.timestamp!,
      hour: format(log.timestamp!, "HH:00"),
      event_type: log.event_type,
      response_time: log.elapsed_time || 0,
    }))
    .reduce((acc, log) => {
      const existing = acc.find((item) => item.hour === log.hour);
      if (existing) {
        existing.events += 1;
        existing.total_response_time += log.response_time;
        existing.avg_response_time =
          existing.total_response_time / existing.events;
      } else {
        acc.push({
          hour: log.hour,
          events: 1,
          total_response_time: log.response_time,
          avg_response_time: log.response_time,
        });
      }
      return acc;
    }, [] as Array<{ hour: string; events: number; total_response_time: number; avg_response_time: number }>)
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // Tool usage analysis
  const toolUsageData = logs
    .filter((log) => log.tool_name)
    .reduce((acc, log) => {
      const existing = acc.find((item) => item.tool === log.tool_name);
      if (existing) {
        existing.count += 1;
        existing.total_time += log.elapsed_time || 0;
        existing.avg_time = existing.total_time / existing.count;
      } else {
        acc.push({
          tool: log.tool_name!,
          count: 1,
          total_time: log.elapsed_time || 0,
          avg_time: log.elapsed_time || 0,
        });
      }
      return acc;
    }, [] as Array<{ tool: string; count: number; total_time: number; avg_time: number }>)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Event type distribution
  const eventDistributionData = eventMetrics.map((metric) => ({
    event_type: metric.event_type,
    count: metric.count,
    percentage: ((metric.count / logs.length) * 100).toFixed(1),
  }));

  // Response time analysis
  const responseTimeData = logs
    .filter((log) => log.elapsed_time && log.event_type === "response")
    .map((log, index) => ({
      index: index + 1,
      response_time: log.elapsed_time!,
      session: log.session_id.slice(0, 8),
    }))
    .slice(0, 100);

  // Session duration analysis
  const sessionDurationData = sessionMetrics
    .filter((session) => session.duration)
    .map((session) => ({
      session_id: session.session_id.slice(0, 8),
      duration: session.duration!,
      events: session.total_events,
      agent_type: session.agent_type || "unknown",
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 20);

  // Agent performance comparison
  const agentComparisonData = agentMetrics.map((agent) => ({
    agent_type: agent.agent_type,
    success_rate: agent.success_rate,
    avg_tools: agent.avg_tools_used,
    avg_duration: agent.avg_session_duration,
    total_sessions: agent.total_sessions,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                logs
                  .filter((l) => l.elapsed_time)
                  .reduce((sum, l) => sum + (l.elapsed_time || 0), 0) /
                  logs.filter((l) => l.elapsed_time).length || 0
              ).toFixed(2)}
              s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tools Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                new Set(logs.filter((l) => l.tool_name).map((l) => l.tool_name))
                  .size
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => l.tool_name).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                timelineData.reduce(
                  (max, current) =>
                    current.events > max.events ? current : max,
                  timelineData[0] || { hour: "N/A", events: 0 }
                ).hour
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Events and response times by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tool Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Usage</CardTitle>
            <CardDescription>Most frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={toolUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="tool"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Event Distribution</CardTitle>
            <CardDescription>Breakdown of event types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ event_type, percentage }) =>
                    `${event_type} (${percentage}%)`
                  }
                >
                  {eventDistributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend</CardTitle>
            <CardDescription>
              Response times over recent interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="response_time"
                  stroke="#ff7300"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Duration Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Session Duration</CardTitle>
            <CardDescription>Duration vs number of events</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sessionDurationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="session_id"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="duration"
                  stroke="#00C49F"
                  fill="#00C49F"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>
              Success rate and tool usage by agent type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent_type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="success_rate"
                  fill="#8884d8"
                  name="Success Rate %"
                />
                <Bar dataKey="avg_tools" fill="#82ca9d" name="Avg Tools Used" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Type Metrics</CardTitle>
          <CardDescription>
            Detailed breakdown of performance by event type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eventMetrics.map((metric) => (
              <div
                key={metric.event_type}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-medium">{metric.event_type}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{metric.count}</div>
                    <div className="text-muted-foreground">Count</div>
                  </div>
                  {metric.avg_elapsed_time && (
                    <div className="text-center">
                      <div className="font-bold">
                        {metric.avg_elapsed_time.toFixed(2)}s
                      </div>
                      <div className="text-muted-foreground">Avg Time</div>
                    </div>
                  )}
                  {metric.error_rate !== undefined && (
                    <div className="text-center">
                      <div className="font-bold">
                        {metric.error_rate.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">Error Rate</div>
                    </div>
                  )}
                  <Badge variant="outline">
                    {format(metric.last_occurrence, "MMM dd")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
