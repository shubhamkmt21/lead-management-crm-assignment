import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { LeadStatus, UpdateLeadInput, Lead } from "@/lib/types";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leadId = parseInt(id, 10);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const body: UpdateLeadInput = await request.json();
    const { name, email, phone, company, status, notes } = body;

    // Check if lead exists
    const existing = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Validate fields if provided
    if (status && !isValidStatus(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (company !== undefined) updateData.company = company.trim();
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const updated = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId))
      .returning();

    return NextResponse.json(serializeLead(updated[0]));
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leadId = parseInt(id, 10);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await db.delete(leads).where(eq(leads.id, leadId));

    return NextResponse.json({ success: true, id: leadId });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
