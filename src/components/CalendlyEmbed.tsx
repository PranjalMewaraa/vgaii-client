"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
        prefill?: {
          name?: string;
          email?: string;
          customAnswers?: Record<string, string>;
        };
        utm?: Record<string, string>;
      }) => void;
    };
  }
}

const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

const ensureCss = () => {
  if (document.querySelector(`link[href="${WIDGET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = WIDGET_CSS;
  document.head.appendChild(link);
};

// Calendly sometimes sets `window.Calendly` a tick AFTER the script's load
// event fires, so wait until the global is actually present.
const waitForGlobal = (timeoutMs = 8000) =>
  new Promise<void>((resolve, reject) => {
    if (window.Calendly?.initInlineWidget) return resolve();
    const start = Date.now();
    const id = setInterval(() => {
      if (window.Calendly?.initInlineWidget) {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(id);
        reject(new Error("Calendly script did not initialize"));
      }
    }, 50);
  });

const ensureScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Calendly?.initInlineWidget) return resolve();

    const existing = document.querySelector(
      `script[src="${WIDGET_JS}"]`,
    ) as HTMLScriptElement | null;

    if (existing) {
      // Script tag is in DOM but global may not be ready yet.
      waitForGlobal().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_JS;
    script.async = true;
    script.onload = () => waitForGlobal().then(resolve).catch(reject);
    script.onerror = () =>
      reject(new Error("Failed to load Calendly widget script"));
    document.body.appendChild(script);
  });

const buildUrl = (
  url: string,
  name?: string,
  email?: string,
  phone?: string,
) => {
  try {
    const u = new URL(url);
    if (name) u.searchParams.set("name", name);
    if (email) u.searchParams.set("email", email);
    if (phone) u.searchParams.set("a1", phone);
    return u.toString();
  } catch {
    return url;
  }
};

export default function CalendlyEmbed({
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureCss();

    let cancelled = false;
    const target = ref.current;
    if (!target) return;

    const fullUrl = buildUrl(url, name, email, phone);

    setError(null);

    ensureScript()
      .then(() => {
        if (cancelled) return;
        if (!ref.current || !window.Calendly?.initInlineWidget) {
          setError("Calendly widget unavailable");
          return;
        }
        ref.current.innerHTML = "";
        window.Calendly.initInlineWidget({
          url: fullUrl,
          parentElement: ref.current,
          prefill: {
            name,
            email,
            customAnswers: phone ? { a1: phone } : undefined,
          },
        });
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[CalendlyEmbed] init failed:", err);
        setError(err?.message ?? "Could not load Calendly");
      });

    return () => {
      cancelled = true;
    };
  }, [url, name, email, phone]);

  useEffect(() => {
    if (!onScheduled) return;
    const handler = (e: MessageEvent) => {
      if (
        typeof e.data === "object" &&
        e.data?.event === "calendly.event_scheduled"
      ) {
        onScheduled();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onScheduled]);

  if (error) {
    const fallbackUrl = buildUrl(url, name, email, phone);
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Couldn&apos;t embed the booking widget.</p>
        <p className="mt-1 text-xs">{error}</p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Open Calendly in a new tab →
        </a>
      </div>
    );
  }

  // No `calendly-inline-widget` class on purpose — Calendly's auto-scan
  // would try to read `data-url` from any element with that class and crash
  // on `null.split(...)`, preventing `window.Calendly` from ever being set.
  // Programmatic `initInlineWidget` only needs `parentElement`.
  return (
    <div ref={ref} style={{ minWidth: 320, height: 700 }} />
  );
}
