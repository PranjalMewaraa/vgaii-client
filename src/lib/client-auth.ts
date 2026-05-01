import { useSyncExternalStore } from "react";

type JwtPayload = {
  exp?: number;
};

export type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: "SUPER_ADMIN" | "CLIENT_ADMIN" | "STAFF";
  clientId?: string | null;
  assignedModules?: string[];
};

const userListeners = new Set<() => void>();

const subscribeUser = (cb: () => void) => {
  userListeners.add(cb);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "user" || e.key === null) cb();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    userListeners.delete(cb);
    window.removeEventListener("storage", handleStorage);
  };
};

let cachedUserRaw: string | null = null;
let cachedUser: StoredUser | null = null;

const getUserSnapshot = (): StoredUser | null => {
  const raw = localStorage.getItem("user");
  if (raw === cachedUserRaw) return cachedUser;
  cachedUserRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }
  try {
    cachedUser = JSON.parse(raw) as StoredUser;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
};

export const useStoredUser = (): StoredUser | null =>
  useSyncExternalStore(
    subscribeUser,
    getUserSnapshot,
    () => null,
  );

const decodePayload = (token: string): JwtPayload | null => {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
};

export const clearStoredAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  cachedUserRaw = null;
  cachedUser = null;
  userListeners.forEach(cb => cb());
};

export const isTokenUsable = (token: string | null) => {
  if (!token) {
    return false;
  }

  const payload = decodePayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 > Date.now();
};
