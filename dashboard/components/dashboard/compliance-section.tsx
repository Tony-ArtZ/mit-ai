"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  Plus,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { format } from "date-fns";

import type {
  DatabaseLogEntry,
  ComplianceViolation,
  CompliancePolicy,
  AuditReport,
  ComplianceMetrics,
} from "@/types/logger";

interface ComplianceSectionProps {
  violations?: ComplianceViolation[];
  policies?: CompliancePolicy[];
  auditReports?: AuditReport[];
  metrics: ComplianceMetrics;
}

export default function ComplianceSection({
  violations = [],
  policies = [],
  auditReports = [],
  metrics,
}: ComplianceSectionProps) {
  const [selectedViolation, setSelectedViolation] =
    useState<ComplianceViolation | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterResolved, setFilterResolved] = useState<string>("all");
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);

  // Form state for report generation
  const [reportForm, setReportForm] = useState({
    name: "",
    reportType: "",
    startDate: "",
    endDate: "",
  });

  // Form state for policy creation
  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    category: "",
    severity: "",
  });

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Filter violations based on selected filters
  const filteredViolations = useMemo(() => {
    return violations.filter((violation) => {
      if (filterSeverity !== "all" && violation.severity !== filterSeverity) {
        return false;
      }
      if (filterResolved === "resolved" && !violation.resolved) {
        return false;
      }
      if (filterResolved === "unresolved" && violation.resolved) {
        return false;
      }
      return true;
    });
  }, [violations, filterSeverity, filterResolved]);

  const getSeverityColor = (
    severity: string
  ): "destructive" | "default" | "secondary" | "outline" => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getComplianceScoreIcon = () => {
    if (metrics.compliance_score >= 90)
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (metrics.compliance_score >= 70)
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const getTrendIcon = () => {
    switch (metrics.trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleExportReport = async (reportId: number) => {
    try {
      const response = await fetch(`/api/compliance/export/${reportId}`, {
        method: "GET",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compliance-report-${reportId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export report");
      }
    } catch (error) {
      console.error("Failed to export report:", error);
      alert("Failed to export report");
    }
  };

  const handleGenerateReport = async () => {
    console.log("Form data:", reportForm);

    if (
      !reportForm.name ||
      !reportForm.reportType ||
      !reportForm.startDate ||
      !reportForm.endDate
    ) {
      console.log("Missing fields:", {
        name: !reportForm.name,
        reportType: !reportForm.reportType,
        startDate: !reportForm.startDate,
        endDate: !reportForm.endDate,
      });
      alert("Please fill in all fields");
      return;
    }

    setIsGeneratingReport(true);
    try {
      console.log("Sending request to create report...");
      const response = await fetch("/api/compliance/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportForm.name,
          report_type: reportForm.reportType,
          date_range_start: reportForm.startDate,
          date_range_end: reportForm.endDate,
        }),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Report created:", result);
        setShowNewReportDialog(false);
        setReportForm({ name: "", reportType: "", startDate: "", endDate: "" });
        // Instead of full page refresh, we could update local state
        // For now, let's keep the refresh but make it more obvious
        alert(
          `Report "${result.name}" generated successfully! The page will refresh to show the new report.`
        );
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        alert(
          "Failed to generate report. Please check the console for details."
        );
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert(
        "Failed to generate report: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };
  const handleCreatePolicy = async () => {
    if (!policyForm.name || !policyForm.category || !policyForm.severity) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const response = await fetch("/api/compliance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: policyForm.name,
          description: policyForm.description,
          category: policyForm.category,
          severity: policyForm.severity,
          rule_config: {
            type: "custom",
            parameters: {},
          },
        }),
      });

      if (response.ok) {
        alert("Policy created successfully!");
        setShowNewPolicyDialog(false);
        setPolicyForm({
          name: "",
          description: "",
          category: "",
          severity: "",
        });
        window.location.reload();
      } else {
        alert("Failed to create policy");
      }
    } catch (error) {
      console.error("Failed to create policy:", error);
      alert("Failed to create policy");
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor policy violations and maintain audit compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={showNewReportDialog}
            onOpenChange={setShowNewReportDialog}
          >
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Audit Report</DialogTitle>
                <DialogDescription>
                  Create a new compliance audit report for specified date range
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Report name"
                  value={reportForm.name}
                  onChange={(e) =>
                    setReportForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Select
                  value={reportForm.reportType}
                  onValueChange={(value) =>
                    setReportForm((prev) => ({ ...prev, reportType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliance">
                      Compliance Report
                    </SelectItem>
                    <SelectItem value="security">Security Report</SelectItem>
                    <SelectItem value="performance">
                      Performance Report
                    </SelectItem>
                    <SelectItem value="full_audit">
                      Full Audit Report
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={reportForm.startDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={reportForm.endDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="w-full"
                >
                  {isGeneratingReport ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showNewPolicyDialog}
            onOpenChange={setShowNewPolicyDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Policy</DialogTitle>
                <DialogDescription>
                  Define a new compliance policy to monitor violations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Policy name"
                  value={policyForm.name}
                  onChange={(e) =>
                    setPolicyForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Description"
                  value={policyForm.description}
                  onChange={(e) =>
                    setPolicyForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
                <Select
                  value={policyForm.category}
                  onValueChange={(value) =>
                    setPolicyForm((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_privacy">Data Privacy</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={policyForm.severity}
                  onValueChange={(value) =>
                    setPolicyForm((prev) => ({ ...prev, severity: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreatePolicy} className="w-full">
                  Create Policy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Score
            </CardTitle>
            {getComplianceScoreIcon()}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.compliance_score}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon()}
              <span className="ml-1 capitalize">{metrics.trend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Policies
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_policies}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_policies - metrics.active_policies} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Violations
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_violations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.unresolved_violations} unresolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolution Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                ((metrics.total_violations - metrics.unresolved_violations) /
                  Math.max(metrics.total_violations, 1)) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_violations - metrics.unresolved_violations}{" "}
              resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="reports">Audit Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select
                  value={filterSeverity}
                  onValueChange={setFilterSeverity}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterResolved}
                  onValueChange={setFilterResolved}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Violations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Violations</CardTitle>
              <CardDescription>
                Showing {filteredViolations.length} of {violations.length}{" "}
                violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViolations && filteredViolations.length > 0 ? (
                    filteredViolations.map((violation) => (
                      <TableRow
                        key={violation.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedViolation(violation)}
                      >
                        <TableCell>
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {violation.violation_type}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {violation.session_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {violation.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              violation.resolved ? "outline" : "destructive"
                            }
                          >
                            {violation.resolved ? "Resolved" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(violation.detected_at, "MMM dd, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No violations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Policies</CardTitle>
              <CardDescription>
                Manage and configure compliance policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies && policies.length > 0 ? (
                    policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">
                          {policy.name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {policy.category.replace("_", " ")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(policy.severity)}>
                            {policy.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={policy.is_active ? "outline" : "secondary"}
                          >
                            {policy.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(policy.created_at, "MMM dd, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No policies found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Reports</CardTitle>
              <CardDescription>
                Generated compliance and audit reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditReports && auditReports.length > 0 ? (
                    auditReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.name}
                        </TableCell>
                        <TableCell className="capitalize">
                          {report.report_type.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(report.date_range_start, "MMM dd")} -{" "}
                          {format(report.date_range_end, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{report.violations_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportReport(report.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No audit reports available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Violation Details Dialog */}
      {selectedViolation && (
        <Dialog
          open={!!selectedViolation}
          onOpenChange={() => setSelectedViolation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Violation Details</DialogTitle>
              <DialogDescription>
                {selectedViolation.violation_type} -{" "}
                {selectedViolation.severity} severity
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session ID</label>
                <p className="text-sm text-muted-foreground font-mono">
                  {selectedViolation.session_id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">
                  {selectedViolation.description}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Detected At</label>
                <p className="text-sm text-muted-foreground">
                  {format(selectedViolation.detected_at, "PPpp")}
                </p>
              </div>
              {selectedViolation.context && (
                <div>
                  <label className="text-sm font-medium">Context</label>
                  <pre className="text-xs text-muted-foreground p-2 bg-muted rounded overflow-auto">
                    {JSON.stringify(selectedViolation.context, null, 2)}
                  </pre>
                </div>
              )}
              {selectedViolation.resolved && (
                <div>
                  <label className="text-sm font-medium">Resolution</label>
                  <p className="text-sm text-muted-foreground">
                    Resolved by {selectedViolation.resolved_by} on{" "}
                    {selectedViolation.resolved_at
                      ? format(selectedViolation.resolved_at, "PPpp")
                      : "Unknown"}
                  </p>
                  {selectedViolation.resolution_notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedViolation.resolution_notes}
                    </p>
                  )}
                </div>
              )}
              {!selectedViolation.resolved && (
                <Button className="w-full">Mark as Resolved</Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
