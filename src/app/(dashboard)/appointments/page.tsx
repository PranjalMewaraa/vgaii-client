"use client";

import { useEffect, useState } from "react";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type Appointment = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  date: string;
  source?: string;
  status?: string;
  notes?: string;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function AppointmentsPage() {
  return (
    <RoleGuard module="appointments">
      <AppointmentsPageInner />
    </RoleGuard>
  );
}

function AppointmentsPageInner() {
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    fetch("/api/appointments", { headers: authHeaders() })
      .then(res => res.json())
      .then(d => setData(d.appointments ?? []))
      .finally(() => setLoading(false));
  }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        setData(items =>
          items.map(a => (a._id === id ? { ...a, ...json.appointment } : a)),
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const startEditNotes = (a: Appointment) => {
    setEditingId(a._id);
    setNoteDraft(a.notes ?? "");
  };

  const saveNotes = async (id: string) => {
    await patch(id, { notes: noteDraft });
    setEditingId(null);
    setNoteDraft("");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <p className="text-sm text-slate-500">
          Manage scheduled visits — mark completed, no-shows, or add notes.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            All Appointments
          </h2>
          <span className="text-xs text-slate-500">
            {data.length} {data.length === 1 ? "appointment" : "appointments"}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : data.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No appointments scheduled.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.map(a => {
              const isEditing = editingId === a._id;
              const isScheduled =
                !a.status || a.status === "scheduled";

              return (
                <li key={a._id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {a.name || "Unnamed"}
                        </p>
                        <StatusPill status={a.status ?? "scheduled"} />
                      </div>
                      <p className="text-sm text-slate-600">
                        {[a.phone, a.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(a.date).toLocaleString()}
                        {a.source ? ` · ${a.source}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isScheduled && (
                        <>
                          <button
                            type="button"
                            onClick={() => patch(a._id, { status: "completed" })}
                            disabled={busyId === a._id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Mark completed
                          </button>
                          <button
                            type="button"
                            onClick={() => patch(a._id, { status: "no_show" })}
                            disabled={busyId === a._id}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            No show
                          </button>
                        </>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEditNotes(a)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          {a.notes ? "Edit note" : "Add note"}
                        </button>
                      )}
                      {a.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => patch(a._id, { status: "scheduled" })}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3">
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Post-visit notes…"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setNoteDraft("");
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveNotes(a._id)}
                          disabled={busyId === a._id}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          Save note
                        </button>
                      </div>
                    </div>
                  ) : (
                    a.notes && (
                      <p className="mt-2 text-sm text-slate-600">{a.notes}</p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
