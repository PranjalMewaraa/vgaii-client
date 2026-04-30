"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredAuth, getStoredToken, isTokenUsable } from "@/lib/client-auth";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let frameId: number | null = null;
    const token = getStoredToken();

    if (!isTokenUsable(token)) {
      clearStoredAuth();
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }

    frameId = window.requestAnimationFrame(() => setAllowed(true));

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 shadow-2xl backdrop-blur-md">
          Checking session...
        </div>
      </div>
    );
  }

  return children;
}
