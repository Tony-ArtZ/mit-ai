"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  BarChart3,
  Clock,
  Play,
  Users,
  AlertTriangle,
  Database,
  Shield,
} from "lucide-react";
import { ModeToggle } from "../light-mode-switch";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  errorCount: number;
  totalSessions: number;
  violationsCount?: number;
}

const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    description: "Dashboard overview",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: Clock,
    description: "Event timeline",
  },
  {
    id: "sessions",
    label: "Sessions",
    icon: Users,
    description: "Session management",
  },
  {
    id: "replay",
    label: "Replay",
    icon: Play,
    description: "Session replay",
  },
  {
    id: "compliance",
    label: "Compliance",
    icon: Shield,
    description: "Policy compliance",
  },
  {
    id: "errors",
    label: "Errors",
    icon: AlertTriangle,
    description: "Error tracking",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: Activity,
    description: "Performance analytics",
  },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  errorCount,
  totalSessions,
  violationsCount = 0,
}: SidebarProps) {
  return (
    <div className="w-64 border-r bg-card h-full">
      <div className="p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          AI Agents Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and analyze AI agent activities
        </p>
      </div>

      <div className="px-4 pb-4">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === "errors" && errorCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {errorCount}
                  </Badge>
                )}
                {item.id === "compliance" && violationsCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {violationsCount}
                  </Badge>
                )}
                {item.id === "sessions" && (
                  <Badge variant="outline" className="ml-2">
                    {totalSessions}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 border-t">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Last Updated</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Active</span>
            </div>
          </div>
        </div>
      </div>
      <div className=" mt-12 w-full flex justify-end px-4">
        <ModeToggle />
      </div>
    </div>
  );
}
