"use client";

import { RefreshCw } from "lucide-react";
import useSWR from "swr";
import SubscriptionCard from "@/components/SubscriptionCard";
import BusinessInfoCard, { BusinessInfo } from "@/components/BusinessInfoCard";
import ReputationPanel, {
  type InternalFeedbackSummary,
} from "@/components/ReputationPanel";
import QuickActionsCard from "@/components/QuickActionsCard";
import NextAppointmentCard from "@/components/NextAppointmentCard";
import OverviewCard from "@/components/OverviewCard";
import AdminDashboard from "@/components/AdminDashboard";
import LeadsTrendChart from "@/components/charts/LeadsTrendChart";
import { useStoredUser } from "@/lib/client-auth";

type DashboardData = {
  leadsCount: number;
  todayLeads: number;
  yesterdayLeads: number;
  patientsCount: number;
  appointments: number;
  yesterdayUpcomingAppointments: number;
  openFeedback: number;
  internalFeedback: InternalFeedbackSummary;
  subscription?: string;
  renewalDate?: string | null;
  subscriptionSource?: "external" | "local";
  subscriptionError?: string;
  businessInfo: BusinessInfo | null;
  topSources?: Array<{ source: string; count: number }>;
  weeklyLeads?: Array<{ date: string; count: number }>;
};

export default function Dashboard() {
  const user = useStoredUser();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // SWR drives the dashboard so the Refresh button is a simple mutate().
  // Super-admins use a different view, so skip the fetch for them.
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    isSuperAdmin ? null : "/api/dashboard",
  );

  if (isSuperAdmin) {
    return <AdminDashboard />;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load dashboard: {error.message}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overview of your leads, patients, and reputation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* Row 1: GMB · Quick Actions · Overview. On tablet (md) the GMB
          card spans the full row and Quick Actions / Overview share the
          row below. On lg+ they all sit together. */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <BusinessInfoCard
            businessInfo={data.businessInfo}
            onRefreshed={() => mutate()}
          />
        </div>
        <div>
          <QuickActionsCard />
        </div>
        <div>
          <OverviewCard
            todayLeads={data.todayLeads}
            todayLeadsDelta={data.todayLeads - data.yesterdayLeads}
            upcomingAppts={data.appointments}
            upcomingApptsDelta={
              data.appointments - data.yesterdayUpcomingAppointments
            }
          />
        </div>
      </div>

      {/* Row 2: Reputation · Next appointment */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <ReputationPanel
            businessInfo={data.businessInfo}
            internal={data.internalFeedback}
          />
        </div>
        <div>
          <NextAppointmentCard />
        </div>
      </div>

      {/* Row 3: leads trend + subscription */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <LeadsTrendChart data={data.weeklyLeads ?? []} />
        </div>
        <div>
          <SubscriptionCard
            status={data.subscription}
            renewalDate={data.renewalDate}
            source={data.subscriptionSource}
            error={data.subscriptionError}
          />
        </div>
      </div>
    </div>
  );
}
