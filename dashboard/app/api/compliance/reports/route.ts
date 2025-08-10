import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { auditReports, complianceViolations } from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";

export async function GET() {
  try {
    const reports = await db
      .select()
      .from(auditReports)
      .orderBy(desc(auditReports.created_at))
      .limit(50);

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch audit reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, report_type, date_range_start, date_range_end, filters } =
      body;

    // Get violations in the date range
    const violations = await db
      .select()
      .from(complianceViolations)
      .where(
        and(
          gte(complianceViolations.detected_at, new Date(date_range_start)),
          lte(complianceViolations.detected_at, new Date(date_range_end))
        )
      );

    // Calculate summary statistics
    const summary = {
      total_sessions: new Set(violations.map((v) => v.session_id)).size,
      total_violations: violations.length,
      violations_by_severity: violations.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      violations_by_category: {},
      resolution_rate:
        violations.length > 0
          ? (violations.filter((v) => v.resolved).length / violations.length) *
            100
          : 100,
      compliance_score: 0, // Calculate based on your scoring logic
    };

    const newReport = await db
      .insert(auditReports)
      .values({
        name,
        report_type,
        date_range_start: new Date(date_range_start),
        date_range_end: new Date(date_range_end),
        filters,
        summary,
        violations_count: violations.length,
        status: "generated",
        generated_by: "system", // You might want to get this from auth context
      })
      .returning();

    return NextResponse.json(newReport[0]);
  } catch (error) {
    console.error("Failed to create audit report:", error);
    return NextResponse.json(
      { error: "Failed to create audit report" },
      { status: 500 }
    );
  }
}
