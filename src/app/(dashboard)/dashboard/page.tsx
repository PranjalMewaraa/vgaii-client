"use client";

import StatCard from "@/components/StatCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import BusinessInfoCard, { BusinessInfo } from "@/components/BusinessInfoCard";
import ReputationPanel, {
  type InternalFeedbackSummary,
} from "@/components/ReputationPanel";
import AdminDashboard from "@/components/AdminDashboard";
import { useStoredUser } from "@/lib/client-auth";
import { useEffect, useState } from "react";

type DashboardData = {
  leadsCount: number;
  todayLeads: number;
  patientsCount: number;
  appointments: number;
  openFeedback: number;
  internalFeedback: InternalFeedbackSummary;
  subscription?: string;
  renewalDate?: string | null;
  subscriptionSource?: "external" | "local";
  subscriptionError?: string;
  businessInfo: BusinessInfo | null;
};

export default function Dashboard() {
  const user = useStoredUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") return;
    fetch("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(async res => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || typeof body !== "object" || "error" in body) {
          setError(body?.error ?? `Request failed (${res.status})`);
          return;
        }
        setData(body as DashboardData);
      })
      .catch(err => setError(err?.message ?? "Failed to load dashboard"));
  }, [user?.role]);

  if (user?.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load dashboard: {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of your leads, patients, and reputation.
        </p>
      </header>

      <BusinessInfoCard
        businessInfo={data.businessInfo}
        onRefreshed={next =>
          setData(d => (d ? { ...d, businessInfo: next } : d))
        }
      />

      <ReputationPanel
        businessInfo={data.businessInfo}
        internal={data.internalFeedback}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Leads" value={data.leadsCount} />
        <StatCard title="Today Leads" value={data.todayLeads} />
        <StatCard title="Patients" value={data.patientsCount} />
        <StatCard title="Upcoming Appts" value={data.appointments} />
      </div>

      <SubscriptionCard
        status={data.subscription}
        renewalDate={data.renewalDate}
        source={data.subscriptionSource}
        error={data.subscriptionError}
      />
    </div>
  );
}
