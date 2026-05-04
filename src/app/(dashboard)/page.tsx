"use client";

import StatCard from "@/components/StatCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import BusinessInfoCard, { BusinessInfo } from "@/components/BusinessInfoCard";
import ReputationPanel, {
  type InternalFeedbackSummary,
} from "@/components/ReputationPanel";
import AdminDashboard from "@/components/AdminDashboard";
import ReportsPanel from "@/components/ReportsPanel";
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
  businessInfo: BusinessInfo | null;
};

export default function Dashboard() {
  const user = useStoredUser();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") return;
    fetch("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(setData);
  }, [user?.role]);

  if (user?.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
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
      />

      {user?.role === "CLIENT_ADMIN" && <ReportsPanel />}
    </div>
  );
}
