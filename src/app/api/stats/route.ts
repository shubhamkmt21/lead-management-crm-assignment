import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import type { LeadStatus } from "@/lib/types";

const STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Converted",
  "Lost",
];

export async function GET() {
  try {
    // Total leads
    const totalResult = await db
      .select({ count: count() })
      .from(leads);
    const total = totalResult[0]?.count || 0;

    // Counts by status
    const statusCounts: Record<LeadStatus, number> = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Converted: 0,
      Lost: 0,
    };

    for (const status of STATUSES) {
      const res = await db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.status, status));
      statusCounts[status] = res[0]?.count || 0;
    }

    // Conversion rate: Converted / (total - Lost) * 100 or Converted / total
    const converted = statusCounts.Converted;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    // Qualified pipeline: New + Contacted + Qualified
    const pipeline = statusCounts.New + statusCounts.Contacted + statusCounts.Qualified;

    // Recent leads (last 7 days) - simple count using all since we don't have date filter easy in count
    // For simplicity, we can count recent by fetching but to keep light, skip or use a basic.
    // We'll just return recent as a computed in client if needed, but here provide total recent approx.
    // For bonus, we'll compute total recent in client, but return a few latest for quick view.

    return NextResponse.json({
      total,
      statusCounts,
      conversionRate,
      pipeline,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
