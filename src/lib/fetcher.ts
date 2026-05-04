// SWR fetcher used across the app. Surfaces server error messages as
// thrown Errors so SWR's `error` slot reflects what the API said, and
// attaches `status` for callers that branch on it (e.g. 401 → re-login).

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") msg = data.error;
    } catch {
      // body wasn't JSON; keep the default status message
    }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
};
