"use client";

import ReportsPanel from "@/components/ReportsPanel";
import RoleGuard from "@/components/RoleGuard";

export default function ReportsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <div className="space-y-3" data-tour="reports-charts">
        {/* No page header — the TopBar renders "Reports" and ReportsPanel
            renders its own heading and subtitle. */}
        <ReportsPanel />
      </div>
    </RoleGuard>
  );
}
