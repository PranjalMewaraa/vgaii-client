"use client";

import { ReactNode, useEffect, useState } from "react";
import { SWRConfig } from "swr";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { TourProvider } from "@/components/tour/TourContext";
import WelcomeOnboardingModal from "@/components/tour/WelcomeOnboardingModal";
import TourRunner from "@/components/tour/TourRunner";
import TourController from "@/components/tour/TourController";
import ResumeTourBanner from "@/components/tour/ResumeTourBanner";
import QuickActionFab from "@/components/QuickActionFab";
import { fetcher } from "@/lib/fetcher";

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
    <SWRConfig
      value={{
        fetcher,
        // Stale-while-revalidate: pages with cached data render instantly,
        // SWR refreshes in the background. The 30s dedupe window stops
        // back/forward navigation from spamming the API.
        dedupingInterval: 30_000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      <TourProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="flex">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <TopBar onMenuClick={() => setSidebarOpen(true)} />
              <ImpersonationBanner />
              <ResumeTourBanner />

              <main className="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </main>

              <footer className="mt-auto flex items-center justify-between border-t border-slate-200/80 bg-white/60 px-4 py-3 text-xs text-slate-400 sm:px-6 lg:px-8">
                <span>© {YEAR} VGAII. All rights reserved.</span>
                <span className="font-medium">Version {APP_VERSION}</span>
              </footer>
            </div>
          </div>
        </div>
        <WelcomeOnboardingModal />
        <TourRunner />
        <TourController />
        <QuickActionFab />
      </TourProvider>
    </SWRConfig>
  );
}
