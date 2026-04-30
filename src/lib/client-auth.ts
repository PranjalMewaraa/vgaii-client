type JwtPayload = {
  exp?: number;
};

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
