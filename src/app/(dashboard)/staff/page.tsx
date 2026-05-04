"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ASSIGNABLE_MODULES, type AssignableModule } from "@/lib/rbac";
import RoleGuard from "@/components/RoleGuard";

type Staff = {
  id: string;
  name?: string;
  email?: string;
  assignedModules: AssignableModule[];
  createdAt?: string;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function StaffPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <StaffPageInner />
    </RoleGuard>
  );
}

function StaffPageInner() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // create form state
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createModules, setCreateModules] = useState<AssignableModule[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const closeCreate = () => {
    setShowCreate(false);
    setName("");
    setEmail("");
    setPassword("");
    setCreateModules([]);
    setCreateError(null);
  };

  // per-row edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModules, setEditModules] = useState<AssignableModule[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff", { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setStaff(data.staff ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleModule = (
    list: AssignableModule[],
    mod: AssignableModule,
  ): AssignableModule[] =>
    list.includes(mod) ? list.filter(m => m !== mod) : [...list, mod];

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          email,
          password,
          assignedModules: createModules,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(
          typeof data.error === "string"
            ? data.error
            : "Failed to create staff",
        );
        return;
      }
      setStaff(s => [data.staff, ...s]);
      closeCreate();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (member: Staff) => {
    setEditingId(member.id);
    setEditModules([...(member.assignedModules ?? [])]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditModules([]);
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ assignedModules: editModules }),
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(s => s.map(m => (m.id === id ? data.staff : m)));
        cancelEdit();
      }
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this staff member? This cannot be undone.")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        setStaff(s => s.filter(m => m.id !== id));
      }
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users size={16} />
            </span>
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your staff members and the modules they can access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {showCreate ? (
            <>
              <X size={14} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={14} />
              Add staff
            </>
          )}
        </button>
      </header>

      {showCreate && (
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <UserPlus size={14} />
            </span>
            Add staff member
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            They&apos;ll inherit your client and only see the modules you
            assign.
          </p>
        </div>

        <form onSubmit={submitCreate} className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Name
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                minLength={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Temporary password
              </span>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                aria-describedby="password-helper"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="At least 8 characters"
              />
              <p
                id="password-helper"
                className={`mt-1 inline-flex items-center gap-1 text-xs ${
                  password.length === 0
                    ? "text-slate-500"
                    : password.length >= 8
                      ? "text-emerald-600"
                      : "text-amber-600"
                }`}
              >
                {password.length >= 8 ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <span aria-hidden="true">•</span>
                )}
                {password.length === 0
                  ? "Use at least 8 characters — share it with the staff member after they're added."
                  : password.length >= 8
                    ? "Looks good. Remember to share this with the staff member."
                    : `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed.`}
              </p>
            </label>
          </div>

          <div className="mt-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
              <Layers size={12} />
              Modules
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSIGNABLE_MODULES.map(m => {
                const on = createModules.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setCreateModules(prev => toggleModule(prev, m))
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider transition ${
                      on
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {on && <Check size={11} />}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {createError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeCreate}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <UserPlus size={14} />
              {creating ? "Creating…" : "Add staff"}
            </button>
          </div>
        </form>
      </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users size={14} />
            </span>
            All Staff
          </h2>
          <span className="text-xs text-slate-500">
            {staff.length} {staff.length === 1 ? "member" : "members"}
          </span>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-slate-500">Loading…</p>
        ) : staff.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No staff yet — add one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Modules</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => {
                  const editing = editingId === member.id;
                  return (
                    <tr
                      key={member.id}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {(member.name || member.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          {member.name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {member.email}
                      </td>
                      <td className="px-6 py-4">
                        {editing ? (
                          <div className="flex flex-wrap gap-2">
                            {ASSIGNABLE_MODULES.map(m => {
                              const on = editModules.includes(m);
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setEditModules(prev =>
                                      toggleModule(prev, m),
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition ${
                                    on
                                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {on && <Check size={10} />}
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        ) : member.assignedModules.length === 0 ? (
                          <span className="text-xs text-slate-400">none</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {member.assignedModules.map(m => (
                              <span
                                key={m}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-700"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editing ? (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEdit(member.id)}
                              disabled={savingId === member.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              <Check size={12} />
                              {savingId === member.id ? "Saving…" : "Save"}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(member)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Pencil size={12} />
                              Edit modules
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(member.id)}
                              disabled={removingId === member.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 size={12} />
                              {removingId === member.id
                                ? "Removing…"
                                : "Remove"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
