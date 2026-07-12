"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import {
  LEAD_TRANSITIONS,
  canTransition,
  type LeadStatus,
} from "@/lib/constants";

export type BoardLead = {
  id: string;
  name: string;
  phone: string;
  source?: string;
  status?: string;
  outcomeRating?: number;
  createdAt?: string;
};

// Pipeline columns. Only statuses reachable through the manual transition
// matrix are shown as active drop targets; "Lost" is a read-only bucket for
// legacy data (leads can't be marked lost by hand).
const COLUMNS: { status: LeadStatus; label: string; dot: string }[] = [
  { status: "new", label: "New", dot: "bg-slate-400" },
  { status: "contacted", label: "Contacted", dot: "bg-amber-500" },
  { status: "qualified", label: "Qualified", dot: "bg-green-500" },
  { status: "lost", label: "Lost", dot: "bg-red-500" },
];

const isDraggable = (status?: string) =>
  !!status &&
  status in LEAD_TRANSITIONS &&
  LEAD_TRANSITIONS[status as LeadStatus].length > 0;

export default function LeadsBoard({
  leads,
  onMove,
}: {
  leads: BoardLead[];
  onMove: (id: string, status: LeadStatus) => void;
}) {
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<LeadStatus | null>(null);
  const [overCol, setOverCol] = useState<LeadStatus | null>(null);

  const canDropHere = (col: LeadStatus) =>
    dragFrom != null && dragFrom !== col && canTransition(dragFrom, col);

  const endDrag = () => {
    setDragId(null);
    setDragFrom(null);
    setOverCol(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map(col => {
        const items = leads.filter(l => (l.status ?? "new") === col.status);
        const highlight = overCol === col.status && canDropHere(col.status);
        return (
          <div
            key={col.status}
            onDragOver={e => {
              if (canDropHere(col.status)) {
                e.preventDefault();
                setOverCol(col.status);
              }
            }}
            onDragLeave={() =>
              setOverCol(o => (o === col.status ? null : o))
            }
            onDrop={e => {
              e.preventDefault();
              if (dragId && canDropHere(col.status)) onMove(dragId, col.status);
              endDrag();
            }}
            className={`flex flex-col rounded-xl border p-3 transition-colors ${
              highlight
                ? "border-green-400 bg-green-50/60 ring-2 ring-green-200"
                : "border-slate-200/70 bg-slate-50/40"
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-sm font-semibold text-slate-800">
                  {col.label}
                </span>
              </div>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200/70">
                {items.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {items.map(lead => {
                const draggable = isDraggable(lead.status);
                return (
                  <div
                    key={lead.id}
                    draggable={draggable}
                    onDragStart={e => {
                      setDragId(lead.id);
                      setDragFrom((lead.status ?? "new") as LeadStatus);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", lead.id);
                    }}
                    onDragEnd={endDrag}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className={`group rounded-lg border border-slate-200/70 bg-white p-3 transition-colors hover:border-slate-300 ${
                      draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${dragId === lead.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lead.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {lead.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {lead.phone}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      {lead.source ? (
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200/70">
                          {lead.source}
                        </span>
                      ) : (
                        <span />
                      )}
                      {typeof lead.outcomeRating === "number" && (
                        <span className="text-xs font-medium text-amber-600">
                          ⭐ {lead.outcomeRating}/5
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 px-2 py-6 text-center text-xs text-slate-400">
                  No leads
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
