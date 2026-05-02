"use client";

import { ReactNode, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const APP_VERSION = "1.0.0";
const YEAR = new Date().getFullYear();

// Renew the JWT every 30 minutes while the tab is alive, plus once on
// every visibility-change-to-visible event. Active users never see the
// 1-day token expiry; idle/background tabs let it expire normally.
const RENEW_INTERVAL_MS = 30 * 60 * 1000;

const renewToken = async (): Promise<void> => {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch("/api/auth/renew", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.token === "string") {
      localStorage.setItem("token", data.token);
    }
  } catch {
    // Network blip — try again on the next tick.
  }
};

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(renewToken, RENEW_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void renewToken();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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
