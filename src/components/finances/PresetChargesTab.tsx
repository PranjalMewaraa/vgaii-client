"use client";

import { useState } from "react";
import useSWR from "swr";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { rupeesToPaise, paiseToRupees, formatRupees } from "@/lib/currency";

type Preset = {
  id: string;
  title: string;
  amount: number;
  active: boolean;
  sortOrder: number;
};

type Response = { charges: Preset[] };

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function PresetChargesTab() {
  const { data, mutate, isLoading } = useSWR<Response>(
    "/api/preset-charges?includeInactive=1",
  );
  const charges = data?.charges ?? [];

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const seedDefaults = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/preset-charges/seed-defaults", {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Couldn't seed starter charges",
        );
        return;
      }
      mutate();
    } finally {
      setSeeding(false);
    }
  };

  const addCharge = async () => {
    setError(null);
    const rupees = Number(newAmount);
    if (newTitle.trim().length < 1) return setError("Title is required");
    if (!Number.isFinite(rupees) || rupees < 0) return setError("Amount must be a positive number");
    setBusy(true);
    try {
      const res = await fetch("/api/preset-charges", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          amount: rupeesToPaise(rupees),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "Failed to add");
        return;
      }
      setNewTitle("");
      setNewAmount("");
      setAdding(false);
      mutate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-tour="presets-section">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          Buttons your receptionists tap during payment entry. Disabling a
          preset hides it from the payment form but keeps historical
          payments intact.
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f]"
          >
            <Plus size={12} />
            Add preset
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block flex-1 min-w-[180px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Title
            </span>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="e.g. Consultation"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Amount (₹)
            </span>
            <input
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              inputMode="numeric"
              placeholder="500"
              className="mt-1 w-32 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <button
            type="button"
            onClick={addCharge}
            disabled={busy}
            className="rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setError(null);
              setNewTitle("");
              setNewAmount("");
            }}
            className="text-xs text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-3 text-sm text-slate-500">Loading…</p>
        ) : charges.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 py-5 text-sm">
            <p className="text-slate-500">
              No preset charges yet. Add a few common services to make
              payment entry one-tap.
            </p>
            <button
              type="button"
              onClick={seedDefaults}
              disabled={seeding}
              data-tour="presets-add-starter"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2 text-sm font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:opacity-60"
            >
              <Sparkles size={12} />
              {seeding ? "Adding starter charges…" : "Add starter charges"}
            </button>
            <p className="text-xs text-slate-400">
              Adds Consultation, Follow-up, Injection, Dressing, Dental
              Cleaning, and X-Ray. Edit prices anytime.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {charges.map(c => (
              <PresetRow key={c.id} charge={c} onChange={() => mutate()} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PresetRow({
  charge,
  onChange,
}: {
  charge: Preset;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(charge.title);
  const [amount, setAmount] = useState(String(paiseToRupees(charge.amount)));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const rupees = Number(amount);
    if (title.trim().length < 1) return;
    if (!Number.isFinite(rupees) || rupees < 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/preset-charges/${charge.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          amount: rupeesToPaise(rupees),
        }),
      });
      if (res.ok) {
        setEditing(false);
        onChange();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/preset-charges/${charge.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !charge.active }),
      });
      if (res.ok) onChange();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${charge.title}"? Past payments keep their snapshot.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/preset-charges/${charge.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) onChange();
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-3 px-5 py-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          inputMode="numeric"
          className="w-32 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f] disabled:opacity-60"
        >
          {busy ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-slate-500 hover:underline"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70">
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium ${
            charge.active ? "text-slate-900" : "text-slate-400 line-through"
          }`}
        >
          {charge.title}
        </p>
        <p className="text-xs text-slate-500">{formatRupees(charge.amount)}</p>
      </div>
      <button
        type="button"
        onClick={toggleActive}
        disabled={busy}
        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
          charge.active
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
            : "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200"
        }`}
      >
        {charge.active ? "Active" : "Disabled"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Edit ${charge.title}`}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
        aria-label={`Delete ${charge.title}`}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
