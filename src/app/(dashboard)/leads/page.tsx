"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";
import { LEAD_STATUSES } from "@/lib/constants";

type Lead = {
  _id: string;
  name: string;
  phone: string;
  area?: string;
  source?: string;
  status?: string;
  outcomeRating?: number;
  createdAt?: string;
};

const authHeaders = () => ({
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function LeadsPage() {
  return (
    <RoleGuard module="leads">
      <LeadsPageInner />
    </RoleGuard>
  );
}

function LeadsPageInner() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      const url = new URL("/api/leads", window.location.origin);
      if (search) url.searchParams.set("search", search);
      fetch(url.toString(), { headers: authHeaders() })
        .then(res => res.json())
        .then(data => setLeads(data.leads ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const sources = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach(l => l.source && seen.add(l.source));
    return Array.from(seen).sort();
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
        <p className="text-sm text-slate-500">
          Early-funnel and dropped contacts. Once a lead is{" "}
          <code className="rounded bg-slate-100 px-1">qualified</code>, they
          move to the Patients tab.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block flex-1 min-w-[220px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or phone…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
              className="ml-auto text-xs text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">All Leads</h2>
          <span className="text-xs text-slate-500">
            {visible.length} of {leads.length}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No leads match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Source</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(lead => (
                  <tr
                    key={lead._id}
                    onClick={() => router.push(`/leads/${lead._id}`)}
                    className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {lead.name}
                      {typeof lead.outcomeRating === "number" && (
                        <span className="ml-2 text-xs text-amber-600">
                          ⭐ {lead.outcomeRating}/5
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{lead.phone}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {lead.source || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={lead.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500">
                      {lead.createdAt
                        ? new Date(lead.createdAt).toLocaleDateString()
                        : "—"}
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
