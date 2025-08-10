import db from "@/db";
import { logEntries } from "@/db/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const eventType = searchParams.get("event_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "100");

    const query = db.select().from(logEntries);
    const conditions = [];

    if (sessionId) {
      conditions.push(eq(logEntries.session_id, sessionId));
    }

    if (eventType) {
      conditions.push(eq(logEntries.event_type, eventType));
    }

    if (startDate) {
      conditions.push(gte(logEntries.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(logEntries.timestamp, new Date(endDate)));
    }

    // Apply conditions if any exist
    const finalQuery =
      conditions.length > 0 ? query.where(and(...conditions)) : query;

    const logs = await finalQuery
      .orderBy(desc(logEntries.timestamp))
      .limit(limit);

    return Response.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
