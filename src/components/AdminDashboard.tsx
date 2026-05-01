"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";

type Analytics = {
  clients: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    profilesEnabled: number;
  };
  users: { total: number; admins: number; staff: number };
  leads: {
    total: number;
    today: number;
    thisWeek: number;
    visited: number;
    lost: number;
  };
  appointments: { upcoming: number; completed: number };
  feedback: { open: number; resolved: number };
};

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Could not load analytics"));
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Platform overview
          </h1>
          <p className="text-sm text-slate-500">
            Aggregate health across every client on the platform.
          </p>
        </div>
        <Link
          href="/admin/clients"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Manage clients →
        </Link>
      </header>

      <Section title="Clients">
        <Grid cols={4}>
          <StatCard title="Total" value={data.clients.total} />
          <StatCard
            title="Active"
            value={data.clients.active}
            color="green"
          />
          <StatCard title="Trial" value={data.clients.trial} />
          <StatCard
            title="Expired"
            value={data.clients.expired}
            color="red"
          />
        </Grid>
        <p className="mt-3 text-xs text-slate-500">
          {data.clients.profilesEnabled} client
          {data.clients.profilesEnabled === 1 ? " has" : "s have"} a public
          profile published.
        </p>
      </Section>

      <Section title="Users">
        <Grid cols={3}>
          <StatCard title="Total" value={data.users.total} />
          <StatCard title="Client admins" value={data.users.admins} />
          <StatCard title="Staff" value={data.users.staff} />
        </Grid>
      </Section>

      <Section title="Leads">
        <Grid cols={5}>
          <StatCard title="All time" value={data.leads.total} />
          <StatCard title="Today" value={data.leads.today} />
          <StatCard title="This week" value={data.leads.thisWeek} />
          <StatCard
            title="Visited"
            value={data.leads.visited}
            color="green"
          />
          <StatCard title="Lost" value={data.leads.lost} color="red" />
        </Grid>
      </Section>

      <Section title="Appointments & feedback">
        <Grid cols={4}>
          <StatCard
            title="Upcoming appts"
            value={data.appointments.upcoming}
          />
          <StatCard
            title="Completed appts"
            value={data.appointments.completed}
            color="green"
          />
          <StatCard
            title="Open feedback"
            value={data.feedback.open}
            color="red"
          />
          <StatCard
            title="Resolved feedback"
            value={data.feedback.resolved}
            color="green"
          />
        </Grid>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({
  cols,
  children,
}: {
  cols: 3 | 4 | 5;
  children: React.ReactNode;
}) {
  const cls =
    cols === 3
      ? "lg:grid-cols-3"
      : cols === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";
  return (
    <div className={`grid grid-cols-2 gap-4 ${cls}`}>{children}</div>
  );
}
