"use client";

import StatCard from "@/components/StatCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useEffect, useState } from "react";

type DashboardData = {
  leadsCount: number;
  todayLeads: number;
  appointments: number;
  openFeedback: number;
  positiveReviews: number;
  negativeReviews: number;
  subscription?: string;
  renewalDate?: string | null;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* 🔢 STATS GRID */}
      <div className="grid grid-cols-4 gap-4">

        <StatCard title="Total Leads" value={data.leadsCount} />
        <StatCard title="Today Leads" value={data.todayLeads} />
        <StatCard title="Appointments" value={data.appointments} />
        <StatCard title="Open Issues" value={data.openFeedback} />

      </div>

      {/* ⭐ REVIEWS SECTION */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Positive Reviews"
          value={data.positiveReviews}
          color="green"
        />

        <StatCard
          title="Negative Reviews"
          value={data.negativeReviews}
          color="red"
        />
      </div>

      {/* 💳 SUBSCRIPTION */}
      <SubscriptionCard
        status={data.subscription}
        renewalDate={data.renewalDate}
      />

    </div>
  );
}
