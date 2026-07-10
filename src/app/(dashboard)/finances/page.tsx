"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useStoredUser } from "@/lib/client-auth";
import PaymentsListTab from "@/components/finances/PaymentsListTab";
import PresetChargesTab from "@/components/finances/PresetChargesTab";
import ExpensePresetsTab from "@/components/finances/ExpensePresetsTab";
import ExpenseEntryTab from "@/components/finances/ExpenseEntryTab";
import DailySummaryTab from "@/components/finances/DailySummaryTab";
import ReportsTab from "@/components/finances/ReportsTab";

type Tab = "payment" | "expense" | "summary" | "reports" | "presets";
type PresetSubTab = "earning" | "expense";

type TabDef = {
  key: Tab;
  label: string;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  { key: "payment", label: "Payments" },
  { key: "expense", label: "Expenses" },
  { key: "presets", label: "Presets", adminOnly: true },
  { key: "summary", label: "Daily Summary" },
  { key: "reports", label: "Reports" },
];

export default function FinancesPage() {
  return (
    <RoleGuard module="payments">
      <FinancesPageInner />
    </RoleGuard>
  );
}

function FinancesPageInner() {
  const user = useStoredUser();
  const isAdmin = user?.role === "CLIENT_ADMIN" || user?.role === "SUPER_ADMIN";

  // ?tab=payment&leadId=…&name=…&phone=… lets other pages deep-link
  // straight into a pre-filled payment entry form.
  const searchParams = useSearchParams();
  const tabFromUrl: Tab | null = (() => {
    const t = searchParams.get("tab");
    return t === "payment" ||
      t === "expense" ||
      t === "summary" ||
      t === "reports" ||
      t === "presets"
      ? (t as Tab)
      : null;
  })();
  const [tab, setTab] = useState<Tab>(tabFromUrl ?? "payment");
  // Re-sync when the URL flips to a different tab after mount (the
  // onboarding tour pushes `?tab=presets` while we're already on
  // `?tab=payment`). store-and-compare keeps the React-19 set-state-in-
  // effect lint happy.
  const [lastTabFromUrl, setLastTabFromUrl] = useState(tabFromUrl);
  if (tabFromUrl !== lastTabFromUrl) {
    setLastTabFromUrl(tabFromUrl);
    if (tabFromUrl) setTab(tabFromUrl);
  }
  const prefillLead = (() => {
    const id = searchParams.get("leadId");
    if (!id) return undefined;
    return {
      id,
      name: searchParams.get("name") ?? "",
      phone: searchParams.get("phone") ?? "",
    };
  })();
  // ?new=1 from the floating quick-action FAB opens the entry modal
  // straight away (no prefill — receptionist types the phone in the
  // first field).
  const autoOpenNew = searchParams.get("new") === "1";

  const [presetSubTab, setPresetSubTab] = useState<PresetSubTab>("earning");

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finances</h1>
        <p className="mt-1 text-sm text-slate-500">
          Day-to-day patient payments, clinic expenses, and reports.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {visibleTabs.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                data-tour={t.key === "payment" ? "payments-tab" : undefined}
                className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition md:flex-1 ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "payment" && (
        <PaymentsListTab
          prefillLead={prefillLead}
          autoOpenNew={autoOpenNew}
        />
      )}
      {tab === "expense" && <ExpenseEntryTab />}
      {tab === "summary" && <DailySummaryTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "presets" && isAdmin && (
        <div className="space-y-5">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm shadow-sm">
            <button
              type="button"
              onClick={() => setPresetSubTab("earning")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                presetSubTab === "earning"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Earning presets
            </button>
            <button
              type="button"
              onClick={() => setPresetSubTab("expense")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                presetSubTab === "expense"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Expense presets
            </button>
          </div>
          {presetSubTab === "earning" ? <PresetChargesTab /> : <ExpensePresetsTab />}
        </div>
      )}
    </div>
  );
}
