"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import RoleGuard from "@/components/RoleGuard";

type Lead = {
  _id: string;
  name: string;
  phone: string;
  area?: string;
  source?: string;
  status?: string;
  statusUpdatedAt?: string;
  outcomeRating?: number;
  createdAt?: string;
};

type Appointment = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  age?: number;
  date?: string;
  source?: string;
};

type Feedback = {
  _id: string;
  rating?: number;
  reviewText?: string;
  remark?: string;
  status?: string;
  submittedAt?: string;
  createdAt?: string;
};

type DetailResponse =
  | {
      kind: "lead";
      lead: Lead;
      appointments: Appointment[];
      feedbacks: Feedback[];
    }
  | { kind: "direct"; appointment: Appointment }
  | { error: string };

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <RoleGuard module="patients">
      <PatientDetailPageInner params={params} />
    </RoleGuard>
  );
}

function PatientDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<DetailResponse | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(setData);
  }, [id]);

  if (!data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if ("error" in data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {data.error}
      </p>
    );
  }

  if (data.kind === "direct") {
    const a = data.appointment;
    return (
      <div className="space-y-6">
        <Link
          href="/patients"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to patients
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {a.name || "Unnamed"}
            </h1>
            <StatusPill status="direct" />
          </div>
          <p className="text-sm text-slate-600">{a.phone || a.email}</p>
          <p className="mt-4 text-sm text-slate-500">
            Booked direct via {a.source || "external"} — no matching lead.
          </p>
          {a.date && (
            <p className="mt-2 font-medium text-slate-800">
              {new Date(a.date).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const { lead, appointments, feedbacks } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to patients
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <StatusPill status={lead.status} />
            </div>
            <p className="text-sm text-slate-600">{lead.phone}</p>
            {lead.area && <p className="text-sm text-slate-500">{lead.area}</p>}
          </div>
          <div className="text-right text-xs text-slate-500">
            {lead.source && <p>Source: {lead.source}</p>}
            {lead.createdAt && (
              <p>Captured {new Date(lead.createdAt).toLocaleDateString()}</p>
            )}
            {typeof lead.outcomeRating === "number" && (
              <p className="text-amber-600">
                Outcome: ⭐ {lead.outcomeRating}/5
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Appointments
          </h2>
        </div>
        {appointments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No appointments linked.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {appointments.map(a => (
              <li
                key={a._id}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {a.date ? new Date(a.date).toLocaleString() : "No date"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[a.gender, a.age ? `${a.age}y` : null, a.source]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Feedback</h2>
        </div>
        {feedbacks.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No feedback submitted yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {feedbacks.map(f => (
              <li key={f._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {typeof f.rating === "number" ? `⭐ ${f.rating}/5` : "—"}
                    </p>
                    <StatusPill status={f.status} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {f.submittedAt
                      ? new Date(f.submittedAt).toLocaleString()
                      : f.createdAt
                        ? new Date(f.createdAt).toLocaleString()
                        : ""}
                  </span>
                </div>
                {f.reviewText && (
                  <p className="mt-1 text-sm text-slate-700">{f.reviewText}</p>
                )}
                {f.remark && (
                  <p className="mt-1 text-xs text-slate-500">Note: {f.remark}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
