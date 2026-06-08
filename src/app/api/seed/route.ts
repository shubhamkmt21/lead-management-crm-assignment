import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads } from "@/db/schema";
import type { LeadStatus } from "@/lib/types";

const SAMPLE_LEADS = [
  {
    name: "Alice Johnson",
    email: "alice.johnson@techcorp.com",
    phone: "(555) 123-4567",
    company: "TechCorp Inc.",
    status: "New" as LeadStatus,
    notes: "Interested in our enterprise software solution. Referred by a colleague.",
  },
  {
    name: "Bob Smith",
    email: "bob.smith@innovate.io",
    phone: "(555) 234-5678",
    company: "Innovate Labs",
    status: "Contacted" as LeadStatus,
    notes: "Had an initial call. Sent proposal last week. Follow up scheduled for Friday.",
  },
  {
    name: "Carol Williams",
    email: "carol.w@startupx.com",
    phone: "(555) 345-6789",
    company: "StartupX",
    status: "Qualified" as LeadStatus,
    notes: "Very interested in the product. Budget approved. Meeting next Tuesday.",
  },
  {
    name: "David Brown",
    email: "david.brown@globalenterprises.com",
    phone: "(555) 456-7890",
    company: "Global Enterprises",
    status: "Converted" as LeadStatus,
    notes: "Signed the contract yesterday! Onboarding scheduled for next month.",
  },
  {
    name: "Emma Davis",
    email: "emma.davis@smallbiz.co",
    phone: "(555) 567-8901",
    company: "SmallBiz Co.",
    status: "Lost" as LeadStatus,
    notes: "Decided to go with competitor due to pricing. Keep in touch for future.",
  },
  {
    name: "Frank Miller",
    email: "frank.m@retailplus.net",
    phone: "(555) 678-9012",
    company: "RetailPlus",
    status: "New" as LeadStatus,
    notes: "Saw our ad on LinkedIn. Requested a demo for their sales team.",
  },
  {
    name: "Grace Lee",
    email: "grace.lee@healthfirst.org",
    phone: "(555) 789-0123",
    company: "HealthFirst Clinic",
    status: "Contacted" as LeadStatus,
    notes: "Follow-up email sent. Waiting on decision from their procurement dept.",
  },
  {
    name: "Henry Wilson",
    email: "henry.w@fintechpro.com",
    phone: "(555) 890-1234",
    company: "FinTech Pro",
    status: "Qualified" as LeadStatus,
    notes: "Strong fit. Needs integration discussion with their IT team.",
  },
];

export async function POST() {
  try {
    // Clear existing leads for demo reset (optional, good for assignment)
    await db.delete(leads);

    const inserted = await db
      .insert(leads)
      .values(
        SAMPLE_LEADS.map((lead) => ({
          ...lead,
          notes: lead.notes,
        }))
      )
      .returning();

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted.length} sample leads`,
      count: inserted.length,
    });
  } catch (error) {
    console.error("Error seeding leads:", error);
    return NextResponse.json(
      { error: "Failed to seed leads" },
      { status: 500 }
    );
  }
}
