// Idempotent loader for the Google Maps JavaScript API. Returns a cached
// promise so repeated callers share the single <script> tag — calling
// twice (e.g. from React StrictMode double-invocation) is safe.
//
// Uses the official inline bootstrap pattern from Google's docs, which
// loads on demand and exposes `google.maps.importLibrary(...)` for ESM
// imports of individual modules.

type LibraryName = "maps" | "marker" | "places" | "geometry";

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (name: LibraryName) => Promise<unknown>;
      };
    };
    // Google calls this when the API key is rejected (e.g.
    // RefererNotAllowedMapError, ApiNotActivatedMapError). The script still
    // loads with HTTP 200, so this is the only signal that a referrer
    // restriction or missing API enablement broke things.
    gm_authFailure?: () => void;
  }
}

let loaderPromise: Promise<void> | null = null;

// Auth-failure (referrer restriction / API-not-enabled) is reported by Google
// out-of-band via gm_authFailure, after the loader promise has already
// resolved. We surface it through a tiny listener registry so UI can react.
let authFailed = false;
const authFailureListeners = new Set<() => void>();

export const didGoogleMapsAuthFail = (): boolean => authFailed;

export const onGoogleMapsAuthFailure = (cb: () => void): (() => void) => {
  authFailureListeners.add(cb);
  if (authFailed) cb();
  return () => authFailureListeners.delete(cb);
};

export const isGoogleMapsLoaded = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.google?.maps?.importLibrary === "function";

export const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps must be loaded in the browser"));
  }
  if (isGoogleMapsLoaded()) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "places,marker",
      loading: "async",
      callback: "__gmaps_init__",
    });
    const win = window as Window & {
      __gmaps_init__?: () => void;
    };
    win.__gmaps_init__ = () => resolve();

    // Register the auth-failure hook before the script runs. Google invokes
    // it when the key is rejected for this origin.
    win.gm_authFailure = () => {
      authFailed = true;
      authFailureListeners.forEach(cb => cb());
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
};
