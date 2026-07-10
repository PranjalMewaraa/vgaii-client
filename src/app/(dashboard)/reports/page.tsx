"use client";

import ReportsPanel from "@/components/ReportsPanel";
import RoleGuard from "@/components/RoleGuard";

export default function ReportsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <div className="space-y-5">
        {/* No page header — the TopBar renders "Reports" and ReportsPanel
            renders its own heading and subtitle. The data-tour target
            lives inside the panel on a much smaller element so the
            spotlight doesn't span the whole scrolling layout. */}
        <ReportsPanel />
      </div>
    </RoleGuard>
  );
}
