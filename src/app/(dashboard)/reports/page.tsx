"use client";

import ReportsPanel from "@/components/ReportsPanel";
import RoleGuard from "@/components/RoleGuard";

export default function ReportsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <div className="space-y-3">
        <header>
          <h1 className="text-lg font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            Funnel, source attribution, and clinical outcomes.
          </p>
        </header>

        <ReportsPanel />
      </div>
    </RoleGuard>
  );
}
