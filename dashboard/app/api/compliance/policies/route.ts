import { NextRequest, NextResponse } from "next/server";
import db from "@/db";
import { compliancePolicies } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newPolicy = await db
      .insert(compliancePolicies)
      .values({
        name: body.name,
        description: body.description,
        category: body.category,
        severity: body.severity,
        rule_config: body.rule_config,
        is_active: true,
      })
      .returning();

    return NextResponse.json(newPolicy[0]);
  } catch (error) {
    console.error("Failed to create policy:", error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}
