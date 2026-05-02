"use client";

import { useEffect, useId, useRef, useState } from "react";

// Cal.com inline embed wrapper. Loads their embed.js bootstrap, mounts the
// inline widget, and surfaces the bookingSuccessfulV2 event so the caller can
// react when a slot is picked.
//
// Cal.com's bootstrap snippet pollutes `window.Cal` with a queue-based stub
// that flushes once the script finishes loading; we just need to invoke
// `Cal(...)` after `ensureScript()`.

declare global {
  interface Window {
    // The bootstrap stub uses `Cal.q` queue + `Cal.ns` namespace map. We type
    // it loose because it's a function with extra properties.
    Cal?: ((...args: unknown[]) => void) & {
      ns?: Record<string, (...args: unknown[]) => void>;
      loaded?: boolean;
      q?: unknown[];
    };
  }
}

const SCRIPT_SRC = "https://app.cal.com/embed/embed.js";

// Cal.com's official bootstrap, ported verbatim. Idempotent — running it
// twice doesn't double-load. After this returns, `window.Cal` is a callable
// queue that buffers calls until the script finishes loading.
const ensureBootstrap = (): Promise<void> =>
  new Promise(resolve => {
    if (window.Cal) return resolve();
    const C = window;
    const A = SCRIPT_SRC;
    const L = "init";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (a: any, ar: unknown) => a.q.push(ar);
    const d = C.document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (C as any).Cal = function (...args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cal = (C as any).Cal;
      const ar = args;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        const s = d.createElement("script");
        s.src = A;
        d.head.appendChild(s);
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const namespace = ar[1];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: any = function (...inner: unknown[]) {
          p(api, inner);
        };
        api.q = api.q || [];
        if (typeof namespace === "string") {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ["initNamespace", namespace]);
        } else {
          p(cal, ar);
        }
        return;
      }
      p(cal, ar);
    };
    resolve();
  });

const extractCalLink = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    if (!/(^|\.)cal\.com$/i.test(u.hostname)) return null;
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    return path || null;
  } catch {
    // Not a full URL — assume the user pasted just the calLink portion.
    const trimmed = raw.replace(/^\/+|\/+$/g, "");
    return trimmed || null;
  }
};

export default function BookingEmbed({
  url,
  name,
  email,
  phone,
  onScheduled,
}: {
  url: string;
  name?: string;
  email?: string;
  phone?: string;
  onScheduled?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const namespace = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const calLink = extractCalLink(url);
  const validationError = !calLink
    ? "Booking URL doesn't look like a Cal.com event link (https://cal.com/<account>/<event>)."
    : null;
  const error = validationError ?? runtimeError;

  useEffect(() => {
    if (!calLink) return;
    if (!ref.current) return;
    let cancelled = false;
    const target = ref.current;
    target.innerHTML = "";

    ensureBootstrap()
      .then(() => {
        if (cancelled || !window.Cal) return;
        try {
          window.Cal("init", namespace, { origin: "https://cal.com" });
          const ns = window.Cal.ns?.[namespace];
          if (!ns) {
            setRuntimeError("Cal.com embed failed to initialize.");
            return;
          }
          ns("inline", {
            elementOrSelector: target,
            calLink,
            config: {
              layout: "month_view",
              name,
              email,
              "metadata[phone]": phone,
            },
          });

          // Register listeners on the namespace-scoped instance so we don't
          // miss events. Subscribe to both event names — Cal.com kept the
          // legacy `bookingSuccessful` alongside the new `bookingSuccessfulV2`,
          // and which one fires depends on the deployment / event-type
          // configuration.
          const handle = () => {
            if (!cancelled) onScheduled?.();
          };
          ns("on", { action: "bookingSuccessfulV2", callback: handle });
          ns("on", { action: "bookingSuccessful", callback: handle });
        } catch (err) {
          console.error("[BookingEmbed] init failed:", err);
          setRuntimeError(
            err instanceof Error ? err.message : "Couldn't load Cal.com embed",
          );
        }
      })
      .catch(err => {
        if (!cancelled) {
          setRuntimeError(
            err instanceof Error
              ? err.message
              : "Couldn't load Cal.com script",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [calLink, namespace, name, email, phone, onScheduled]);

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Couldn&apos;t embed the booking widget.</p>
        <p className="mt-1 text-xs">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Open Cal.com in a new tab →
        </a>
      </div>
    );
  }

  return <div ref={ref} style={{ minWidth: 320, height: 700 }} />;
}
