"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  status?: string;
  outcomeRating?: number;
  lastAppointmentDate?: string | null;
  appointmentsCount: number;
  hasFeedback: boolean;
  source?: string;
};

export default function PatientsPage() {
  return (
    <RoleGuard module="patients">
      <PatientsPageInner />
    </RoleGuard>
  );
}

function PatientsPageInner() {
  const router = useRouter();
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/patients", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => setRows(data.patients ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
        <p className="text-sm text-slate-500">
          Leads who have booked an appointment.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">All Patients</h2>
          <span className="text-xs text-slate-500">
            {rows.length} {rows.length === 1 ? "patient" : "patients"}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No patients yet — leads will appear here once an appointment is
            booked.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Feedback</th>
                  <th className="px-6 py-3 text-right">Last appointment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const clickable = p.kind === "lead";
                  return (
                    <tr
                      key={`${p.kind}-${p.id}`}
                      onClick={
                        clickable
                          ? () => router.push(`/patients/${p.id}`)
                          : undefined
                      }
                      className={`border-t border-slate-200 ${
                        clickable
                          ? "cursor-pointer hover:bg-slate-50"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {p.name}
                        {typeof p.outcomeRating === "number" && (
                          <span className="ml-2 text-xs text-amber-600">
                            ⭐ {p.outcomeRating}/5
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{p.phone}</td>
                      <td className="px-6 py-4">
                        <StatusPill
                          status={p.kind === "direct" ? "direct" : p.status}
                        />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {p.hasFeedback ? (
                          <span className="text-emerald-600">✓ submitted</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500">
                        {p.lastAppointmentDate
                          ? new Date(p.lastAppointmentDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
