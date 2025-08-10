import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { auditReports, complianceViolations } from "@/db/schema";
import { eq, gte, lte, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    const report = await db
      .select()
      .from(auditReports)
      .where(eq(auditReports.id, reportId))
      .limit(1);

    if (report.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = report[0];

    // Get violations for this report's date range
    const violations = await db
      .select()
      .from(complianceViolations)
      .where(
        and(
          gte(complianceViolations.detected_at, reportData.date_range_start),
          lte(complianceViolations.detected_at, reportData.date_range_end)
        )
      );

    // Generate CSV content
    const csvHeader = [
      "Violation ID",
      "Session ID",
      "Type",
      "Severity",
      "Description",
      "Detected At",
      "Resolved",
      "Resolved By",
      "Resolved At",
    ].join(",");

    const csvRows = violations.map((v) =>
      [
        v.id,
        v.session_id,
        v.violation_type,
        v.severity,
        `"${v.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
        v.detected_at.toISOString(),
        v.resolved ? "Yes" : "No",
        v.resolved_by || "",
        v.resolved_at ? v.resolved_at.toISOString() : "",
      ].join(",")
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");

    // Update report status
    await db
      .update(auditReports)
      .set({ status: "exported" })
      .where(eq(auditReports.id, reportId));

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="compliance-report-${reportId}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
