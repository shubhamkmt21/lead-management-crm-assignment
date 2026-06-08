"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  TrendingUp,
  X,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import type { Lead, LeadStatus, LeadsResponse } from "@/lib/types";

const STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Converted",
  "Lost",
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "status-New",
  Contacted: "status-Contacted",
  Qualified: "status-Qualified",
  Converted: "status-Converted",
  Lost: "status-Lost",
};

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest First" },
  { value: "createdAt-asc", label: "Oldest First" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "status-asc", label: "Status A-Z" },
  { value: "status-desc", label: "Status Z-A" },
];

interface Stats {
  total: number;
  statusCounts: Record<LeadStatus, number>;
  conversionRate: number;
  pipeline: number;
}

interface ModalState {
  isOpen: boolean;
  mode: "add" | "edit";
  lead: Lead | null;
}

export default function LeadCRM() {
  // Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    statusCounts: { New: 0, Contacted: 0, Qualified: 0, Converted: 0, Lost: 0 },
    conversionRate: 0,
    pipeline: 0,
  });
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modal
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: "add",
    lead: null,
  });

  // Form state for modal
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "New" as LeadStatus,
    notes: "",
  });

  const limit = 10;

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data: Stats = await res.json();
      setStats(data);
    } catch (error) {
      console.error(error);
      // Keep default stats
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Leads with filters/pagination
  const fetchLeads = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortBy,
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");

      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotalLeads(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error("Fetch leads error:", error);
      toast.error("Failed to load leads");
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, sortBy]);

  // Initial load + refetch when filters change
  useEffect(() => {
    fetchStats();
    fetchLeads(1);
  }, [fetchStats, fetchLeads]);

  // Refetch leads when search, filter, sort, or page changes
  const refetchLeads = (page: number = currentPage) => {
    fetchLeads(page);
  };

  // Handle search with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchLeads(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter, sortBy, fetchLeads]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "New",
      notes: "",
    });
    setModal({ isOpen: true, mode: "add", lead: null });
  };

  // Open Edit Modal
  const openEditModal = (lead: Lead) => {
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      notes: lead.notes || "",
    });
    setModal({ isOpen: true, mode: "edit", lead });
  };

  const closeModal = () => {
    setModal({ isOpen: false, mode: "add", lead: null });
    // Reset form
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      status: "New",
      notes: "",
    });
  };

  // Handle form input
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Create or Update Lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.company.trim()) {
      toast.error("Please fill out all required fields");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      if (modal.mode === "add") {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            status: formData.status,
            notes: formData.notes,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create lead");
        }

        toast.success("Lead created successfully");
      } else if (modal.lead) {
        const res = await fetch(`/api/leads/${modal.lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            status: formData.status,
            notes: formData.notes,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update lead");
        }

        toast.success("Lead updated successfully");
      }

      closeModal();
      // Refresh data
      await Promise.all([fetchStats(), fetchLeads(currentPage)]);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status (quick action from table)
  const updateLeadStatus = async (leadId: number, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }

      toast.success(`Status updated to ${newStatus}`);

      // Optimistic update on current page
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );

      // Refresh stats + refetch full leads for consistency
      await Promise.all([fetchStats(), fetchLeads(currentPage)]);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
      // Refetch on error to restore correct data
      fetchLeads(currentPage);
    }
  };

  // Delete Lead
  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Delete lead for ${lead.name}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      toast.success("Lead deleted");

      // If last item on page and not page 1, go to previous page
      const isLastOnPage = leads.length === 1 && currentPage > 1;
      const nextPage = isLastOnPage ? currentPage - 1 : currentPage;

      await Promise.all([fetchStats(), fetchLeads(nextPage)]);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
    }
  };

  // Seed sample data
  const seedSampleData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error("Failed to seed data");

      const result = await res.json();
      toast.success(result.message || "Sample leads loaded!");

      // Reset filters and load fresh
      setSearchTerm("");
      setStatusFilter("");
      setSortBy("createdAt-desc");
      setCurrentPage(1);

      await Promise.all([fetchStats(), fetchLeads(1)]);
    } catch (error) {
      toast.error("Failed to load sample data");
    } finally {
      setIsSeeding(false);
    }
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchLeads(page);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setSortBy("createdAt-desc");
    setCurrentPage(1);
  };

  // Format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status count for display
  const getStatusCount = (status: LeadStatus) => stats.statusCounts[status] || 0;

  // Render page numbers for pagination
  const renderPagination = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((p, idx) =>
      typeof p === "string" ? (
        <span key={idx} className="px-2 text-slate-400">…</span>
      ) : (
        <button
          key={idx}
          onClick={() => goToPage(p)}
          className={`pagination-btn ${p === currentPage ? "active" : "bg-white border border-slate-200 text-slate-700"}`}
          aria-current={p === currentPage ? "page" : undefined}
        >
          {p}
        </button>
      )
    );
  };

  const hasActiveFilters = searchTerm || statusFilter || sortBy !== "createdAt-desc";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-xl tracking-tight">LeadCRM</div>
              <div className="text-[10px] text-slate-500 -mt-1">Small Business CRM</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={seedSampleData}
              disabled={isSeeding}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? "animate-spin" : ""}`} />
              {isSeeding ? "Loading Samples..." : "Load Sample Data"}
            </button>
            <button
              onClick={openAddModal}
              className="btn btn-primary text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Lead
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tighter text-slate-950">
              Lead Management Dashboard
            </h1>
            <p className="text-slate-600 mt-1 text-[15px]">
              Track, manage, and convert your customer leads
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Total Leads</div>
            <div className="text-3xl font-semibold text-slate-900 tabular-nums">{stats.total}</div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-9">
          {/* Total */}
          <div className="stat-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">TOTAL LEADS</div>
                <div className="mt-2 text-4xl font-semibold tabular-nums text-slate-950">{stats.total}</div>
              </div>
              <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center">
                <Users className="w-5.5 h-5.5 text-white" />
              </div>
            </div>
          </div>

          {/* By Status */}
          {STATUSES.map((status) => {
            const count = getStatusCount(status);
            return (
              <div
                key={status}
                onClick={() => {
                  setStatusFilter(status === statusFilter ? "" : status);
                  setCurrentPage(1);
                }}
                className="stat-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`status-badge ${STATUS_COLORS[status]} mb-1.5`}>{status}</div>
                    <div className="text-4xl font-semibold tabular-nums text-slate-950">{count}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">LEADS</div>
                    {stats.total > 0 && (
                      <div className="text-xs font-medium text-slate-400 mt-1">
                        {Math.round((count / stats.total) * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion & Pipeline Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="uppercase tracking-[1px] text-emerald-700 text-xs font-semibold">CONVERSION RATE</div>
              <div className="text-4xl font-semibold text-slate-950 tabular-nums mt-0.5">
                {stats.conversionRate}
                <span className="text-2xl font-normal text-slate-400">%</span>
              </div>
              <div className="text-sm text-slate-600 mt-0.5">Leads converted to customers</div>
            </div>
            <div className="ml-auto text-right text-xs text-emerald-600 font-medium">
              {stats.statusCounts.Converted} converted
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Filter className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="uppercase tracking-[1px] text-blue-700 text-xs font-semibold">ACTIVE PIPELINE</div>
              <div className="text-4xl font-semibold text-slate-950 tabular-nums mt-0.5">{stats.pipeline}</div>
              <div className="text-sm text-slate-600 mt-0.5">New • Contacted • Qualified</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs uppercase tracking-widest text-blue-600 font-medium">IN PROGRESS</div>
              <div className="text-sm text-blue-700 font-medium mt-1">
                {stats.total > 0 ? Math.round((stats.pipeline / stats.total) * 100) : 0}% of total
              </div>
            </div>
          </div>
        </div>

        {/* Leads Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-2xl tracking-tight">All Leads</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {totalLeads} total lead{totalLeads !== 1 ? "s" : ""} • Showing page {currentPage} of {totalPages}
              </p>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input search-input pl-10 w-full text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as LeadStatus | "");
                  setCurrentPage(1);
                }}
                className="input filter-select text-sm w-full sm:w-[168px]"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="input filter-select text-sm w-full sm:w-[168px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn btn-secondary text-sm px-4 whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}

              {/* Add Button (mobile friendly) */}
              <button
                onClick={openAddModal}
                className="btn btn-primary lg:hidden flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="leads-table w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="text-left pl-6 font-medium">Name</th>
                  <th className="text-left font-medium">Email</th>
                  <th className="text-left font-medium">Phone</th>
                  <th className="text-left font-medium">Company</th>
                  <th className="text-left font-medium w-40">Status</th>
                  <th className="text-left font-medium">Notes</th>
                  <th className="text-left font-medium">Created</th>
                  <th className="text-right pr-6 w-24 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  // Loading Skeletons
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="pl-6 py-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                      <td><div className="h-4 bg-slate-200 rounded w-44" /></td>
                      <td><div className="h-4 bg-slate-200 rounded w-24" /></td>
                      <td><div className="h-4 bg-slate-200 rounded w-28" /></td>
                      <td><div className="h-6 bg-slate-200 rounded-full w-20" /></td>
                      <td><div className="h-4 bg-slate-200 rounded w-40" /></td>
                      <td><div className="h-4 bg-slate-200 rounded w-20" /></td>
                      <td className="pr-6"><div className="h-8 bg-slate-200 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : leads.length > 0 ? (
                  leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="pl-6 font-medium text-slate-900">{lead.name}</td>
                      <td className="text-slate-600 font-mono text-xs">{lead.email}</td>
                      <td className="text-slate-600 tabular-nums">{lead.phone}</td>
                      <td className="font-medium text-slate-700">{lead.company}</td>

                      {/* Status with Quick Update */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`status-badge ${STATUS_COLORS[lead.status]}`}>
                            {lead.status}
                          </span>
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                            className="quick-status border border-slate-200 bg-white text-slate-600 text-xs focus:outline-none focus:border-blue-300"
                            aria-label={`Change status for ${lead.name}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td>
                        <div className="notes-cell" title={lead.notes || ""}>
                          {lead.notes || <span className="text-slate-400 italic">—</span>}
                        </div>
                      </td>

                      <td className="text-slate-500 text-xs tabular-nums whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </td>

                      <td className="pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="btn-icon text-slate-500 hover:text-blue-600"
                            title="Edit lead"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteLead(lead)}
                            className="btn-icon text-slate-500 hover:text-red-600"
                            title="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-16">
                      <div className="empty-state">
                        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                          <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="font-semibold text-lg text-slate-700">No leads found</div>
                        <p className="text-slate-500 mt-1 max-w-xs mx-auto">
                          {hasActiveFilters
                            ? "Try adjusting your search or filters."
                            : "Get started by adding your first lead or loading sample data."}
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                          <button onClick={openAddModal} className="btn btn-primary text-sm">
                            <Plus className="w-4 h-4" /> Add Lead
                          </button>
                          {!hasActiveFilters && (
                            <button onClick={seedSampleData} className="btn btn-secondary text-sm" disabled={isSeeding}>
                              Load Sample Data
                            </button>
                          )}
                          {hasActiveFilters && (
                            <button onClick={clearFilters} className="btn btn-secondary text-sm">
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70">
              <div className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{(currentPage - 1) * limit + 1}</span>–
                <span className="font-medium text-slate-700">{Math.min(currentPage * limit, totalLeads)}</span> of{" "}
                <span className="font-medium text-slate-700">{totalLeads}</span> leads
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                <div className="flex items-center gap-1 px-1">{renderPagination()}</div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 flex justify-center">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Built with Next.js + PostgreSQL + Drizzle</span>
            <span className="w-px h-3 bg-slate-300" />
            <button onClick={() => window.location.reload()} className="hover:text-slate-500 underline">Refresh page</button>
          </div>
        </div>
      </div>

      {/* Add / Edit Lead Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div
            className="modal bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-xl tracking-tight">
                  {modal.mode === "add" ? "Add New Lead" : "Edit Lead"}
                </h3>
                <p className="text-sm text-slate-500">
                  {modal.mode === "add" ? "Enter customer details below" : "Update lead information"}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLead} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Jane Cooper"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Company *</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Acme Corp"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="jane@acme.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Lead Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="input textarea"
                  placeholder="Any relevant details about this lead..."
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary flex-1"
                >
                  {isSubmitting
                    ? "Saving..."
                    : modal.mode === "add"
                    ? "Create Lead"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
