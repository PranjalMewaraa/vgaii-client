"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LeadHit = {
  id: string;
  name?: string;
  phone?: string;
  status?: string;
  source?: string;
};

type ApptHit = {
  id: string;
  name?: string;
  phone?: string;
  date?: string;
  status?: string;
  diagnosis?: string;
};

type FbHit = {
  id: string;
  clientName?: string;
  clientPhone?: string;
  rating?: number;
  reviewText?: string;
  status?: string;
};

type Results = {
  leads: LeadHit[];
  patients: LeadHit[];
  appointments: ApptHit[];
  feedbacks: FbHit[];
};

type FlatHit =
  | { kind: "lead"; href: string; primary: string; secondary: string }
  | { kind: "patient"; href: string; primary: string; secondary: string }
  | { kind: "appointment"; href: string; primary: string; secondary: string }
  | { kind: "feedback"; href: string; primary: string; secondary: string };

const KIND_LABEL: Record<FlatHit["kind"], string> = {
  lead: "Lead",
  patient: "Patient",
  appointment: "Appointment",
  feedback: "Feedback",
};

const KIND_COLOR: Record<FlatHit["kind"], string> = {
  lead: "bg-sky-100 text-sky-700",
  patient: "bg-emerald-100 text-emerald-700",
  appointment: "bg-violet-100 text-violet-700",
  feedback: "bg-amber-100 text-amber-700",
};

const authHeaders = () => ({
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const flatten = (r: Results): FlatHit[] => {
  const out: FlatHit[] = [];
  for (const l of r.leads) {
    out.push({
      kind: "lead",
      href: `/leads/${l.id}`,
      primary: l.name ?? "—",
      secondary: [l.phone, l.status].filter(Boolean).join(" · "),
    });
  }
  for (const p of r.patients) {
    out.push({
      kind: "patient",
      href: `/patients/${p.id}`,
      primary: p.name ?? "—",
      secondary: [p.phone, p.status].filter(Boolean).join(" · "),
    });
  }
  for (const a of r.appointments) {
    const date = a.date ? new Date(a.date).toLocaleString() : "";
    out.push({
      kind: "appointment",
      href: `/appointments`,
      primary: a.name ?? "Appointment",
      secondary: [date, a.status].filter(Boolean).join(" · "),
    });
  }
  for (const f of r.feedbacks) {
    out.push({
      kind: "feedback",
      href: `/feedbacks`,
      primary: f.clientName ?? "Feedback",
      secondary: [
        typeof f.rating === "number" ? `${f.rating}/5` : null,
        f.reviewText?.slice(0, 60),
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  return out;
};

export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl+K opens and focuses the search input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced search. All setState calls happen inside the (async)
  // setTimeout callback so the React 19 "no synchronous setState in
  // effect body" rule is satisfied.
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        headers: authHeaders(),
      })
        .then(r => r.json())
        .then((d: Results) => {
          setResults(d);
          setActiveIdx(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const flat = results ? flatten(results) : [];
  const totalResults = flat.length;

  const navigate = (hit: FlatHit) => {
    setOpen(false);
    setQ("");
    setResults(null);
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, Math.max(totalResults - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[activeIdx];
      if (hit) navigate(hit);
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search leads, patients, appointments…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-9 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          ⌕
        </span>
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
          ⌘K
        </span>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && totalResults === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>
          ) : totalResults === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              No matches for &quot;{q}&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {flat.map((hit, i) => (
                <li key={`${hit.kind}-${hit.href}-${i}`}>
                  <button
                    type="button"
                    onClick={() => navigate(hit)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left ${
                      i === activeIdx ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_COLOR[hit.kind]}`}
                    >
                      {KIND_LABEL[hit.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {hit.primary}
                      </span>
                      {hit.secondary && (
                        <span className="block truncate text-xs text-slate-500">
                          {hit.secondary}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
