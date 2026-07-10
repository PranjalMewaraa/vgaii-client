"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Clock, Eye, Pencil, TrendingUp, UserPlus, Users } from "lucide-react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import AddLeadModal from "@/components/AddLeadModal";
import StatCard from "@/components/StatCard";
import Avatar from "@/components/Avatar";
import TopSourcesCard from "@/components/TopSourcesCard";
import { LEAD_STATUSES } from "@/lib/constants";

type DashboardData = {
  topSources?: Array<{ source: string; count: number }>;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  area?: string;
  source?: string;
  status?: string;
  outcomeRating?: number;
  createdAt?: string;
};

export default function LeadsPage() {
  return (
    <RoleGuard module="leads">
      <LeadsPageInner />
    </RoleGuard>
  );
}

function LeadsPageInner() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // 250ms debounce on the SWR key. SWR caches each search term separately,
  // so going back to a previous query is instant.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const swrKey = debouncedSearch
    ? `/api/leads?search=${encodeURIComponent(debouncedSearch)}`
    : "/api/leads";
  const { data, isLoading, mutate } = useSWR<{ leads: Lead[] }>(swrKey, {
    keepPreviousData: true,
  });
  const leads = useMemo(() => data?.leads ?? [], [data]);

  // Honor ?add=1 deep-link from the dashboard's Quick Actions.
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(() => searchParams.get("add") === "1");

  const sources = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach(l => l.source && seen.add(l.source));
    return Array.from(seen).sort();
  }, [leads]);

  // Re-use the dashboard endpoint so top-sources aggregation is computed
  // once across the whole client scope (qualified+ included). SWR caches
  // by URL so this is free when the user came from /dashboard.
  const { data: dashData } = useSWR<DashboardData>("/api/dashboard");
  const topSources = dashData?.topSources ?? [];

  // Stats over the leads currently in scope (default view excludes
  // qualified+ since those live under /patients).
  const stats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let todayCount = 0;
    let newCount = 0;
    let contactedCount = 0;
    for (const l of leads) {
      if (l.createdAt && new Date(l.createdAt).getTime() >= startOfToday.getTime()) {
        todayCount++;
      }
      if (l.status === "new") newCount++;
      else if (l.status === "contacted") contactedCount++;
    }
    return {
      total: leads.length,
      today: todayCount,
      newLeads: newCount,
      contacted: contactedCount,
    };
  }, [leads]);

  const visible = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (sourceFilter && l.source !== sourceFilter) return false;
      return true;
    });
  }, [leads, statusFilter, sourceFilter]);

  const clearFilters = () => {
    setStatusFilter("");
    setSourceFilter("");
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Early-funnel and dropped contacts. Once a lead is{" "}
            <code className="rounded bg-slate-100 px-1">qualified</code>, they
            move to the Patients tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          data-tour="leads-add-btn"
          className="rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f]"
        >
          + Add lead
        </button>
      </header>

      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          mutate();
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            title="Total Leads"
            value={stats.total}
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Today"
            value={stats.today}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="New"
            value={stats.newLeads}
            icon={UserPlus}
            color="sky"
          />
          <StatCard
            title="Contacted"
            value={stats.contacted}
            icon={Clock}
            color="amber"
          />
        </div>
        <div className="lg:col-span-1">
          <TopSourcesCard sources={topSources} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[180px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or phone…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.filter(
                s =>
                  s !== "qualified" &&
                  s !== "appointment_booked" &&
                  s !== "visited",
              ).map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Source
            </span>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="">All sources</option>
              {sources.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {(statusFilter || sourceFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs text-green-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">All Leads</h2>
          <span className="text-xs text-slate-500">
            {visible.length} of {leads.length}
          </span>
        </div>

        {isLoading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">
            No leads match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70">
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Created</th>
                  <th className="px-2 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.name} size="md" />
                        <span className="font-semibold text-slate-900">
                          {lead.name}
                          {typeof lead.outcomeRating === "number" && (
                            <span className="ml-2 text-xs font-medium text-amber-600">
                              ⭐ {lead.outcomeRating}/5
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lead.phone}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.source || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      className="px-2 py-3 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-green-600"
                          aria-label={`View ${lead.name}`}
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/leads/${lead.id}?edit=1`)}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-green-600"
                          aria-label={`Edit ${lead.name}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
