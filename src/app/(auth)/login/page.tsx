"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, isTokenUsable } from "@/lib/client-auth";

type LoginResponse = {
  token?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
    role: string;
    clientId?: string | null;
    assignedModules?: string[];
  };
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTokenUsable(getStoredToken())) {
      router.replace("/dashboard");
    }
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as LoginResponse;

      if (!res.ok || !data.token) {
        setError(data.error || "Invalid email or password");
        return;
      }

      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      // Send freshly logged-in users to the dashboard. If `?next=` was
      // captured by AuthGuard from a deep link (anything not the marketing
      // root), honour it.
      router.replace(next && next !== "/" ? next : "/dashboard");
    } catch {
      setError("Unable to sign in right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            V
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-900">
            VGAII-CRM
          </span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Access your leads, patients, and feedback workflows.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
