type AxiosLike = {
  isAxiosError?: boolean;
  response?: {
    data?: unknown;
    status?: number;
  };
  message?: string;
};

const isAxiosLike = (err: unknown): err is AxiosLike =>
  typeof err === "object" && err !== null && "isAxiosError" in err;

export const getErrorMessage = (
  err: unknown,
  fallback = "Something went wrong",
) => {
  if (isAxiosLike(err) && err.response) {
    const data = err.response.data;
    if (typeof data === "string" && data) return data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidate =
        obj.status_message ?? obj.error ?? obj.message ?? obj.detail;
      if (typeof candidate === "string" && candidate) {
        return `[${err.response.status}] ${candidate}`;
      }
      try {
        return `[${err.response.status}] ${JSON.stringify(data)}`;
      } catch {
        // fall through
      }
    }
    return `[${err.response.status}] ${err.message ?? fallback}`;
  }
  return err instanceof Error ? err.message : fallback;
};
