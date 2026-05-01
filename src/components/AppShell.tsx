"use client";

import { ReactNode, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const APP_VERSION = "1.0.0";
const YEAR = new Date().getFullYear();

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <ImpersonationBanner />

          <main className="flex-1 px-6 py-8 md:px-8">{children}</main>

          <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 md:px-8">
            <span>© {YEAR} VGAII. All rights reserved.</span>
            <span>Version {APP_VERSION}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
