import { useSyncExternalStore } from "react";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const STASH_TOKEN = "impersonator_token";
const STASH_USER = "impersonator_user";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(cb => cb());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === STASH_TOKEN ||
      e.key === STASH_USER ||
      e.key === USER_KEY ||
      e.key === null
    ) {
      cb();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", handleStorage);
  };
};

type ImpersonateResponse = {
  token?: string;
  user?: Record<string, unknown>;
  error?: string;
};

export const startImpersonation = async (userId: string) => {
  const original = localStorage.getItem(TOKEN_KEY);
  if (!original) throw new Error("Not signed in");

  const res = await fetch("/api/admin/impersonate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${original}`,
    },
    body: JSON.stringify({ userId }),
  });

  const data = (await res.json()) as ImpersonateResponse;
  if (!res.ok || !data.token || !data.user) {
    throw new Error(data.error || "Could not impersonate");
  }

  // Stash the original super-admin session before swapping.
  if (!localStorage.getItem(STASH_TOKEN)) {
    localStorage.setItem(STASH_TOKEN, original);
    const origUser = localStorage.getItem(USER_KEY);
    if (origUser) localStorage.setItem(STASH_USER, origUser);
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  notify();

  return data.user;
};

export const isImpersonating = () =>
  typeof window !== "undefined" && !!localStorage.getItem(STASH_TOKEN);

export const stopImpersonation = () => {
  const original = localStorage.getItem(STASH_TOKEN);
  const originalUser = localStorage.getItem(STASH_USER);
  if (!original) return false;

  localStorage.setItem(TOKEN_KEY, original);
  if (originalUser) localStorage.setItem(USER_KEY, originalUser);
  else localStorage.removeItem(USER_KEY);

  localStorage.removeItem(STASH_TOKEN);
  localStorage.removeItem(STASH_USER);
  notify();
  return true;
};

const getImpersonationSnapshot = () =>
  typeof window !== "undefined" && !!localStorage.getItem(STASH_TOKEN);

export const useImpersonating = (): boolean =>
  useSyncExternalStore(
    subscribe,
    getImpersonationSnapshot,
    () => false,
  );
