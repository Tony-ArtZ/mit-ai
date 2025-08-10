import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { complianceViolations, compliancePolicies } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { ComplianceMetrics } from "@/types/logger";

export async function GET() {
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
        policy_name: compliancePolicies.name,
        policy_category: compliancePolicies.category,
      })
      .from(complianceViolations)
      .leftJoin(
        compliancePolicies,
        eq(complianceViolations.policy_id, compliancePolicies.id)
      )
      .orderBy(desc(complianceViolations.detected_at))
      .limit(100);

    // Get all active policies
    const policies = await db
      .select()
      .from(compliancePolicies)
      .where(eq(compliancePolicies.is_active, true))
      .orderBy(desc(compliancePolicies.created_at));

    // Calculate metrics
    const totalViolations = violations.length;
    const unresolvedViolations = violations.filter((v) => !v.resolved).length;

    const violationsBySeverity = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violationsByCategory = violations.reduce((acc, v) => {
      const category = v.policy_category || "unknown";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate compliance score (example formula)
    const resolutionRate =
      totalViolations > 0
        ? (totalViolations - unresolvedViolations) / totalViolations
        : 1;
    const severityWeight = violations.reduce((weight, v) => {
      switch (v.severity) {
        case "critical":
          return weight + 4;
        case "high":
          return weight + 3;
        case "medium":
          return weight + 2;
        case "low":
          return weight + 1;
        default:
          return weight + 1;
      }
    }, 0);

    const maxPossibleWeight = totalViolations * 4; // Assuming all critical
    const severityScore =
      maxPossibleWeight > 0 ? 1 - severityWeight / maxPossibleWeight : 1;
    const complianceScore = Math.round(
      (resolutionRate * 0.6 + severityScore * 0.4) * 100
    );

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

    console.log("Compliance API returning:", {
      violations: violations.length,
      policies: policies.length,
      metrics,
    });

    return NextResponse.json({
      violations,
      policies,
      auditReports: [], // Empty for now since we don't have any reports yet
      metrics,
    });
  } catch (error) {
    console.error("Failed to fetch compliance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance data" },
      { status: 500 }
    );
  }
}

// Create new violation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newViolation = await db
      .insert(complianceViolations)
      .values({
        session_id: body.session_id,
        log_entry_id: body.log_entry_id,
        policy_id: body.policy_id,
        violation_type: body.violation_type,
        severity: body.severity,
        description: body.description,
        context: body.context,
      })
      .returning();

    return NextResponse.json(newViolation[0]);
  } catch (error) {
    console.error("Failed to create violation:", error);
    return NextResponse.json(
      { error: "Failed to create violation" },
      { status: 500 }
    );
  }
}
