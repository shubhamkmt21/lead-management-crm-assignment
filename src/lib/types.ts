export type LeadStatus = "New" | "Contacted" | "Qualified" | "Converted" | "Lost";

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  notes: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  status?: LeadStatus;
  notes?: string;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  notes?: string;
}