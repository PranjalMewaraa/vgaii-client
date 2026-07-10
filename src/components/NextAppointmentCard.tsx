"use client";

import Link from "next/link";
import useSWR from "swr";
import { Calendar } from "lucide-react";
import StatusPill from "@/components/StatusPill";

type Appointment = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  date: string;
  source?: string;
  status?: string;
};

type Response = {
  active: Appointment | null;
  next: Appointment | null;
  todayCount?: number;
};

// Reuse the same endpoint the Appointments page polls so the dashboard
// stays in sync without a second query.
export default function NextAppointmentCard() {
  const { data, isLoading } = useSWR<Response>("/api/appointments/now", {
    refreshInterval: 60_000,
  });

  const appointment = data?.active ?? data?.next ?? null;
  const label = data?.active ? "Active appointment" : "Next appointment";
  const todayCount = data?.todayCount ?? 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">{label}</h2>
          <p className="text-[11px] text-slate-500">
            {todayCount === 0
              ? "No appointments today"
              : `${todayCount} ${todayCount === 1 ? "appointment" : "appointments"} today`}
          </p>
        </div>
        <Link
          href="/appointments"
          className="text-xs font-medium text-green-600 hover:underline"
        >
          All appointments →
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-3 text-xs text-slate-500">Loading…</p>
      ) : !appointment ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-center text-xs text-slate-400">
          No upcoming appointments.
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 ring-1 ring-inset ring-green-100">
            <Calendar size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {appointment.name || "Unnamed"}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(appointment.date).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusPill status={appointment.status ?? "scheduled"} />
              {appointment.source && (
                <span className="text-[11px] text-slate-500">
                  via {appointment.source}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
