"use client";

import Link from "next/link";

type Mode = "missing" | "forbidden";

const COPY: Record<
  Mode,
  { eyebrow: string; title: string; description: string; cta: string }
> = {
  missing: {
    eyebrow: "404",
    title: "Page not found",
    description:
      "The page you're looking for doesn't exist or has moved.",
    cta: "Back to dashboard",
  },
  forbidden: {
    eyebrow: "403",
    title: "You don't have access",
    description:
      "Your account doesn't have permission to view this page. Ask your admin to grant you the required module.",
    cta: "Back to dashboard",
  },
};

export default function NotFoundView({
  mode = "missing",
  fillScreen = false,
}: {
  mode?: Mode;
  fillScreen?: boolean;
}) {
  const copy = COPY[mode];

  const shell = fillScreen
    ? "flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
    : "flex flex-1 items-center justify-center py-10";

  return (
    <div className={shell}>
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-5xl font-bold text-indigo-600">{copy.eyebrow}</p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{copy.description}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {copy.cta}
        </Link>
      </section>
    </div>
  );
}
