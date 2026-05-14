"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useStoredUser } from "@/lib/client-auth";
import PaymentEntryTab from "@/components/finances/PaymentEntryTab";
import PresetChargesTab from "@/components/finances/PresetChargesTab";
import ExpenseEntryTab from "@/components/finances/ExpenseEntryTab";
import DailySummaryTab from "@/components/finances/DailySummaryTab";
import ReportsTab from "@/components/finances/ReportsTab";

type Tab = "payment" | "expense" | "summary" | "reports" | "presets";

type TabDef = {
  key: Tab;
  label: string;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  { key: "payment", label: "Payment Entry" },
  { key: "expense", label: "Expenses" },
  { key: "summary", label: "Daily Summary" },
  { key: "reports", label: "Reports" },
  { key: "presets", label: "Preset Charges", adminOnly: true },
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
  const [tab, setTab] = useState<Tab>("payment");

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-lg font-bold text-slate-900">Finances</h1>
        <p className="text-sm text-slate-500">
          Day-to-day patient payments, clinic expenses, and reports.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap border-b border-slate-200">
          {visibleTabs.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition ${
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

      {tab === "payment" && <PaymentEntryTab />}
      {tab === "expense" && <ExpenseEntryTab />}
      {tab === "summary" && <DailySummaryTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "presets" && isAdmin && <PresetChargesTab />}
    </div>
  );
}
