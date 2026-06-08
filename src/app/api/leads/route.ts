import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq, ilike, or, desc, asc, count, and } from "drizzle-orm";
import type { LeadStatus, Lead } from "@/lib/types";

const VALID_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Converted",
  "Lost",
];

function isValidStatus(status: string): status is LeadStatus {
  return (VALID_STATUSES as string[]).includes(status);
}

function serializeLead(lead: any): Lead {
  return {
    ...lead,
    createdAt: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : lead.createdAt,
    updatedAt: lead.updatedAt instanceof Date ? lead.updatedAt.toISOString() : lead.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search")?.trim() || "";
  const statusFilter = searchParams.get("status") || "";
  const sortParam = searchParams.get("sort") || "createdAt-desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "10", 10)));

  // Build where conditions
  const conditions = [];

  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      or(
        ilike(leads.name, searchTerm),
        ilike(leads.email, searchTerm),
        ilike(leads.company, searchTerm)
      )
    );
  }

  if (statusFilter && isValidStatus(statusFilter)) {
    conditions.push(eq(leads.status, statusFilter as LeadStatus));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting
  let orderByClause;
  switch (sortParam) {
    case "createdAt-asc":
      orderByClause = asc(leads.createdAt);
      break;
    case "name-asc":
      orderByClause = asc(leads.name);
      break;
    case "name-desc":
      orderByClause = desc(leads.name);
      break;
    case "status-asc":
      orderByClause = asc(leads.status);
      break;
    case "status-desc":
      orderByClause = desc(leads.status);
      break;
    case "createdAt-desc":
    default:
      orderByClause = desc(leads.createdAt);
      break;
  }

  try {
    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(leads)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;

    // Get paginated leads
    const offset = (page - 1) * limit;
    const leadsData = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit) || 1;

    const serializedLeads = leadsData.map(serializeLead);

    return NextResponse.json({
      leads: serializedLeads,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, status, notes } = body;

    // Validation
    if (!name || !email || !phone || !company) {
      return NextResponse.json(
        { error: "Name, email, phone, and company are required" },
        { status: 400 }
      );
    }

    if (status && !isValidStatus(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const newLead = await db
      .insert(leads)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        company: company.trim(),
        status: status || "New",
        notes: notes?.trim() || null,
      })
      .returning();

    return NextResponse.json(serializeLead(newLead[0]), { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
