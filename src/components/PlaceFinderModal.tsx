"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  X,
} from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps";

type SelectedPlace = {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function PlaceFinderModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  // Called when the user clicks "Use this Place ID". Receives the full
  // selected place so callers can persist whatever fields they need.
  onPick: (place: SelectedPlace) => void;
}) {
  // Only mount the modal contents when open. Closing unmounts, so internal
  // state (selected place, load error) resets for free on reopen — no
  // reset-effect needed.
  if (!open) return null;
  return <ModalContents onClose={onClose} onPick={onPick} />;
}

function ModalContents({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (place: SelectedPlace) => void;
}) {
  const mapRef = useRef<HTMLElement | null>(null);
  const autocompleteRef = useRef<HTMLElement | null>(null);
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const missingKey = !API_KEY;
  const [loadError, setLoadError] = useState<string | null>(null);
  const error = missingKey
    ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"
    : loadError;
  const [loading, setLoading] = useState(!missingKey);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (missingKey) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        await loadGoogleMaps(API_KEY);
        if (cancelled) return;

        const importLibrary = window.google?.maps?.importLibrary as (
          name: string,
        ) => Promise<unknown>;
        // The places library has to be imported so the
        // <gmp-place-autocomplete> custom element registers and starts
        // emitting `gmp-select` events.
        const [mapsLib, markerLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("places"),
        ]);

        const mapEl = mapRef.current as unknown as { innerMap: unknown } | null;
        const placeAutocomplete =
          autocompleteRef.current as unknown as HTMLElement | null;
        if (!mapEl || !placeAutocomplete) return;

        const map = mapEl.innerMap as {
          setOptions: (o: Record<string, unknown>) => void;
          addListener: (e: string, cb: () => void) => void;
          getBounds: () => unknown;
          fitBounds: (b: unknown) => void;
          setCenter: (loc: unknown) => void;
          setZoom: (z: number) => void;
        };
        map.setOptions({
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
        });
        map.addListener("bounds_changed", () => {
          const b = map.getBounds();
          if (b) {
            (
              placeAutocomplete as unknown as { locationBias: unknown }
            ).locationBias = b;
          }
        });

        const { InfoWindow } = mapsLib as {
          InfoWindow: new () => {
            close: () => void;
            open: (m: unknown, mk: unknown) => void;
          };
        };
        const { AdvancedMarkerElement } = markerLib as {
          AdvancedMarkerElement: new (opts: Record<string, unknown>) => {
            position: unknown;
            addEventListener: (e: string, cb: () => void) => void;
          };
        };

        const infoWindow = new InfoWindow();
        const marker = new AdvancedMarkerElement({
          map,
          gmpClickable: true,
        });
        marker.addEventListener("gmp-click", () => {
          infoWindow.open(map, marker);
        });

        const onSelect = async (event: Event) => {
          const detail = (event as CustomEvent).detail as {
            placePrediction: {
              toPlace: () => {
                fetchFields: (opts: { fields: string[] }) => Promise<void>;
                location?: { lat: () => number; lng: () => number };
                viewport?: unknown;
                displayName?: string;
                formattedAddress?: string;
                id?: string;
              };
            };
          };
          if (!detail?.placePrediction) return;

          const p = detail.placePrediction.toPlace();
          await p.fetchFields({
            fields: ["displayName", "formattedAddress", "location", "id"],
          });
          if (!p.location) return;

          if (p.viewport) map.fitBounds(p.viewport);
          else {
            map.setCenter(p.location);
            map.setZoom(17);
          }

          marker.position = p.location;
          setPlace({
            id: p.id ?? "",
            displayName: p.displayName ?? "",
            formattedAddress: p.formattedAddress ?? "",
            lat: p.location.lat(),
            lng: p.location.lng(),
          });
        };

        placeAutocomplete.addEventListener("gmp-select", onSelect);
        cleanup = () =>
          placeAutocomplete.removeEventListener("gmp-select", onSelect);

        setLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        setLoadError(
          e instanceof Error ? e.message : "Failed to load Google Maps",
        );
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [missingKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <MapPin size={14} />
              </span>
              Find a Place ID
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Search a business by name, then click <strong>Use this Place ID</strong> to
              fill the field.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {error && (
            <p className="inline-flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                {error}
                {error.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") && (
                  <span className="ml-1 text-xs text-red-600">
                    Add it to your env (Maps JavaScript API + Places API
                    enabled in the Cloud console) and reload.
                  </span>
                )}
              </span>
            </p>
          )}

          {place && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                <Check size={12} />
                Selected
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {place.displayName || "—"}
              </p>
              {place.formattedAddress && (
                <p className="text-xs text-slate-600">
                  {place.formattedAddress}
                </p>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
                Place ID
              </p>
              <div className="mt-1 flex items-stretch gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-800">
                  {place.id}
                </code>
                <CopyButton value={place.id} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-1">
            {loading && !error && (
              <p className="px-3 py-2 text-xs text-slate-500">Loading map…</p>
            )}
            <div
              className="relative w-full overflow-hidden rounded-lg"
              style={{ height: "50vh", minHeight: 360 }}
            >
              <gmp-map
                ref={mapRef as unknown as React.Ref<HTMLElement>}
                center="20.5937,78.9629"
                zoom={5}
                map-id="DEMO_MAP_ID"
                style={{ width: "100%", height: "100%" }}
              >
                <gmp-place-autocomplete
                  ref={autocompleteRef as unknown as React.Ref<HTMLElement>}
                  slot="control-inline-start-block-start"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    width: "min(440px, calc(100% - 20px))",
                    height: 36,
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    colorScheme: "light",
                  }}
                />
              </gmp-map>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          {place ? (
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline"
            >
              <ExternalLink size={12} />
              Open in Maps
            </a>
          ) : (
            <span className="text-xs text-slate-400">
              Pick a result from the autocomplete to continue.
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!place}
              onClick={() => {
                if (place) {
                  onPick(place);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={12} />
              Use this Place ID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
