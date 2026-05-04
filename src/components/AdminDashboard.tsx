"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Globe,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import StatCard from "@/components/StatCard";

type AttentionRow = {
  id: string;
  name: string;
  subscriptionStatus: string;
  renewalDate: string | null;
  severity: "expired" | "this_week" | "this_month";
  daysUntilRenewal: number | null;
};

type TopClientRow = {
  clientId: string;
  clientName: string;
  leads: number;
};

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
  subscriptionAttention: AttentionRow[];
  topClientsThisWeek: TopClientRow[];
};

type ActivityEntry = {
  id: string;
  actorType: "user" | "webhook" | "public" | "system";
  actorLabel: string;
  action: string;
  entityType: string;
  entityLabel: string;
  summary: string;
  createdAt: string;
};

const SEVERITY_TONE: Record<AttentionRow["severity"], string> = {
  expired: "border-red-200 bg-red-50 text-red-800",
  this_week: "border-amber-200 bg-amber-50 text-amber-800",
  this_month: "border-slate-200 bg-slate-50 text-slate-700",
};

const SEVERITY_LABEL: Record<AttentionRow["severity"], string> = {
  expired: "Expired",
  this_week: "This week",
  this_month: "This month",
};

const ACTOR_BADGE: Record<ActivityEntry["actorType"], string> = {
  user: "bg-indigo-100 text-indigo-700",
  webhook: "bg-violet-100 text-violet-700",
  public: "bg-sky-100 text-sky-700",
  system: "bg-slate-100 text-slate-600",
};

const formatRenewal = (row: AttentionRow): string => {
  if (row.severity === "expired") return "Subscription expired";
  if (row.daysUntilRenewal == null) return "Renewal date unset";
  if (row.daysUntilRenewal === 0) return "Renews today";
  if (row.daysUntilRenewal === 1) return "Renews tomorrow";
  return `Renews in ${row.daysUntilRenewal} days`;
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.round((now - d.getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h ago`;
  return d.toLocaleDateString();
};

export default function AdminDashboard() {
  const { data, error } = useSWR<Analytics>("/api/admin/analytics");
  const { data: auditData } = useSWR<{ entries: ActivityEntry[] }>(
    "/api/audit?limit=8",
  );
  const activity = auditData?.entries ?? null;

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error.message || "Could not load analytics"}
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/activity"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Activity size={14} />
            Activity log
          </Link>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={14} />
            New client
          </Link>
        </div>
      </header>

      {data.subscriptionAttention.length > 0 && (
        <SubscriptionAttention rows={data.subscriptionAttention} />
      )}

      <Section title="Clients" icon={Building2}>
        <Grid cols={4}>
          <StatCard
            title="Total"
            value={data.clients.total}
            icon={Building2}
            color="indigo"
          />
          <StatCard
            title="Active"
            value={data.clients.active}
            color="green"
            icon={CheckCircle2}
          />
          <StatCard
            title="Trial"
            value={data.clients.trial}
            color="amber"
            icon={Clock}
          />
          <StatCard
            title="Expired"
            value={data.clients.expired}
            color="red"
            icon={AlertCircle}
          />
        </Grid>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Globe size={12} />
          {data.clients.profilesEnabled} client
          {data.clients.profilesEnabled === 1 ? " has" : "s have"} a public
          profile published.
        </p>
      </Section>

      <Section title="Users" icon={Users}>
        <Grid cols={3}>
          <StatCard
            title="Total"
            value={data.users.total}
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Client admins"
            value={data.users.admins}
            icon={ShieldCheck}
          />
          <StatCard
            title="Staff"
            value={data.users.staff}
            icon={UserPlus}
          />
        </Grid>
      </Section>

      <Section title="Leads" icon={ClipboardList}>
        <Grid cols={5}>
          <StatCard
            title="All time"
            value={data.leads.total}
            icon={ClipboardList}
            color="indigo"
          />
          <StatCard
            title="Today"
            value={data.leads.today}
            icon={Sparkles}
            color="amber"
          />
          <StatCard
            title="This week"
            value={data.leads.thisWeek}
            icon={TrendingUp}
            color="indigo"
          />
          <StatCard
            title="Visited"
            value={data.leads.visited}
            color="green"
            icon={CheckCircle2}
          />
          <StatCard
            title="Lost"
            value={data.leads.lost}
            color="red"
            icon={AlertCircle}
          />
        </Grid>
      </Section>

      <Section title="Appointments & feedback" icon={Calendar}>
        <Grid cols={4}>
          <StatCard
            title="Upcoming appts"
            value={data.appointments.upcoming}
            icon={Calendar}
            color="indigo"
          />
          <StatCard
            title="Completed appts"
            value={data.appointments.completed}
            color="green"
            icon={CheckCircle2}
          />
          <StatCard
            title="Open feedback"
            value={data.feedback.open}
            color="red"
            icon={MessageSquare}
          />
          <StatCard
            title="Resolved feedback"
            value={data.feedback.resolved}
            color="green"
            icon={CheckCircle2}
          />
        </Grid>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopClients rows={data.topClientsThisWeek} />
        <RecentActivity entries={activity} />
      </div>
    </div>
  );
}

function SubscriptionAttention({ rows }: { rows: AttentionRow[] }) {
  const expiredCount = rows.filter(r => r.severity === "expired").length;
  const weekCount = rows.filter(r => r.severity === "this_week").length;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertCircle size={14} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Subscriptions needing attention
          </h2>
          <p className="text-xs text-slate-600">
            {expiredCount} expired · {weekCount} renew this week ·{" "}
            {rows.length} total flagged
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map(row => (
          <li key={row.id}>
            <Link
              href={`/admin/clients/${row.id}`}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition hover:brightness-95 ${SEVERITY_TONE[row.severity]}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {row.name}
                </span>
                <span className="block text-xs opacity-80">
                  {formatRenewal(row)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {SEVERITY_LABEL[row.severity]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopClients({ rows }: { rows: TopClientRow[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <TrendingUp size={14} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Top clients this week
          </h2>
          <p className="text-xs text-slate-500">
            Ranked by new leads in the last 7 days.
          </p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
          No leads recorded in the last 7 days.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li key={row.clientId}>
              <Link
                href={`/admin/clients/${row.clientId}`}
                className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {row.clientName}
                </span>
                <span className="shrink-0 text-sm font-semibold text-indigo-600">
                  {row.leads}
                  <span className="ml-1 text-[10px] font-normal uppercase tracking-wider text-slate-400">
                    leads
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RecentActivity({ entries }: { entries: ActivityEntry[] | null }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <Activity size={14} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recent activity
            </h2>
            <p className="text-xs text-slate-500">
              Latest events across all clients.
            </p>
          </div>
        </div>
        <Link
          href="/activity"
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          View all →
        </Link>
      </div>
      {entries === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
          No activity yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map(entry => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <span
                className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ACTOR_BADGE[entry.actorType]}`}
              >
                {entry.actorType}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800">
                  <span className="font-semibold">{entry.actorLabel}</span>{" "}
                  <span className="text-slate-500">{entry.action}</span>{" "}
                  <span className="font-medium">{entry.entityLabel}</span>
                </span>
                {entry.summary && (
                  <span className="block truncate text-xs text-slate-500">
                    {entry.summary}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">
                {formatTime(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {Icon && <Icon size={12} />}
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
      ? "md:grid-cols-3"
      : cols === 4
        ? "md:grid-cols-2 lg:grid-cols-4"
        : "md:grid-cols-3 lg:grid-cols-5";
  return <div className={`grid grid-cols-2 gap-4 ${cls}`}>{children}</div>;
}
