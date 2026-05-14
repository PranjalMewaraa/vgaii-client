"use client";

import ReportsPanel from "@/components/ReportsPanel";
import RoleGuard from "@/components/RoleGuard";

export default function ReportsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <div className="space-y-3">
        {/* No <h1> here — the TopBar already renders "Reports" as the page
            title, and two H1s on one screen reads as a duplicate. */}
        <p className="text-sm text-slate-500">
          Funnel, source attribution, and clinical outcomes.
        </p>

        <ReportsPanel />
      </div>
    </RoleGuard>
  );
}
